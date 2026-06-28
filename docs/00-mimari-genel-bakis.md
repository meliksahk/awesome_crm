# 00 — Mimari Genel Bakış

Bu doküman, tüm fazların üzerine inşa edileceği mimari temeli, değişmez kuralları ve klasör yapısını tanımlar. **Tüm fazlar bu kurallara uymak zorundadır.**

---

## 1. Mimari İlkeler (Değişmez Kurallar)

1. **API-First:** Backend, sözleşmesi (OpenAPI/Swagger) önce tanımlanan, durumsuz (stateless) bir REST API'dir. Frontend bu sözleşmeyi tüketir.
2. **Katmanlı Mimari (Backend):** `Controller → Service → Repository`. Bu zincir asla atlanamaz.
   - **Controller:** Yalnızca HTTP katmanı. İstek/yanıt, DTO doğrulama, yetki dekoratörleri. İş mantığı **yok**.
   - **Service:** Tüm iş mantığı burada. Birden fazla repository'yi orkestra eder, transaction yönetir.
   - **Repository:** Veri erişim katmanı. **Prisma sorguları YALNIZCA burada** yapılır.
   - ⛔ **Yasak:** Controller içinde `prisma.*` çağrısı kesinlikle yapılamaz.
3. **Atomic Design (Frontend):** `Atoms → Molecules → Organisms → Templates → Pages`.
4. **DRY:** Tekrarlayan mantık ortak modüllere (`common/`, `shared/`) çıkarılır.
5. **SOLID:** Özellikle Bağımlılık Tersine Çevirme (DI) ve Tek Sorumluluk ilkeleri.
6. **Güvenlik varsayılan olarak açık (secure by default):** Her endpoint varsayılan olarak korumalıdır; herkese açık endpoint'ler açıkça `@Public()` ile işaretlenir.
7. **Her dosya yolu, kod bloğunun en üstünde yorum satırı olarak belirtilir.** Örnek: `// src/modules/auth/auth.service.ts`

---

## 2. Teknoloji Yığını

### 2.1 Backend (API-First)

| Bileşen | Seçim | Not |
|---------|-------|-----|
| Framework | **NestJS** (Node.js) | Modüler, DI tabanlı |
| Mimari | Katmanlı (Controller → Service → Repository) | Prisma yalnızca Repository'de |
| Veritabanı | **PostgreSQL** | İlişkisel, transaction destekli |
| ORM | **Prisma** | Tip güvenli, migration tabanlı |
| Kimlik Doğrulama | **JWT** (Access + Refresh token) | Stateless erişim, dönen refresh |
| Şifreleme | **bcrypt** | Parola hash'leme (cost ≥ 12) |
| Doğrulama | **class-validator + class-transformer** | DTO seviyesinde |
| Hata Yönetimi | **Global Exception Filter** | Tek noktadan tutarlı hata yanıtı |
| Dokümantasyon | **Swagger (OpenAPI)** | `@nestjs/swagger` |
| Konfigürasyon | **@nestjs/config** | `.env`, şema doğrulamalı |

### 2.2 Frontend

| Bileşen | Seçim |
|---------|-------|
| Framework | **Next.js (App Router)** + **TypeScript** |
| Stil | **Tailwind CSS** |
| Mimari | **Atomic Design** |
| Veri Çekme | **Axios** (Interceptor ile token yönetimi) + **React Query / SWR** |
| Form/Doğrulama | React Hook Form + Zod |

### 2.3 DevOps

- **Docker** + **docker-compose** (Faz 6)
- Çoklu ortam: `development`, `test`, `production`

---

## 3. Backend Klasör Yapısı

```
backend/
├── src/
│   ├── main.ts                      # Uygulama girişi (global pipe, filter, swagger)
│   ├── app.module.ts                # Kök modül
│   ├── common/                      # DRY — paylaşılan katman
│   │   ├── decorators/              # @CurrentUser, @Roles, @Permissions, @Public
│   │   ├── guards/                  # JwtAuthGuard, RolesGuard, PermissionsGuard
│   │   ├── filters/                 # AllExceptionsFilter (global)
│   │   ├── interceptors/            # LoggingInterceptor, TransformInterceptor
│   │   ├── pipes/                   # ValidationPipe konfigürasyonu
│   │   ├── dto/                     # Ortak DTO'lar (PaginationDto vb.)
│   │   └── constants/              # Enum'lar, sabitler (PermissionEnum vb.)
│   ├── config/                      # ConfigModule, env şeması (Joi)
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   ├── prisma.service.ts        # PrismaClient yaşam döngüsü
│   │   └── schema.prisma            # Veritabanı şeması
│   └── modules/
│       ├── auth/                    # Faz 1
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   ├── auth.repository.ts
│       │   ├── strategies/          # jwt.strategy.ts, jwt-refresh.strategy.ts
│       │   └── dto/                 # login.dto.ts, register.dto.ts, refresh.dto.ts
│       ├── users/                   # Faz 2
│       ├── roles/                   # Faz 2
│       ├── leads/                   # Faz 3
│       ├── invoices/                # Faz 4
│       └── integrations/            # Faz 5
├── test/                            # E2E testleri
├── prisma/migrations/               # Migration geçmişi
└── package.json
```

