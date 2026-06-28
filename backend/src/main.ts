// src/main.ts
// Uygulama girişi: global pipe, güvenlik başlıkları (helmet), CORS allowlist,
// cookie-parser, Swagger. HTTP sertleştirme docs/90 §6.
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: false,
  });
  const config = app.get(ConfigService);

  app.use(helmet());
  app.use(cookieParser());

  // Body limiti — payload DoS engeli.
  app.useBodyParser('json', { limit: '1mb' });

  // CORS allowlist (credentials ile '*' yasak).
  const origins = config
    .get<string>('CORS_ORIGINS', 'http://localhost:3001')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins, credentials: true });

  // URI versiyonlama: /api/v1/...
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true, // tanımsız alan → 400 (mass-assignment engeli)
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger yalnız production dışı.
  if (config.get<string>('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Açık Kaynak CRM API')
      .setDescription('API-First CRM — Faz 1 (Kimlik Doğrulama)')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
}

void bootstrap();
