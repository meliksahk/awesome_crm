# Faz 6 — Dockerization (docker-compose) & Multi-tenancy Hazırlığı

**Amaç:** Tüm yığını (backend, frontend, PostgreSQL, yardımcı servisler) **docker-compose** ile tek komutla ayağa kaldırmak; üretime hazır imajlar üretmek; ve sistemi **çok kiracılı (multi-tenant)** çalışmaya hazırlamak.

**Önkoşul:** Faz 1–5 tamamlanmış.

---

## 1. Kapsam

- Backend ve frontend için çok aşamalı (multi-stage) Dockerfile'lar.
- `docker-compose.yml` (prod-benzeri) ve `docker-compose.dev.yml` (geliştirme, hot-reload).
- PostgreSQL, MailHog, (opsiyonel) Redis servisleri.
- Migration & seed otomasyonu, healthcheck, ortam değişkeni yönetimi.
- **Multi-tenancy** modeli ve hazırlığı (tenant izolasyonu, veri filtreleme).

---

## 2. Dockerfile (Backend — çok aşamalı)

```dockerfile
# backend/Dockerfile
# ---- deps ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# ---- runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Güvenlik: root olmayan kullanıcı
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
USER app
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
```

> **Güvenlik notu:** Konteyner `app` adlı yetkisiz kullanıcı ile çalışır (root değil). Sadece runtime artefaktları kopyalanır; kaynak/geliştirme bağımlılıkları imaja girmez (küçük yüzey alanı).

### Frontend (özet)

```dockerfile
# frontend/Dockerfile  (Next.js standalone output)
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build            # next.config: output: 'standalone'
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER app
EXPOSE 3001
CMD ["node", "server.js"]
```

---

## 3. docker-compose (prod-benzeri)

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    # Port dışarı AÇILMAZ (yalnız iç ağ) — güvenlik
    networks: [internal]

  backend:
    build: ./backend
    env_file: .env
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/v1/health"]
      interval: 15s
      timeout: 5s
      retries: 5
    networks: [internal, web]

  frontend:
    build: ./frontend
    env_file: .env
    depends_on: [backend]
    networks: [web]

  mailhog:
    image: mailhog/mailhog
    networks: [internal]
    # geliştirme amaçlı SMTP yakalayıcı

volumes:
  db_data:

networks:
  internal:        # db + backend (dış erişim yok)
  web:             # frontend + ters proxy
```

### Geliştirme override (özet)

```yaml
# docker-compose.dev.yml  (docker compose -f docker-compose.yml -f docker-compose.dev.yml up)
services:
  backend:
    command: npm run start:dev          # hot reload
    volumes: [ ./backend:/app ]
    ports: [ "3000:3000" ]
  db:
    ports: [ "5432:5432" ]              # yalnız dev'de dışarı açık
```

---

## 4. Ortam Değişkenleri & Sırlar

- Tüm sırlar `.env` (repoda **değil**; `.env.example` paylaşılır).
- Production'da Docker secrets / harici secret manager önerilir; `.env` dosyaları imaja **gömülmez**.
- `@nestjs/config` + Joi şeması başlangıçta doğrular → eksik değişkende konteyner ayağa kalkmaz (fail-fast).
- `.dockerignore`: `node_modules`, `.env`, `.git`, test çıktıları dışlanır.

---

## 5. Multi-tenancy Hazırlığı

### 5.1 Strateji Seçimi

| Strateji | İzolasyon | Maliyet | Bu projedeki tercih |
|----------|-----------|---------|---------------------|
| Ayrı veritabanı / tenant | En yüksek | Yüksek | İleride büyük müşteriler için opsiyon |
| Ayrı schema / tenant | Yüksek | Orta | Orta vade opsiyon |
| **Paylaşımlı schema + `tenantId`** | Mantıksal | Düşük | **Başlangıç tercihi** ✅ |

### 5.2 Paylaşımlı Schema Modeli

```prisma
model Tenant {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
}
```

Tüm tenant'a özel tablolara `tenantId String` + `@@index([tenantId])` eklenir (User, Lead, Invoice, vb.). Benzersizlik kısıtları tenant kapsamına alınır: örn. `@@unique([tenantId, email])`.

### 5.3 Tenant Bağlamı & Otomatik Filtre (kritik)

```
İstek → tenant çözümleme (subdomain / JWT 'tenantId' claim / header)
      → AsyncLocalStorage ile request-scoped TenantContext
      → Prisma middleware/extension TÜM sorgulara otomatik 'where tenantId=...' enjekte eder
      → ve create'lerde tenantId zorunlu set edilir
