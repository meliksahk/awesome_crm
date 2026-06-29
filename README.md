<div align="center">

# Açık Kaynak CRM

**Kurumsal düzeyde, ölçeklenebilir, yüksek güvenlikli, çoklu rol (RBAC) ve çoklu kiracı (multi-tenant) destekli, API-First açık kaynak CRM.**

NestJS + PostgreSQL/Prisma backend · Next.js 14 (App Router) + Atomic Design frontend · Docker

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Backend](https://img.shields.io/badge/Backend-NestJS-e0234e.svg)](https://nestjs.com)
[![Frontend](https://img.shields.io/badge/Frontend-Next.js%2014-black.svg)](https://nextjs.org)
[![DB](https://img.shields.io/badge/DB-PostgreSQL%20%2B%20Prisma-336791.svg)](https://www.prisma.io)
[![Tests](https://img.shields.io/badge/tests-106%20unit%20%2F%20108%20e2e-brightgreen.svg)](#test--kalite)

</div>

---

## İçindekiler

- [Neler sunar?](#neler-sunar)
- [Öne çıkan özellikler](#öne-çıkan-özellikler)
- [Teknoloji yığını](#teknoloji-yığını)
- [Mimari & güvenlik ilkeleri](#mimari--güvenlik-ilkeleri)
- [Roller & izinler](#roller--izinler)
- [Modüller & API yüzeyi](#modüller--api-yüzeyi)
- [Yol haritası](#yol-haritası)
- [Hızlı başlangıç](#hızlı-başlangıç)
- [Demo & test girişleri](#demo--test-girişleri)
- [Ortam değişkenleri](#ortam-değişkenleri)
- [Test & kalite](#test--kalite)
- [Proje yapısı](#proje-yapısı)
- [Bilinçli sınırlar (dürüstlük notu)](#bilinçli-sınırlar-dürüstlük-notu)
- [Dokümantasyon · Katkı · Lisans](#dokümantasyon)

---

## Neler sunar?

Açık Kaynak CRM; satış hattı (pipeline) yönetiminden faturalandırmaya, yapay zekâ
destekli satış yardımcılarından çoklu kiracı izolasyonuna kadar uçtan uca bir CRM
deneyimi sunar. Tüm iş mantığı **API-First** tasarlanır; panel (Next.js) bu API'yi
tüketir. Her endpoint **varsayılan korumalıdır** (secure-by-default), yetkiler
**rol + izin** ikili katmanıyla her istekte güncel kaynaktan doğrulanır.

---

## Öne çıkan özellikler

### 🔐 Kimlik & Yetkilendirme
- **JWT** (Access + Refresh) — refresh **rotasyonu** + reuse/çalıntı tespiti (token tekrar kullanımında tüm oturumlar iptal).
- **bcrypt** parola hash'i; zamanlama saldırısı ve kullanıcı enumeration koruması.
- **RBAC** iki katman: rol (`@Roles`) + izin (`@Permissions`), AND mantığı. Yetkiler her istekte DB'den okunur (token'a körü körüne güvenilmez).
- IDOR/sahiplik kontrolü; `@Public()` ile bilinçli açılan uçlar dışında her şey korumalı.

### 📊 Satış (CRM çekirdeği)
- **Pipeline + Kanban**: kesirli rank ile çakışmasız sürükle-bırak taşıma; atomik aşama/sıra değişimi (tek transaction) + aktivite kaydı.
- **Deal (Anlaşma)**: CRUD, sahiplik tabanlı erişim, durum (OPEN/WON/LOST), aktiviteler (NOTE/CALL/EMAIL/STAGE_CHANGE).
- **Lead (nitelenmemiş)** → `convert` akışıyla Contact + Company + Deal'e dönüşüm.
- **Company / Contact**: ilişkili kişi/şirket kayıtları.
- **Meeting**: toplantı/takvim kaydı (tarih doğrulamalı).

### 💰 Finans
- **Fatura** yaşam döngüsü: DRAFT → SENT → PARTIALLY_PAID → PAID / CANCELLED; immutability (yalnız DRAFT düzenlenir).
- Tüm tutarlar **Decimal** (float yasak); sunucu tarafı hesap; aşırı ödeme engeli.
- **Sıralı, atlamasız fatura numarası** (yıl bazlı atomik sayaç, `ON CONFLICT`).
- **Finansal maskeleme**: `invoice.read_financial` izni yoksa tutar/kalem/ödeme API'de kesilir (SALES görür ama rakamları göremez).

### 🧾 Ürün & Teklif (CPQ)
- **Ürün kataloğu** (SKU benzersiz, Decimal fiyat, soft delete).
- **Teklif** yaşam döngüsü (DRAFT/SENT/ACCEPTED/REJECTED/EXPIRED/CONVERTED); productId çözümleme, sunucu Decimal toplam.
- `send` → sıralı teklif numarası (QUO-yıl-seq); **`convert` → DRAFT Fatura** (tek transaction, idempotent — çift dönüşüm engelli).

### 🤖 Yapay Zekâ (Claude)
- **Anthropic SDK** + `claude-opus-4-8` + structured outputs ile: **deal puanlama** (0–100 + sonraki adımlar), **takip e-postası taslağı**, **metin özetleme**.
- `ANTHROPIC_API_KEY` **opsiyoneldir** — yoksa uçlar zarifçe **503** döner, uygulama yine açılır (`/ai/status` ile panel özelliği gösterir/gizler).

### ⚙️ Otomasyon & Özelleştirme
- **No-code otomasyon motoru**: olay tetikleyici (record.created / stage.changed / field.updated) → eylem (aktivite/e-posta/log). Mevcut event bus üzerine kurulu.
- **Low-code özel alanlar**: `CustomFieldDef` + kayıtlarda `customFields` (Deal); TEXT/NUMBER/BOOLEAN/DATE/SELECT doğrulama + zorunluluk.

### 📈 Raporlama
- Pipeline değeri, dönem/durum özetleri, aşama olasılığıyla **ağırlıklı forecast**, finansal fatura özeti (yetkiye bağlı).

### 🔗 Entegrasyon & Veri
- **Giden webhook**: HMAC-SHA256 imza, replay penceresi, idempotency, SSRF koruması.
- **E-posta**: `simulated` ve gerçek `smtp` (nodemailer) sürücüleri + şablon motoru + EmailLog.
- **CSV içe/dışa aktarma**: contacts/companies/deals dışa aktarım; contacts/companies içe aktarım (**dedup** + satır hataları).
- **Yinelenen tespiti + birleştirme** (merge): kaynak kaydın deal/kişileri hedefe taşınır, kaynak silinir (tek transaction).

### 🛡️ Platform olgunluk
- **Denetim kaydı (AuditLog)**: tüm değişiklik istekleri (aktör/eylem/varlık/durum) append-only kaydedilir; admin listeler.
- **Global arama**: deal/contact/company üzerinde, sonuçlar **izne göre süzülür**.
- **KVKK/GDPR**: kişi verisini dışa aktar (taşınabilirlik) + sil (unutulma; deal bağı kopar).
- **PWA**: manifest + ikon + tema.

### 🏢 Çoklu kiracı (Multi-tenancy)
- **JWT tenant claim** ile izolasyon — tenant'a bağlı kullanıcı `x-tenant-id` başlığıyla **kendi tenant'ını ezemez**.
- Merkezi Prisma `$use` katmanı tenant kapsamlı modellere `tenantId`'yi **otomatik enjekte/filtre** eder (unutma = sızıntı riski ortadan kalkar).
- `tenantId = null` → **platform-admin** (cross-tenant); Tenant CRUD + kullanıcı→tenant atama.

### 🐳 DevOps
- Çok aşamalı **Docker** imajı (root olmayan kullanıcı), `docker-compose` (DB iç ağda, host'a açılmaz), sağlık ucu, fail-fast env doğrulama (Joi).

---

## Teknoloji yığını

| Katman | Teknoloji |
|--------|-----------|
| **Backend** | NestJS · PostgreSQL · Prisma (migration tabanlı) · JWT · bcrypt · class-validator/transformer · Swagger · `@anthropic-ai/sdk` · nodemailer |
| **Frontend** | Next.js 14 (App Router) · TypeScript · Tailwind · Atomic Design · Axios + React Query |
| **DevOps** | Docker · docker-compose · Joi env doğrulama |

---

## Mimari & güvenlik ilkeleri

- **API-First** + katmanlı mimari: **`Controller → Service → Repository`**. Controller'da iş mantığı yok; **`prisma.*` çağrısı yalnızca Repository'de**.
- **Secure by default**: global `JwtAuthGuard`; herkese açık uçlar bilinçli `@Public()`.
- **Zaman**: karar/iş mantığı sunucu UTC; gösterim ayrı tz katmanında.
- **Finans**: `Decimal` (float yasak); fatura immutability; idempotency.
- **Webhook**: HMAC imzası doğrulanmadan hiçbir iş/DB yazımı yok.
- **Sırlar**: tüm gizli değerler `.env`'den; koda gömülmez; env şeması Joi ile başlangıçta doğrulanır (fail-fast). Parola/token/PII loglanmaz.
- **Hata yanıtı**: global `AllExceptionsFilter`; production'da stack/SQL sızdırılmaz. Standart zarf: `{ success, data, meta }` / `{ success, error }`.
- **Frontend Atomic Design**: atomlar → moleküller → organizmalar → şablonlar → sayfalar; bir bileşen yalnız alt seviyeden import eder.

---

## Roller & izinler

İzinler `kaynak.eylem` biçimindedir (`deal.read`, `invoice.read_financial`, `ai.use`, `platform.tenant.manage`, …) ve merkezî olarak tanımlanır. Varsayılan rol → izin eşlemesi (en az ayrıcalık):

| Rol | Özet yetki |
|-----|-----------|
| **ADMIN** | Tüm izinler (platform yönetimi dâhil) |
| **MANAGER** | Deal/Lead/Company/Contact/Meeting tam · entegrasyon · otomasyon · özel alan · ürün/teklif · AI · veri içe/dışa/merge |
| **SALES** | Deal/Lead (kendi) · şirket/kişi · ürün(okuma)/teklif · AI · CSV dışa aktar · **fatura tutarlarını göremez** (maskeli) |
| **FINANCE** | Fatura tam + **finansal okuma** · ürün(okuma)/teklif(okuma+convert) |
| **VIEWER** | Salt-okuma (hassas finansal okuma hariç) |

> Panel menüsü ve butonlar izne göre gösterilir/gizlenir; backend her istekte yetkiyi tekrar doğrular.

---

## Modüller & API yüzeyi

Tüm uçlar `/api/v1` ön ekiyle servis edilir (Swagger: `/api/docs`).

| Alan | Başlıca uçlar |
|------|---------------|
| **Auth** | `POST /auth/login` · `/auth/register` · `/auth/refresh` · `/auth/logout` |
| **Kullanıcı/Rol** | `/users` · `/roles` (CRUD + rol atama) |
| **Deal/Kanban** | `/deals` · `/deals/board` · `PATCH /deals/:id/move` · `/deals/:id/activities` |
| **Lead** | `/leads` · `POST /leads/:id/convert` |
| **Company / Contact** | `/companies` · `/contacts` |
| **Meeting** | `/meetings` |
| **Fatura** | `/invoices` · `POST /:id/issue` · `/:id/payments` · `/:id/cancel` |
| **Ürün / Teklif** | `/products` · `/quotes` · `POST /quotes/:id/{send,accept,reject,convert}` |
| **AI** | `GET /ai/status` · `POST /ai/deals/:id/score` · `/ai/draft-email` · `/ai/summarize` |
| **Otomasyon** | `/automation-rules` |
| **Özel alan** | `/custom-fields` |
| **Rapor** | `/reports/{pipeline,deals/summary,forecast,invoices/summary}` |
| **Entegrasyon** | `/integrations/webhooks` (+ gelen webhook HMAC doğrulama) |
| **Veri** | `GET /data/export/:entity` · `POST /data/import/:entity` · `/data/duplicates/:entity` · `/data/merge/:entity` |
| **Platform** | `/audit-logs` · `GET /search?q=` · `/gdpr/contacts/:id/{export,erase}` · `/tenants` (+ `:id/assign-user`) |
| **Sağlık** | `GET /health` |

---

## Yol haritası

### v1 — Temel CRM (6 faz) ✅
| Faz | Kapsam |
|-----|--------|
| 1 | Temel mimari + Prisma şeması + JWT kimlik doğrulama |
| 2 | RBAC guard'ları + kullanıcı yönetimi |
| 3 | Lead/Deal + Kanban |
| 4 | Finans & fatura (izole yetkiler, maskeleme) |
| 5 | Dış entegrasyonlar (webhook, SMTP) |
| 6 | Dockerization + multi-tenancy temeli |

### v2 — Kurumsal yetkinlikler (V2.1–V2.10) ✅
| Alt-faz | Kapsam |
|---------|--------|
| V2.1 | Company/Contact + Lead→Deal refactor + nitelenmemiş Lead/convert |
| V2.2 | Gerçek SMTP + şablon motoru + Meeting |
| V2.3 | No-code otomasyon motoru |
| V2.4 | Raporlama & forecast |
| V2.5 | Low-code özel alanlar |
| V2.6 | **AI katmanı (Claude, key opsiyonel)** |
| V2.7 | **Ürün + Teklif/CPQ → Fatura** |
| V2.8 | **CSV içe/dışa aktarma + dedup/merge** |
| V2.9 | **AuditLog + arama + GDPR + PWA** |
| V2.10 | **Multi-tenancy tamamlama (JWT tenant claim + platform-admin)** |

Detaylı v2 planı: [`docs/11-v2-fazlar.md`](./docs/11-v2-fazlar.md) · pazar karşılaştırması: [`docs/10`](./docs/10-pazar-karsilastirma-ve-v2.md).

---

## Hızlı başlangıç

**Gereksinimler:** Node.js ≥ 20 · Docker + Docker Compose (lokalde alternatif: PostgreSQL ≥ 14).

### Seçenek A — Tüm yığını Docker ile (prod-benzeri)

```bash
cp .env.example .env            # KÖK .env: POSTGRES_* + JWT secret'ları doldur
docker compose up -d --build    # db (iç ağ) + backend (:3000)
# Backend başlangıçta migration'ları uygular. Sağlık: /api/v1/health
```

### Seçenek B — Backend lokalde, yalnız DB Docker'da

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db

cd backend
cp .env.example .env            # DATABASE_URL → localhost:5432
npm install                     # Windows: bkz. not (script-shell)
npx prisma migrate dev          # şemayı oluştur
npm run seed                    # roller + izinler + admin + pipeline
npm run start:dev               # http://localhost:3000  (Swagger: /api/docs)
```

> **Windows notu:** PowerShell'de bazı postinstall script'leri `||` nedeniyle hata verir.
> `npm install --script-shell "C:\\Windows\\System32\\cmd.exe"` ile kurun.

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev        # http://localhost:3001  (/api → backend'e proxy)
```

> Frontend `/api/*` isteklerini **sunucu tarafında** backend'e proxy'ler (tek origin →
> CORS/cookie sorunsuz, tünel dostu). Backend adresi `BACKEND_URL` env'i ile değişir
> (varsayılan `http://localhost:3000`).

---

## Demo & test girişleri

```bash
cd backend && npm run seed && npm run seed:demo   # rol bazlı kullanıcılar + örnek veri
```

| Rol | E-posta | Parola |
|-----|---------|--------|
| ADMIN | `admin@crm.dev` | `ChangeMe!2026` |
| MANAGER | `manager@crm.dev` | `Demo!2026` |
| SALES | `sales@crm.dev` | `Demo!2026` |
| FINANCE | `finance@crm.dev` | `Demo!2026` |
| VIEWER | `viewer@crm.dev` | `Demo!2026` |

> Roller farklı yetkiler görür: SALES faturada tutarları göremez (maskeli), FINANCE görür;
> VIEWER salt-okuma; menü öğeleri izne göre gösterilir.

---

## Ortam değişkenleri

Başlıca backend değişkenleri (`backend/.env.example`):

| Değişken | Açıklama |
|----------|----------|
| `DATABASE_URL` | PostgreSQL bağlantısı (zorunlu) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | JWT sırları (farklı olmalı, zorunlu) |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | Token ömürleri (vars. `15m` / `7d`) |
| `BCRYPT_COST` | bcrypt maliyeti (10–15, vars. 12) |
| `CORS_ORIGINS` · `COOKIE_SECURE` | CORS/çerez ayarları |
| `THROTTLE_TTL` · `THROTTLE_LIMIT` | Hız sınırlama |
| `MAIL_DRIVER` | `simulated` \| `smtp` · `SMTP_*` (smtp ise) |
| `WEBHOOK_ALLOW_PRIVATE` · `INBOUND_WEBHOOK_SECRET` | Webhook ayarları |
| `ANTHROPIC_API_KEY` | **Opsiyonel** — yoksa AI uçları 503 |
| `AI_MODEL` | AI modeli (vars. `claude-opus-4-8`) |

---

## Test & kalite

```bash
cd backend
npm run lint        # ESLint (0 uyarı)
npm run build       # production derleme
npm run test        # 106 birim testi
npm run test:e2e    # 108 E2E testi (gerçek PostgreSQL)
npm run test:cov    # kapsam
```

**Durum:** 106 birim + 108 E2E yeşil · lint/build temiz. **Negatif testler birinci sınıf**:
IDOR, privilege escalation, enumeration, cross-tenant erişim engeli, finansal maskeleme,
fatura immutability, çift dönüşüm engeli, dedup, AI key-yok 503 senaryoları.

---

## Proje yapısı

```
.
├── backend/                # NestJS API
│   ├── prisma/             # şema + migration'lar + seed/seed-demo
│   └── src/
│       ├── common/         # guard, interceptor, filter, decorator, tenant ALS
│       ├── config/         # Joi env doğrulama
│       └── modules/        # auth, users, roles, deals, leads, companies,
│                           # contacts, meetings, invoices, products, quotes,
│                           # ai, automation, custom-fields, reports,
│                           # integrations, data, audit, search, gdpr, tenants
├── frontend/               # Next.js 14 (App Router, Atomic Design)
│   ├── app/(dashboard)/    # sayfalar: deals, leads, companies, contacts,
│   │                       # invoices, products, quotes, reports, ai, data,
│   │                       # search, audit, tenants, users
│   └── src/components/     # atoms → molecules → organisms → templates
└── docs/                   # mimari, fazlar (01–11), güvenlik, test stratejisi
```

---

## Bilinçli sınırlar (dürüstlük notu)

Şeffaflık için tamamlanmamış/kademeli bırakılan noktalar:

- **In-app bildirim** (Notification) yapılmadı — event bus + kullanıcı hedefleme tasarımı gerektiriyor; ayrı bir alt-faza alındı.
- **Multi-tenancy:** Postgres satır düzeyi güvenlik (RLS) yerine **uygulama katmanı** Prisma `$use` tenant filtresi tercih edildi. **Subdomain** çözümleme backend'de yok (tenant JWT claim ile). **Per-tenant numara benzersizliği** yok (fatura/teklif numarası global unique).
- **Webhook retry** için `processDuePending()` hazır ancak worker/cron zamanlanmadı.

---

## Dokümantasyon

- [Mimari Genel Bakış](./docs/00-mimari-genel-bakis.md)
- [Faz dokümanları 01–06](./docs) · [v2 fazları](./docs/11-v2-fazlar.md)
- [Pazar karşılaştırması & v2 yol haritası](./docs/10-pazar-karsilastirma-ve-v2.md)
- [Güvenlik Standartları](./docs/90-guvenlik-standartlari.md) · [Test Stratejisi](./docs/91-test-stratejisi.md)
- [Dürüstlük & Çalışma Tarzı](./docs/02-durustluk-ve-calisma-tarzi.md)

## Katkı

Katkılar memnuniyetle karşılanır — bkz. [CONTRIBUTING.md](./CONTRIBUTING.md). Her PR:
lint + birim + entegrasyon + güvenlik (negatif) testleri yeşil olmalı; mimari ihlal yok
(Prisma yalnız repository; Atomic katmanlar); panele dokunan işlerde ilgili docs güncel.

## Lisans

[MIT](./LICENSE)
