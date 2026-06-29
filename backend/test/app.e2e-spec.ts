import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

type AuthBody = {
  user: {
    id: string;
    email: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
};

const password = 'secure-pass-123';

describe('Backend API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  async function register(email: string): Promise<AuthBody> {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password, displayName: 'E2E User' })
      .expect(201);

    return response.body as AuthBody;
  }

  it('publishes the fixed OpenAPI contract', async () => {
    const response = await request(app.getHttpServer()).get('/api/docs-json').expect(200);

    expect(response.body.info.version).toBe('1.0.0');
    expect(response.body.paths).toEqual(
      expect.objectContaining({
        '/api/auth/register': expect.any(Object),
        '/api/auth/login': expect.any(Object),
        '/api/auth/refresh': expect.any(Object),
        '/api/auth/logout': expect.any(Object),
        '/api/records': expect.any(Object),
        '/api/records/{id}': expect.any(Object),
        '/api/people-observations': expect.any(Object),
        '/api/people-observations/{id}': expect.any(Object),
      }),
    );
    expect(response.body.components.securitySchemes['access-token']).toEqual(
      expect.objectContaining({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }),
    );
  });

  it('registers, logs in, and rejects invalid credentials or duplicates', async () => {
    const auth = await register('CaseSensitive@Example.com');

    expect(auth.user.email).toBe('casesensitive@example.com');
    expect(auth.tokens.accessToken).toEqual(expect.any(String));
    expect(auth.tokens.refreshToken).toEqual(expect.any(String));
    expect(auth.user).not.toHaveProperty('passwordHash');

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'casesensitive@example.com', password })
      .expect(409);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: auth.user.email, password: 'wrong-password' })
      .expect(401);

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: auth.user.email, password })
      .expect(200);

    expect(login.body.user.id).toBe(auth.user.id);
  });

  it('rotates refresh tokens once and revokes the active token on logout', async () => {
    const auth = await register('refresh@example.com');

    const refreshed = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: auth.tokens.refreshToken })
      .expect(200);

    expect(refreshed.body.tokens.refreshToken).not.toBe(auth.tokens.refreshToken);

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: auth.tokens.refreshToken })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .send({ refreshToken: refreshed.body.tokens.refreshToken })
      .expect(200, { message: 'Logged out.' });

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: refreshed.body.tokens.refreshToken })
      .expect(401);
  });

  it('requires a valid access token for records', async () => {
    const auth = await register('guard@example.com');

    await request(app.getHttpServer()).get('/api/records').expect(401);

    await request(app.getHttpServer())
      .get('/api/records')
      .set('Authorization', `Bearer ${auth.tokens.refreshToken}`)
      .expect(401);

    await request(app.getHttpServer())
      .get('/api/records')
      .set('Authorization', `Bearer ${auth.tokens.accessToken}`)
      .expect(200);
  });

  it('validates, isolates, updates, filters, and soft-deletes records', async () => {
    const owner = await register('owner@example.com');
    const otherUser = await register('other@example.com');
    const ownerHeader = { Authorization: `Bearer ${owner.tokens.accessToken}` };
    const otherHeader = { Authorization: `Bearer ${otherUser.tokens.accessToken}` };
    const clientId = 'e2e-client-record-1';
    const validRecord = {
      clientId,
      title: 'Should I accept this task?',
      category: 'WORK',
      emotions: ['ANXIETY'],
      emotionIntensity: 6,
      decisionDifficulty: 7,
      timeCost: 'WITHIN_30_MINUTES',
      thoughts: 'It may take too much time.',
      finalDecision: 'Ask for a smaller scope.',
      worthIt: 'UNCLEAR',
    };

    await request(app.getHttpServer())
      .post('/api/records')
      .set(ownerHeader)
      .send({ ...validRecord, emotionIntensity: 11, unexpected: true })
      .expect(400);

    const created = await request(app.getHttpServer())
      .post('/api/records')
      .set(ownerHeader)
      .send(validRecord)
      .expect(201);

    expect(created.body).toEqual(
      expect.objectContaining({
        userId: owner.user.id,
        clientId,
        title: validRecord.title,
        syncStatus: 'ACTIVE',
        deletedAt: null,
      }),
    );

    await request(app.getHttpServer())
      .post('/api/records')
      .set(ownerHeader)
      .send(validRecord)
      .expect(409);

    await request(app.getHttpServer())
      .get(`/api/records/${created.body.id}`)
      .set(otherHeader)
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/api/records/${created.body.id}`)
      .set(ownerHeader)
      .send({ title: 'Updated decision', emotionIntensity: 8 })
      .expect(200)
      .expect(({ body }) => {
        expect(body.title).toBe('Updated decision');
        expect(body.emotionIntensity).toBe(8);
      });

    const filtered = await request(app.getHttpServer())
      .get('/api/records?category=WORK&search=updated&limit=10&offset=0')
      .set(ownerHeader)
      .expect(200);

    expect(filtered.body).toEqual(
      expect.objectContaining({ total: 1, limit: 10, offset: 0 }),
    );

    await request(app.getHttpServer())
      .delete(`/api/records/${created.body.id}`)
      .set(ownerHeader)
      .expect(200)
      .expect(({ body }) => {
        expect(body.syncStatus).toBe('DELETED');
        expect(body.deletedAt).toEqual(expect.any(String));
      });

    await request(app.getHttpServer())
      .get(`/api/records/${created.body.id}`)
      .set(ownerHeader)
      .expect(404);

    const active = await request(app.getHttpServer())
      .get('/api/records')
      .set(ownerHeader)
      .expect(200);
    expect(active.body.total).toBe(0);

    const withDeleted = await request(app.getHttpServer())
      .get('/api/records?includeDeleted=true')
      .set(ownerHeader)
      .expect(200);
    expect(withDeleted.body.total).toBe(1);
    expect(withDeleted.body.records[0].syncStatus).toBe('DELETED');

    const otherRecords = await request(app.getHttpServer())
      .get('/api/records?includeDeleted=true')
      .set(otherHeader)
      .expect(200);
    expect(otherRecords.body.total).toBe(0);
  });

  it('validates, isolates, updates, filters, and soft-deletes people observations', async () => {
    const owner = await register('people-owner@example.com');
    const otherUser = await register('people-other@example.com');
    const ownerHeader = { Authorization: `Bearer ${owner.tokens.accessToken}` };
    const otherHeader = { Authorization: `Bearer ${otherUser.tokens.accessToken}` };
    const clientId = 'e2e-client-people-observation-1';
    const validObservation = {
      clientId,
      alias: 'A colleague',
      emotions: ['ENVY', 'DEFIANT'],
      triggerScene: 'Saw a public achievement.',
      contemptPoints: 'Sometimes talks too loudly.',
      inferiorityOrEnvyPoints: 'Gets opportunities quickly.',
      otherStrengths: 'Clear self-promotion and fast execution.',
      myStrengths: 'Careful analysis and steady follow-through.',
      personDefinition: 'A mirror for the ability I want to practice.',
      learningAction: 'Make one small public update this week.',
    };

    await request(app.getHttpServer())
      .post('/api/people-observations')
      .set(ownerHeader)
      .send({ ...validObservation, emotions: ['UNKNOWN'], unexpected: true })
      .expect(400);

    const created = await request(app.getHttpServer())
      .post('/api/people-observations')
      .set(ownerHeader)
      .send(validObservation)
      .expect(201);

    expect(created.body).toEqual(
      expect.objectContaining({
        userId: owner.user.id,
        clientId,
        alias: validObservation.alias,
        syncStatus: 'ACTIVE',
        deletedAt: null,
      }),
    );

    await request(app.getHttpServer())
      .post('/api/people-observations')
      .set(ownerHeader)
      .send(validObservation)
      .expect(409);

    await request(app.getHttpServer())
      .get(`/api/people-observations/${created.body.id}`)
      .set(otherHeader)
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/api/people-observations/${created.body.id}`)
      .set(ownerHeader)
      .send({ alias: 'Updated mirror', emotions: ['ADMIRATION'] })
      .expect(200)
      .expect(({ body }) => {
        expect(body.alias).toBe('Updated mirror');
        expect(body.emotions).toEqual(['ADMIRATION']);
      });

    const filtered = await request(app.getHttpServer())
      .get('/api/people-observations?emotion=ADMIRATION&search=mirror&limit=10&offset=0')
      .set(ownerHeader)
      .expect(200);

    expect(filtered.body).toEqual(
      expect.objectContaining({ total: 1, limit: 10, offset: 0 }),
    );

    await request(app.getHttpServer())
      .delete(`/api/people-observations/${created.body.id}`)
      .set(ownerHeader)
      .expect(200)
      .expect(({ body }) => {
        expect(body.syncStatus).toBe('DELETED');
        expect(body.deletedAt).toEqual(expect.any(String));
      });

    await request(app.getHttpServer())
      .get(`/api/people-observations/${created.body.id}`)
      .set(ownerHeader)
      .expect(404);

    const active = await request(app.getHttpServer())
      .get('/api/people-observations')
      .set(ownerHeader)
      .expect(200);
    expect(active.body.total).toBe(0);

    const withDeleted = await request(app.getHttpServer())
      .get('/api/people-observations?includeDeleted=true')
      .set(ownerHeader)
      .expect(200);
    expect(withDeleted.body.total).toBe(1);
    expect(withDeleted.body.peopleObservations[0].syncStatus).toBe('DELETED');

    const otherObservations = await request(app.getHttpServer())
      .get('/api/people-observations?includeDeleted=true')
      .set(otherHeader)
      .expect(200);
    expect(otherObservations.body.total).toBe(0);
  });
});
