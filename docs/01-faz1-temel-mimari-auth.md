# Faz 1 — Temel Mimari, Prisma Şeması & JWT Kimlik Doğrulama

**Amaç:** Projenin iskeletini kurmak; `User`, `Role`, `Permission` veri modelini tanımlamak; bcrypt ile parola güvenliği ve JWT (Access + Refresh) tabanlı stateless kimlik doğrulamayı uygulamak.

**Önkoşul:** [00 — Mimari Genel Bakış](./00-mimari-genel-bakis.md) kurallarına tam uyum.

---

## 1. Kapsam

- NestJS proje iskeleti, global pipe/filter/interceptor kurulumu.
- Prisma şeması: `User`, `Role`, `Permission` + ilişki tabloları.
- `AuthModule`: kayıt (register), giriş (login), token yenileme (refresh), çıkış (logout).
- Parola hash'leme (bcrypt), refresh token rotasyonu ve hash'li saklama.
- Global `JwtAuthGuard` + `@Public()` dekoratörü.

**Kapsam dışı (sonraki fazlar):** RBAC zorlaması (Faz 2), iş modülleri (Faz 3+).

---

## 2. Veri Modeli (Prisma Şeması)

```prisma
// backend/src/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String                                   // bcrypt; düz parola ASLA saklanmaz
  firstName    String
  lastName     String
  isActive     Boolean  @default(true)
  roles        UserRole[]
  refreshTokens RefreshToken[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([email])
}

model Role {
  id          String           @id @default(uuid())
  name        String           @unique                  // örn: ADMIN, SALES, FINANCE
  description String?
  users       UserRole[]
  permissions RolePermission[]
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
}

model Permission {
  id          String           @id @default(uuid())
  // Eylem.Kaynak biçimi — örn: "lead.create", "invoice.read"
  action      String           @unique
  description String?
  roles       RolePermission[]
  createdAt   DateTime         @default(now())
}

// --- İlişki (join) tabloları: many-to-many açık modellenir ---

model UserRole {
  userId String
  roleId String
  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role   Role @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@id([userId, roleId])
}

model RolePermission {
  roleId       String
  permissionId String
  role       Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
}

model RefreshToken {
  id        String   @id @default(uuid())
  userId    String
  tokenHash String                                       // Refresh token'ın SHA-256 hash'i; ham token saklanmaz
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

**Tasarım gerekçeleri:**
- `UserRole` / `RolePermission` ara tablolar açıkça modellenir → ileride ek alanlar (atayan, tarih) eklenebilir; çoklu rol desteklenir.
- `Permission.action` `"kaynak.eylem"` biçiminde tutulur → Faz 2'de izin kontrolü string eşleştirmesiyle yapılır.
- `RefreshToken.tokenHash`: ham refresh token DB'de tutulmaz; çalınmaya karşı dayanıklılık. Rotasyon + iptal (revoke) için kayıt tutulur.

---

## 3. Kimlik Doğrulama Akışı

### 3.1 Token Stratejisi

| Token | TTL | Saklama (istemci) | İçerik (payload) |
|-------|-----|-------------------|------------------|
| **Access** | 15 dk | Bellek / `Authorization: Bearer` | `sub` (userId), `email`, `roles[]` |
| **Refresh** | 7 gün | **httpOnly + Secure + SameSite=Strict** cookie | `sub`, `tokenId` (jti) |

> Refresh token httpOnly cookie'de tutulur → XSS ile çalınamaz. Access token kısa ömürlüdür → çalınsa bile pencere dardır.

### 3.2 Akış Şeması

```
register  →  parola bcrypt ile hash'lenir → User kaydedilir
login     →  parola doğrulanır → access + refresh üretilir
             refresh'in hash'i RefreshToken tablosuna yazılır
             refresh httpOnly cookie olarak set edilir
refresh   →  cookie'deki refresh doğrulanır + DB'de hash eşleşir + revoke değil
             ESKİ refresh revoke edilir, YENİ access+refresh üretilir (ROTASYON)
