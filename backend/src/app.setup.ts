import { INestApplication, ValidationPipe } from '@nestjs/common';
import { OpenAPIObject } from '@nestjs/swagger';
import { setupOpenApi } from './openapi';

export function configureApp(app: INestApplication): OpenAPIObject {
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableCors({
    origin: true,
    credentials: true,
  });

  return setupOpenApi(app);
}
