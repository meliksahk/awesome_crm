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

## V2.6 — AI katmanı (Claude API, key opsiyonel)
- `AiService` (Anthropic SDK). Uçlar: lead scoring, e-posta taslağı, özetleme,
  duplicate tespiti, next-best-action. Key yoksa 503 "yapılandırılmadı".

## V2.7 — Ürün + Teklif/CPQ
- `Product`, `Quote` (kalemler) → mevcut `Invoice`'a dönüştür.

## V2.8 — Entegrasyon & veri
- CSV import/export, dedup/merge.

## V2.9 — Platform olgunluk
- `AuditLog` tablosu, full-text arama, bildirim, GDPR dışa aktar/sil, mobil PWA.

## V2.10 — Multi-tenancy tamamlama
- Tüm modeller `tenantId`, JWT tenant claim, subdomain, RLS, `@@unique([tenantId,…])`,
  platform-admin.
