# Açık Kaynak CRM — Teknik Dokümantasyon

Kurumsal düzeyde, ölçeklenebilir, yüksek güvenlikli, çoklu rol destekli (RBAC) ve **API-First** mimariye sahip açık kaynak CRM sisteminin tam teknik dokümantasyonu.

> Bu `docs/` klasörü, projenin 6 fazlı yol haritasının her birini **tasarım, veritabanı şeması, API sözleşmesi, güvenlik kontrolleri ve test senaryoları** düzeyinde detaylandırır. Kod yazımı, her faz onaylandığında ilgili faz dokümanı temel alınarak yapılır.

---

## İçindekiler

| # | Doküman | Kapsam |
|---|---------|--------|
| 00 | [Mimari Genel Bakış](./00-mimari-genel-bakis.md) | Teknoloji yığını, katmanlı mimari, Atomic Design, SOLID/DRY, klasör yapısı |
| 01 | [Faz 1 — Temel Mimari & Kimlik Doğrulama](./01-faz1-temel-mimari-auth.md) | Prisma şeması (User/Role/Permission), JWT (Access+Refresh), bcrypt, DTO |
| 02 | [Faz 2 — RBAC & Kullanıcı Yönetimi](./02-faz2-rbac-kullanici-yonetimi.md) | Roller, izinler, Guard'lar, dekoratörler, kullanıcı CRUD |
| 03 | [Faz 3 — Satış (Lead) & Kanban](./03-faz3-lead-kanban.md) | Lead modülü, Pipeline/Stage, Kanban DB kurgusu, sürükle-bırak API |
| 04 | [Faz 4 — Finans & Fatura](./04-faz4-finans-fatura.md) | İzole yetkili fatura modülü, ödeme durumu, finansal bütünlük |
| 05 | [Faz 5 — Dış Entegrasyonlar](./05-faz5-entegrasyonlar.md) | Webhook (HMAC imzalı), SMTP simülasyonu, servis katmanı |
| 06 | [Faz 6 — Dockerization & Multi-tenancy](./06-faz6-docker-multitenancy.md) | docker-compose, ortam değişkenleri, multi-tenant hazırlığı |
| — | [Güvenlik Standartları](./90-guvenlik-standartlari.md) | OWASP Top 10, sertleştirme, sırların yönetimi |
| — | [Test Stratejisi](./91-test-stratejisi.md) | Birim/Entegrasyon/E2E, kapsam hedefleri, test piramidi |

---

## Faz Yol Haritası (Özet)

```
Faz 1  Temel Mimari + Prisma Şeması (User, Role, Permission) + JWT Kimlik Doğrulama
Faz 2  RBAC Guard'ları + Kullanıcı Yönetimi
Faz 3  Satış (Lead) Modülü + Kanban DB Kurgusu + API'ler
Faz 4  Finans ve Fatura Modülü (İzole edilmiş yetkiler)
Faz 5  Dış Entegrasyonlar (Webhook, SMTP simülasyonu) + Servis Katmanı
Faz 6  Dockerization (docker-compose) + Multi-tenancy hazırlığı
```

## Çalışma Yöntemi

Her faz bağımsız olarak onaylanır ve kodlanır. Bir faz tamamlanmadan bir sonrakine geçilmez. Tüm kod katmanlı mimariye (Controller → Service → Repository) ve frontend'de Atomic Design'a sıkı sıkıya bağlı kalır. Her faz için kabul kriterleri ve test senaryoları ilgili dokümanda tanımlıdır.

## Teknoloji Yığını (Kısa)

- **Backend:** NestJS (Node.js), PostgreSQL, Prisma ORM, JWT, bcrypt, class-validator
- **Frontend:** Next.js (App Router) + TypeScript, Tailwind CSS, Atomic Design, Axios/React Query
- **DevOps:** Docker, docker-compose
- **Prensipler:** DRY, SOLID, API-First, katmanlı mimari, global exception filter

Detaylar için [Mimari Genel Bakış](./00-mimari-genel-bakis.md) dokümanına bakın.
