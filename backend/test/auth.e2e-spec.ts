// backend/test/auth.e2e-spec.ts
// Faz 1 E2E — HTTP üzerinden uçtan uca kimlik akışı.
// GEREKSİNİM: Çalışan bir test PostgreSQL'i ve uygulanmış migration.
//   DATABASE_URL=... (test şeması) + JWT_ACCESS_SECRET/JWT_REFRESH_SECRET set olmalı.
// Çalıştırma: npm run test:e2e
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const email = `e2e_${Date.now()}@crm.dev`;
  const password = 'S3cure!Passw0rd';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({ where: { email } });
      await prisma.$disconnect();
    }
    await app?.close();
  });

  const base = '/api/v1/auth';

  it('E-1.2 zayıf parola → 400 VALIDATION_ERROR', () =>
    request(app.getHttpServer())
      .post(`${base}/register`)
      .send({ email, password: 'weak', firstName: 'E', lastName: 'E' })
      .expect(400)
      .expect((res) => {
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      }));

  it('E-1.3 fazladan alan (isAdmin) → 400 (forbidNonWhitelisted)', () =>
    request(app.getHttpServer())
      .post(`${base}/register`)
      .send({ email, password, firstName: 'E', lastName: 'E', isAdmin: true })
      .expect(400));

  it('E-1.1 geçerli kayıt → 201, parola yanıtta yok', () =>
    request(app.getHttpServer())
      .post(`${base}/register`)
      .send({ email, password, firstName: 'E2E', lastName: 'User' })
      .expect(201)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.email).toBe(email);
        expect(JSON.stringify(res.body)).not.toContain(password);
      }));

  it('E-1.5 yanlış parola → 401 generic mesaj', () =>
    request(app.getHttpServer())
      .post(`${base}/login`)
      .send({ email, password: 'WrongPass!99' })
      .expect(401)
      .expect((res) => {
        expect(res.body.error.message).toBe('Geçersiz kimlik bilgileri');
      }));

  it('E-1.4 doğru kimlik → 200, accessToken + httpOnly Set-Cookie', async () => {
    const res = await request(app.getHttpServer())
      .post(`${base}/login`)
      .send({ email, password })
      .expect(200);
    expect(res.body.data.accessToken).toBeDefined();
    const setCookie = res.headers['set-cookie']?.[0] ?? '';
    expect(setCookie).toContain('refresh_token=');
    expect(setCookie.toLowerCase()).toContain('httponly');
    // Ham refresh token gövdede dönmemeli
    expect(res.body.data.refreshToken).toBeUndefined();
  });

  it("E-1.6 token'sız /me → 401", () =>
    request(app.getHttpServer()).get(`${base}/me`).expect(401));

  it('E-1.7 geçerli token ile /me → 200', async () => {
    const login = await request(app.getHttpServer())
      .post(`${base}/login`)
      .send({ email, password })
      .expect(200);
    const token = login.body.data.accessToken;
    await request(app.getHttpServer())
      .get(`${base}/me`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => expect(res.body.data.email).toBe(email));
  });

  it('E-1.8/E-1.9 refresh rotasyonu: eski cookie ikinci kez reddedilir', async () => {
    const login = await request(app.getHttpServer())
      .post(`${base}/login`)
      .send({ email, password })
      .expect(200);
    const oldCookie = login.headers['set-cookie'];

    // İlk refresh → yeni cookie
    const first = await request(app.getHttpServer())
      .post(`${base}/refresh`)
      .set('Cookie', oldCookie)
      .expect(200);
    expect(first.body.data.accessToken).toBeDefined();

    // Aynı (eski) cookie ile tekrar → reuse detection → 401
    await request(app.getHttpServer())
      .post(`${base}/refresh`)
      .set('Cookie', oldCookie)
      .expect(401);
  });
});
