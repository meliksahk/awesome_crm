# 11 — v2 Faz Planı (uygulama)

[docs/10](./10-pazar-karsilastirma-ve-v2.md) yol haritasının uygulanabilir alt-fazlara
bölünmüş hâli. Karar: **tam refactor** (Lead→Deal; ayrı Contact/Company/Lead +
dönüştürme) · **AI = Claude, key opsiyonel**.

Her alt-faz: kodla → typecheck+lint+test → commit+push. Mevcut mimari/güvenlik/test
disiplini korunur.

## V2.1 — Çekirdek CRM nesneleri
- **1a Company + Contact** (additive, yeni izinler `company.*`/`contact.*`, CRUD, testler).
- **1b Lead→Deal refactor**: pipeline varlığı `Lead`→`Deal` (model/modül/rota `/deals`,
  izin `deal.*`). `Deal.contactId/companyId`. Invoice/tenant/frontend/seed güncelle.
- **1c Yeni Lead (nitelenmemiş)** + `convert` (lead→Contact+Deal) akışı.
- **1d Activity/Task genelleştirme**: Deal/Contact/Lead'e bağlanabilen aktivite +
  Task (dueDate/atanan/tamamlandı) + hatırlatma.

## V2.2 — E-posta & takvim
- Gerçek `smtp` mail sürücüsü + şablon motoru. Outbound transactional + EmailLog.
- (Ops.) Gmail/Outlook OAuth 2-yön sync iskeleti. Meeting/CalendarEvent.

## V2.3 — Otomasyon motoru (no-code)
- `AutomationRule` (trigger: record.created/stage.changed/field.updated → action:
  assign/email/task/webhook). Mevcut event bus üstüne kurulur.

## V2.4 — Raporlama & forecast
- Toplulaştırma uçları (pipeline değeri, dönem, kullanıcı bazlı), basit forecast.

## V2.5 — Özelleştirme (low-code)
- `CustomFieldDef` + kayıtlarda `customFields Json` (Deal/Contact/Company).

## V2.6 — AI katmanı (Claude API, key opsiyonel) — ✅ TAMAM
- `AiService` (Anthropic SDK, model `claude-opus-4-8`, structured outputs). Uçlar:
  `GET /ai/status`, `POST /ai/deals/:id/score` (deal puanlama + next-best-action),
  `POST /ai/draft-email` (e-posta taslağı), `POST /ai/summarize` (özetleme).
  İzin: `ai.use` (ADMIN/MANAGER/SALES). `ANTHROPIC_API_KEY` **opsiyonel**: yoksa
  client `null` → uçlar 503, `status.enabled:false` (uygulama yine açılır).
  Test: 8 unit (mock client + no-key 503 + refusal), 5 e2e (status/yetki/503).

## V2.7 — Ürün + Teklif/CPQ — ✅ TAMAM
- `Product` kataloğu (CRUD, soft delete, SKU benzersiz) + `Quote` (kalemler,
  productId çözümleme, sunucu Decimal toplam, `QuoteStatus` yaşam döngüsü).
- Uçlar: `/products` CRUD, `/quotes` CRUD + `send` (QUO-yıl-seq numara) +
  `accept`/`reject` + `convert` → DRAFT `Invoice` (tek transaction, idempotent;
  çift dönüşüm 409). İzinler `product.*`/`quote.*`; tenant kapsamı eklendi.
- Frontend: Ürünler + Teklifler sayfaları (liste/oluştur, gönder/faturala).
- Test: 11 unit + 6 e2e (CPQ akışı: ürün→teklif→gönder→faturala→çift dönüşüm).

## V2.8 — Entegrasyon & veri
- CSV import/export, dedup/merge.

## V2.9 — Platform olgunluk
- `AuditLog` tablosu, full-text arama, bildirim, GDPR dışa aktar/sil, mobil PWA.

## V2.10 — Multi-tenancy tamamlama
- Tüm modeller `tenantId`, JWT tenant claim, subdomain, RLS, `@@unique([tenantId,…])`,
  platform-admin.
