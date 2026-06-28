# CLAUDE.md — Açık Kaynak CRM (Ana Talimat)

> Bu dosya projenin kökündeki ana talimattır. Detaylar `docs/` altındadır; karar
> verirken oraya başvur. Bu dosya ile `docs/` çelişirse **`docs/` esastır** — uyumsuzluk
> görürsen önce bildir.

## Proje
Kurumsal düzeyde, ölçeklenebilir, yüksek güvenlikli, çoklu rol destekli (RBAC) ve
**API-First** bir **açık kaynak CRM**. 6 fazlı yol haritası `docs/` altında tasarım,
DB şeması, API sözleşmesi, güvenlik ve test düzeyinde detaylandırılmıştır.

### Teknoloji Yığını (gerçek — `docs/00`)
- **Backend:** **NestJS** (Node.js), katmanlı mimari `Controller → Service → Repository`,
  PostgreSQL + **Prisma** (migration tabanlı), **JWT** (Access+Refresh), **bcrypt**,
  class-validator/class-transformer, global ValidationPipe + Exception Filter, Swagger.
- **Frontend:** **Next.js (App Router)** + TypeScript, Tailwind, **Atomic Design**,
  Axios (interceptor) + React Query, React Hook Form + Zod.
- **DevOps:** Docker + docker-compose (Faz 6). Çoklu ortam: development/test/production.

> NOT: Bu projede **RLS, Redis/BullMQ, Nginx, Cloudflare Tunnel, AES-256-GCM panel
> sırları, SECURITY DEFINER, token'lı medya YOKTUR.** (RLS yalnızca Faz 6 multi-tenancy
> tartışmasında bir seçenek olarak geçer.) Bu unsurları varsayma.

## Kesin kurallar (İstisna Yok)
1. **Zaman:** Karar/iş mantığı sunucu UTC (DB `now()`); gösterim ayrı tz katmanında.
2. **Secure by default:** Her endpoint varsayılan korumalı (global `JwtAuthGuard`);
   herkese açık olanlar bilinçli `@Public()` ile işaretlenir. (`docs/90`)
3. **Katmanlı mimari (İstisna Yok):** `Controller → Service → Repository`. Controller'da
   iş mantığı yok; **`prisma.*` çağrısı YALNIZCA Repository'de.** (`docs/00 §2`)
4. **Webhook (Faz 5):** HMAC imzası **doğrulanmadan** hiçbir iş/DB yazımı yapılmaz.
5. **Finans (Faz 4):** Tutarlar `Decimal` (float yasak); fatura immutability; sunucu
   tarafı hesap; ödeme/iade bütünlüğü ve idempotency.
6. **RBAC (Faz 2):** İki katman — rol (`@Roles`) + izin (`@Permissions`), AND mantığı;
   yetkiler her istekte güncel kaynaktan doğrulanır. IDOR/sahiplik kontrolü zorunlu.
7. **Sırlar:** Tüm gizli değerler `.env`'den; koda asla gömülmez. Env şeması Joi ile
   başlangıçta doğrulanır (fail-fast). Parola/token/secret/PII loglanmaz, hash/şifreli saklanır.
8. **Hata yanıtı:** Global `AllExceptionsFilter`; production'da stack trace / SQL / iç
   detay sızdırılmaz. Standart yanıt zarfı (`success/data/meta`, `success/error`). (`docs/00 §5`)

## Çalışma tarzı (tamamı `docs/02-durustluk-ve-calisma-tarzi.md`)
- **Model dürüstlüğü:** emin olmadığını / test etmediğini / bıraktığın pragmatik sınırı
  **açıkça bayrakla**; sessizce gizleme. Test etmeden "tamam" deme; testler kırmızıysa
  çıktısıyla söyle.
- **Faz faz ilerle:** her mantıksal parçayı bitir → `typecheck + lint + build + test` →
  **commit + push** → sonraki faz. Büyük işi tek commite yığma.
- **Atomic Design (frontend, İstisna Yok):** atomlar → moleküller → organizmalar →
  şablonlar → ince sayfalar. Bir bileşen yalnız alt seviyeden import eder. Sayfada ham
  markup yığma; 2. tekrar = bileşene çıkar. (`docs/00 §4`)
- **Negatif testler birinci sınıf:** IDOR, privilege escalation, injection, enumeration,
  JWT kurcalama, SSRF (her fazda ilgili olanlar). (`docs/91`)
- Panele ekran/özellik/CRUD ekleyen/değiştiren HER işte kullanıcı kılavuzunu/dokümanı
  aynı commit'te güncelle.
- Koddan türetilemeyen, non-obvious kararları (neden + nasıl uygula) hafızaya yaz.

## "Tamamlandı" Tanımı (her faz — `docs/91 §8`)
Kabul kriterleri ✓ · birim+entegrasyon+(varsa) E2E testleri yeşil · güvenlik (negatif)
testleri geçti · kapsam hedefleri · mimari ihlal yok (Prisma yalnız repo; Atomic katmanlar) ·
ilgili docs güncel.

## Referanslar (`docs/`)
- `00` Mimari Genel Bakış · `01` Faz1 Temel Mimari & Auth · `02` Faz2 RBAC & Kullanıcı ·
  `03` Faz3 Lead & Kanban · `04` Faz4 Finans & Fatura · `05` Faz5 Entegrasyonlar ·
  `06` Faz6 Docker & Multi-tenancy · `90` Güvenlik Standartları · `91` Test Stratejisi ·
  `02-durustluk-ve-calisma-tarzi.md` Çalışma tarzı.

## Komutlar
Backend (`backend/`):
- `npm run start:dev` (watch) · `npm run build` · `npm run lint` · `npm run test` ·
  `npm run test:e2e` · `npm run test:cov`
- Prisma: `npx prisma migrate dev` → `npx prisma generate` → `npm run seed`
Frontend (`frontend/`, Faz 3+):
- `npm run dev` · `npm run build` · `npm run lint` · `npm run test`
DevOps (Faz 6): `docker compose up -d`