### Modül İskeleti (her iş modülü için standart)

```
modules/<modul>/
├── <modul>.module.ts        # Providers + exports (DI bağlama)
├── <modul>.controller.ts    # HTTP + DTO + yetki dekoratörleri
├── <modul>.service.ts       # İş mantığı + transaction
├── <modul>.repository.ts    # Prisma erişimi (TEK yer)
├── dto/                     # create/update/query DTO'ları
└── entities/                # Yanıt tipleri / serileştirme
```

---

## 4. Frontend Klasör Yapısı (Atomic Design)

```
frontend/
├── app/                            # Next.js App Router (Pages katmanı)
│   ├── (auth)/login/page.tsx
│   ├── (dashboard)/leads/page.tsx
│   └── layout.tsx
├── src/
│   ├── components/
│   │   ├── atoms/                  # Button, Input, Label, Badge, Spinner
│   │   ├── molecules/              # FormField, SearchBar, Card, Dropdown
│   │   ├── organisms/             # LoginForm, KanbanBoard, DataTable, Sidebar
│   │   └── templates/             # DashboardTemplate, AuthTemplate
│   ├── lib/
│   │   ├── api/                    # axios instance + interceptors
│   │   └── hooks/                  # useAuth, useLeads (React Query)
│   ├── store/                      # global state (auth)
│   └── types/                      # paylaşılan TS tipleri
└── package.json
```

**Atomic Design kuralı:** Bir bileşen yalnızca kendi seviyesinden alt seviyeleri import edebilir (Organism → Molecule → Atom). Üst seviye import yasaktır (Atom, Organism import edemez).

---

## 5. Standart API Yanıt Sözleşmesi

Tüm başarılı yanıtlar `TransformInterceptor` ile tutarlı zarfa sarılır:

```jsonc
// Başarılı
{
  "success": true,
  "data": { /* ... */ },
  "meta": { "page": 1, "limit": 20, "total": 134 }  // listeler için
}
```

Tüm hatalar `AllExceptionsFilter` ile tutarlı biçimde döner:

```jsonc
// Hata
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "İnsan tarafından okunabilir mesaj",
    "details": [ { "field": "email", "constraint": "isEmail" } ],
    "timestamp": "2026-06-28T10:00:00.000Z",
    "path": "/api/v1/auth/login"
  }
}
```

> Hata yanıtları **asla** stack trace, SQL hatası veya iç sistem detayı sızdırmaz (production'da). Detaylar yalnızca sunucu loglarına yazılır.

---

## 6. Sürümleme & Konfigürasyon

- API yolu: `/api/v1/...` (URI versiyonlama).
- Tüm gizli değerler `.env` üzerinden gelir; kod içine **asla** sabit yazılmaz.
- `.env` şeması başlangıçta **Joi** ile doğrulanır; eksik/yanlış değişkende uygulama açılmaz (fail-fast).

Zorunlu ortam değişkenleri (özet):

```env
DATABASE_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
BCRYPT_COST=12
NODE_ENV=development
PORT=3000
```

---

## 7. Global Çapraz Kesişen Bileşenler (Cross-cutting)

| Bileşen | Sorumluluk |
|---------|------------|
| `AllExceptionsFilter` | Tüm hataları yakalar, tutarlı zarfa sarar, loglar |
| `ValidationPipe` (global) | `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true` |
| `LoggingInterceptor` | İstek/yanıt süresi, correlation id |
| `TransformInterceptor` | Başarılı yanıtları standart zarfa sarar |
| `JwtAuthGuard` (global) | Varsayılan kimlik doğrulama; `@Public()` ile bypass |
| `Helmet` + `CORS` + `Rate Limit` | HTTP sertleştirme (main.ts) |

Bu doküman, sonraki tüm faz dokümanlarının referans temelidir.