logout    →  ilgili RefreshToken.revokedAt set edilir, cookie temizlenir
```

**Refresh token rotasyonu (reuse detection):** Her yenilemede eski token iptal edilir. İptal edilmiş bir token tekrar kullanılırsa → o kullanıcının tüm refresh token'ları iptal edilir (token hırsızlığı işareti).

---

## 4. API Sözleşmesi

Taban yol: `/api/v1/auth`

| Method | Yol | Açıklama | Erişim |
|--------|-----|----------|--------|
| POST | `/register` | Yeni kullanıcı kaydı | `@Public()` (veya yalnızca admin — projeye göre) |
| POST | `/login` | Giriş, token üretimi | `@Public()` |
| POST | `/refresh` | Access token yenileme | Refresh cookie ile |
| POST | `/logout` | Oturum kapatma, token iptali | Kimlikli |
| GET | `/me` | Mevcut kullanıcı profili | Kimlikli |

### Örnek istek/yanıt

```jsonc
// POST /api/v1/auth/login  (istek)
{ "email": "admin@crm.dev", "password": "S3cure!Pass" }

// yanıt (refresh httpOnly cookie ile set edilir)
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "user": { "id": "...", "email": "admin@crm.dev", "roles": ["ADMIN"] }
  }
}
```

---

## 5. DTO'lar (class-validator)

```ts
// backend/src/modules/auth/dto/register.dto.ts
import { IsEmail, IsString, MinLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  // En az 10 karakter, büyük/küçük harf, rakam ve özel karakter
  @IsString()
  @MinLength(10)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/, {
    message: 'Parola yeterince güçlü değil.',
  })
  password: string;

  @IsString() firstName: string;
  @IsString() lastName: string;
}
```

```ts
// backend/src/modules/auth/dto/login.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail() email: string;
  @IsString() @MinLength(1) password: string;
}
```

> Global `ValidationPipe` ayarı: `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`. Tanımsız alanlar reddedilir → mass-assignment koruması.

---

## 6. Katman Sorumlulukları (Faz 1)

```ts
// backend/src/modules/auth/auth.controller.ts
// SADECE HTTP: DTO alır, servisi çağırır, cookie set/clear eder. İş mantığı YOK.

// backend/src/modules/auth/auth.service.ts
// İŞ MANTIĞI: parola doğrulama, token üretimi, rotasyon, transaction.