```

> **En kritik güvenlik kuralı:** Tenant filtresi **uygulama katmanında zorunlu ve merkezi** olmalı. Geliştiricinin her sorguda elle `tenantId` yazmasına bırakılmaz → unutma = veri sızıntısı. Prisma extension/middleware ile otomatikleştirilir. Mümkünse PostgreSQL **Row-Level Security (RLS)** ikinci savunma hattı olarak eklenir.

### 5.4 JWT & RBAC ile İlişki

- Access token'a `tenantId` claim'i eklenir (Faz 1 yapısına ek alan).
- Kullanıcı yalnız kendi tenant'ı kapsamında kimlik doğrular; cross-tenant token reddedilir.
- RBAC (Faz 2) tenant içinde çalışır; "platform admin" ayrı bir üst roldür (tüm tenant'lar).

---

## 6. Güvenlik Kontrolleri (Faz 6)

| Kontrol | Uygulama |
|--------|----------|
| Yetkisiz konteyner | Root olmayan kullanıcı; read-only fs mümkünse |
| Ağ izolasyonu | DB dış ağa kapalı; yalnız iç network |
| İmaj yüzeyi | Çok aşamalı build; alpine; dev bağımlılıkları yok |
| Sır yönetimi | `.env` imaja gömülmez; secret manager |
| Healthcheck | db/backend sağlık kontrolü; bağımlılık sırası |
| Tenant izolasyonu | Otomatik `tenantId` filtresi + (ops.) RLS |
| Cross-tenant engeli | Token tenant claim; her sorgu kapsamlı |
| Migration güvenliği | `migrate deploy` (otomatik, geri alınamaz değil); yedek politikası |
| Görüntü tarama | CI'da imaj zafiyet taraması (trivy vb.) önerilir |

---

## 7. Kabul Kriterleri

- [ ] `docker compose up` ile tüm yığın ayağa kalkar; backend healthcheck `healthy`.
- [ ] Migration'lar konteyner başlangıcında otomatik uygulanır.
- [ ] DB portu prod compose'da dışarı kapalıdır.
- [ ] Konteynerler root olmayan kullanıcıyla çalışır.
- [ ] Bir tenant'ın kullanıcısı başka tenant verisini **hiçbir** endpoint'ten göremez.
- [ ] `tenantId` enjeksiyonu unutulmuş bir sorgu bile filtresiz veri döndürmez (merkezi middleware).

---

## 8. Test Senaryoları (Faz 6)

### 8.1 Altyapı / Smoke Testleri

| ID | Test | Beklenen |
|----|------|----------|
| I-6.1 | `docker compose config` | geçerli, hata yok |
| I-6.2 | `compose up` sonrası `/health` | `200 healthy` |
| I-6.3 | DB portu prod'da host'tan erişilemez | bağlantı reddedilir |
| I-6.4 | Konteyner kullanıcısı | `whoami` ≠ root |
| I-6.5 | Migration otomatik uygulanır | tablolar mevcut |

### 8.2 Multi-tenancy Testleri

| ID | Test | Beklenen |
|----|------|----------|
| T-6.1 | Tenant A kullanıcısı `GET /leads` | yalnız A'nın lead'leri |
| T-6.2 | Tenant A token ile B'nin lead `:id` | `404/403` |
| T-6.3 | Create sırasında tenantId otomatik atanır | kaydın tenantId = A |
| T-6.4 | `@@unique([tenantId, email])` | aynı e-posta farklı tenant'ta olabilir |
| T-6.5 | Cross-tenant JWT (manipüle tenantId) | reddedilir |
| T-6.6 | Middleware bypass denemesi (ham repo çağrısı) | filtre yine uygulanır / test ile yakalanır |

### 8.3 Güvenlik Testleri

| ID | Test | Beklenen |
|----|------|----------|
| S-6.1 | İmajda `.env`/sır var mı | yok |
| S-6.2 | İmaj zafiyet taraması | kritik açık yok |
| S-6.3 | RLS aktifse doğrudan SQL ile cross-tenant | engellenir |

---

## 9. Proje Tamamlanma Kontrol Listesi

- [ ] 6 fazın tümü kabul kriterlerini geçti.
- [ ] Tüm modüllerde Controller→Service→Repository ihlali yok (Prisma yalnız repo'da).
- [ ] Frontend Atomic Design katman ihlali yok.
- [ ] Birim + entegrasyon + E2E testleri yeşil; kapsam hedefi karşılandı (bkz. [Test Stratejisi](./91-test-stratejisi.md)).
- [ ] Güvenlik kontrol listesi tamamlandı (bkz. [Güvenlik Standartları](./90-guvenlik-standartlari.md)).
- [ ] `docker compose up` ile temiz kurulum çalışıyor.

> Önceki faz: [Faz 5 — Dış Entegrasyonlar](./05-faz5-entegrasyonlar.md) · Genel: [README](./README.md)
