import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useBodyParser('json', { limit: '2mb' });
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 3001;

  configureApp(app);

  await app.listen(port);
}

void bootstrap();