// backend/src/modules/auth/auth.repository.ts
// VERİ ERİŞİMİ: prisma.user.*, prisma.refreshToken.* — TEK Prisma noktası.
```

İskelet (servis, kritik kısımlar):

```ts
// backend/src/modules/auth/auth.service.ts
async validateAndLogin(dto: LoginDto) {
  const user = await this.authRepo.findByEmail(dto.email);
  // Zamanlama saldırısına karşı: kullanıcı yoksa bile bcrypt.compare benzeri sabit gecikme uygula
  const ok = user && (await bcrypt.compare(dto.password, user.passwordHash));
  if (!ok || !user.isActive) {
    throw new UnauthorizedException('Geçersiz kimlik bilgileri'); // kullanıcı var/yok ayrımı SIZDIRILMAZ
  }
  return this.issueTokens(user);
}
```

---

## 7. Güvenlik Kontrolleri (Faz 1)

| Kontrol | Uygulama |
|--------|----------|
| Parola saklama | bcrypt, cost ≥ 12; düz parola asla loglanmaz/saklanmaz |
| Parola politikası | Min 10 karakter + karmaşıklık (DTO regex) |
| Token sırları | `JWT_ACCESS_SECRET` ≠ `JWT_REFRESH_SECRET`; güçlü, env'de |
| Refresh saklama | httpOnly + Secure + SameSite=Strict cookie; DB'de yalnız hash |
| Token rotasyonu | Her refresh'te eski iptal; reuse → tüm oturumları iptal |
| Bilgi sızıntısı | "Geçersiz kimlik bilgileri" tek mesaj (enumeration engeli) |
| Brute-force | Login endpoint'ine rate limit (örn. 5/dk/IP) — `@nestjs/throttler` |
| Zamanlama saldırısı | Kullanıcı yoksa bile sabit süreli karşılaştırma |
| Taşıma güvenliği | Production'da yalnız HTTPS; HSTS (helmet) |
| Hata yanıtı | Global filter; stack trace sızdırılmaz |

---

## 8. Kabul Kriterleri

- [ ] `prisma migrate` ile şema oluşur; seed ile `ADMIN` rolü ve bir admin kullanıcı eklenir.
- [ ] Geçerli kimlikle `login` access + httpOnly refresh döner.
- [ ] Süresi dolan access ile korumalı endpoint `401` döner.
- [ ] `refresh` yeni access üretir ve eski refresh'i iptal eder.
- [ ] İptal edilmiş refresh tekrar kullanılırsa tüm oturumlar iptal olur.
- [ ] Düz parola hiçbir yerde (DB/log/yanıt) görünmez.

---

## 9. Test Senaryoları (Faz 1)

### 9.1 Birim Testleri (`*.spec.ts`)

| ID | Test | Beklenen |
|----|------|----------|
| U-1.1 | `AuthService.register` parolayı bcrypt ile hash'ler | `passwordHash !== plain`, `bcrypt.compare` true |
| U-1.2 | `register` mevcut e-posta ile çağrılır | `ConflictException` |
| U-1.3 | `validateAndLogin` yanlış parola | `UnauthorizedException`, mesaj generic |
| U-1.4 | `validateAndLogin` pasif kullanıcı (`isActive=false`) | `UnauthorizedException` |
| U-1.5 | `issueTokens` access TTL ≈ 15dk, refresh hash DB'ye yazılır | doğru claim'ler, hash kaydı |
| U-1.6 | `refresh` iptal edilmiş token | `UnauthorizedException` + tüm oturum iptali |

### 9.2 Entegrasyon / E2E Testleri (`test/auth.e2e-spec.ts`)

| ID | Senaryo | Beklenen |
|----|---------|----------|
| E-1.1 | `POST /auth/register` geçerli body | `201`, kullanıcı oluşur, parola yanıtta yok |
| E-1.2 | `POST /auth/register` zayıf parola | `400`, `VALIDATION_ERROR` |
| E-1.3 | `POST /auth/register` fazladan alan (`isAdmin:true`) | `400` (forbidNonWhitelisted) |
| E-1.4 | `POST /auth/login` doğru kimlik | `200`, accessToken + Set-Cookie (httpOnly) |
| E-1.5 | `POST /auth/login` yanlış parola | `401`, generic mesaj |
| E-1.6 | `GET /auth/me` token'sız | `401` |
| E-1.7 | `GET /auth/me` geçerli token | `200`, doğru kullanıcı |
| E-1.8 | `POST /auth/refresh` geçerli cookie | `200`, yeni accessToken + yeni cookie |
| E-1.9 | `POST /auth/refresh` eski (rotate edilmiş) cookie | `401` + sonraki tüm refresh'ler reddedilir |
| E-1.10 | `POST /auth/logout` | `200`, cookie temizlenir, token revoke |
| E-1.11 | Login rate limit aşımı | `429 Too Many Requests` |

### 9.3 Güvenlik Testleri

| ID | Test | Beklenen |
|----|------|----------|
| S-1.1 | Kullanıcı enumeration (var olan vs olmayan e-posta yanıt süresi/mesajı) | Ayırt edilemez |
| S-1.2 | JWT imza kurcalama (payload değişimi) | `401` |
| S-1.3 | `alg: none` JWT saldırısı | `401` |
| S-1.4 | SQL injection denemesi (`email: "' OR 1=1 --"`) | Prisma parametrik → etkisiz, `400/401` |
| S-1.5 | Refresh cookie `httpOnly` ve `Secure` bayrakları | Set-Cookie başlığında mevcut |

> **Sonraki faz:** [Faz 2 — RBAC & Kullanıcı Yönetimi](./02-faz2-rbac-kullanici-yonetimi.md)
