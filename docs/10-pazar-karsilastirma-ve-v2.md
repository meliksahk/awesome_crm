# 10 — Pazar Karşılaştırması & v2 Yol Haritası

Bu doküman, **Açık Kaynak CRM (v1)** ile parayla satılan başlıca ticari CRM'leri
(Salesforce, HubSpot, Zoho, Pipedrive) araştırmaya dayalı olarak karşılaştırır ve
olası **v2** geliştirmelerini önceliklendirir.

> Araştırma kaynakları doküman sonunda. Fiyatlar kullanıcı/ay (yıllık fatura), 2026.

## 0. Konum & Fiyat Bağlamı

| Ürün | Giriş | Orta | Üst | Model |
|------|-------|------|-----|-------|
| **Açık Kaynak CRM (biz)** | **$0** | $0 | $0 | MIT, **self-host**, sınırsız kullanıcı |
| HubSpot Sales Hub | $15 | $100 | $150 | SaaS, kapalı |
| Salesforce Sales Cloud | — | ~$165 (Ent.) | ~$330 (Unl.) | SaaS, kapalı |
| Zoho CRM / Zoho One | düşük | — | $45 (One, 45+ uygulama) | SaaS, kapalı |
| Pipedrive | $14 | $49 | $99 | SaaS, kapalı |

En büyük yapısal farkımız: **açık kaynak + kendi sunucunda barındırma → veri sahipliği,
kullanıcı başına ücret yok, sınırsız özelleştirme.** Ticari CRM'lerde maliyet kullanıcı
sayısıyla doğrusal büyür ve veriler sağlayıcıda durur.

## 1. Özellik Karşılaştırma Tablosu

Gösterim: ✅ tam · ⚠️ kısmi/temel · ❌ yok

| Alan | Bizde (v1) | Ticari CRM'ler | Not |
|------|:----------:|:--------------:|-----|
| **Çekirdek veri** | | | |
| Satış hattı / Kanban (deal stage) | ✅ | ✅ | Bizde kesirli rank + atomik move + sahiplik |
| Lead yönetimi | ✅ | ✅ | Bizde tek "Lead" nesnesi |
| Contact / Company / Account (ayrı nesne + ilişki) | ❌ | ✅ | Bizde alanlar Lead'e gömülü; ayrı kişi/şirket yok |
| Deal ↔ Lead ayrımı, deal yaşam döngüsü | ⚠️ | ✅ | Lead var; ayrı Deal/Opportunity yok |
| Aktivite / Not / Görev / Hatırlatma | ⚠️ | ✅ | LeadActivity (not, stage değişimi) var; task/reminder yok |
| Özel alan / özel nesne (low-code) | ❌ | ✅ | |
| **Satış üretkenliği** | | | |
| 2-yön e-posta sync, takip, şablon, sequence | ❌ | ✅ | Bizde yalnız transactional (simulated) |
| Takvim / toplantı planlama | ❌ | ✅ | |
| Telefon (CTI) / arama kaydı | ❌ | ✅ | |
| Ürün katalog / Teklif / CPQ | ⚠️ | ✅ | Fatura kalemleri var; ürün/teklif yok |
| **Fatura / ödeme / vergi (finans)** | ✅✅ | ⚠️ | **Bizim artımız:** çoğu CRM'de native yok (eklenti/muhasebe entegrasyonu). Bizde immutability + sıralı vergi no + finansal maskeleme |
| **Otomasyon & zeka** | | | |
| İş akışı otomasyonu (if-then, oto-atama) | ⚠️ | ✅ | Event bus + webhook var; no-code kural motoru yok |
| Lead scoring (kural/AI) | ❌ | ✅ | |
| AI (forecast, next-best-action, e-posta yazma, özet, dedup) | ❌ | ✅ | Einstein / Breeze / Zia |
| Raporlama / dashboard / forecast | ⚠️ | ✅ | Bizde sayım kartları; gerçek rapor/forecast yok |
| **Pazarlama** | | | |
| Kampanya / e-posta pazarlama / form / landing / canlı sohbet | ❌ | ✅ | HubSpot güçlü |
| **Platform & operasyon** | | | |
| RBAC (rol+izin, finansal/alan maskeleme) | ✅✅ | ✅ | Bizde granüler + **API katmanında** maskeleme; ticaride genelde üst plan |
| Webhook (giden HMAC + gelen doğrulama) | ✅ | ✅ | |
| Audit log | ⚠️ | ✅ | Bizde logger; ayrı tablo yok |
| Entegrasyon pazarı (Gmail/Outlook/Slack/muhasebe + binlerce) | ❌ | ✅ | Salesforce 7000+ |
| Mobil uygulama | ❌ | ✅ | |
| İçe/dışa aktarım, dedup, zenginleştirme | ❌ | ✅ | |
| Çoklu kiracılık (multi-tenant SaaS) | ⚠️ | ✅ | Bizde temel (Lead+Invoice filtresi) |
| API-first / OpenAPI (Swagger) | ✅ | ✅ | |
| Global / full-text arama | ❌ | ✅ | |
| Bildirim (in-app / push) | ❌ | ✅ | |
| GDPR / uyumluluk araçları | ❌ | ✅ | |
| **Açık kaynak / self-host / veri sahipliği / $0 seat** | ✅✅ | ❌ | **En büyük farkımız** |

### Özet
- **Bizde olup onlarda zayıf/eklenti olan:** açık kaynak & self-host (veri sahipliği,
  sınırsız kullanıcı), **native finans/fatura** (immutability + sıralı vergi numarası),
  **API katmanında finansal maskeleme** (görev ayrımı), HMAC webhook + API-first temel.
- **Onlarda olup bizde olmayan (en kritik açıklar):** Contact/Company nesneleri,
  e-posta entegrasyonu, otomasyon motoru, raporlama/forecast, AI, pazarlama,
  özelleştirme (custom fields), entegrasyon ekosistemi, mobil.

## 2. v2 Yol Haritası (önceliklendirilmiş)

Sıralama **etki/efor** ve mevcut mimariye bağlanabilirlik gözetilerek yapıldı.
Her faz mevcut katmanlı mimari (Controller→Service→Repository), RBAC ve test
disiplinini korur.

| # | Faz (v2) | Kapsam | Neden / Etki | Efor |
|---|----------|--------|--------------|------|
| **V2.1** | **Çekirdek CRM nesneleri** | `Contact`, `Company`, `Deal`'i Lead'den ayır; ilişkiler (Contact↔Company, Deal↔Contact). `Task`/`Note`/`Call`/`Meeting` + `dueDate`/`reminder`. | "Gerçek CRM" olmanın ön koşulu; en yüksek etki. | Y |
| **V2.2** | **E-posta & takvim** | Gerçek SMTP sürücü + şablonlar; Gmail/Outlook OAuth ile 2-yön sync, açılma/yanıt takibi; toplantı planlama. | Satışçının günlük aracı; rakiplerin standart özelliği. | Y |
| **V2.3** | **Otomasyon motoru (no-code)** | Tetikleyici (kayıt oluştu / aşama değişti / alan güncellendi) → aksiyon (ata, e-posta, task, webhook). Mevcut **event bus** üstüne kurulur. | "if-then" otomasyon — kategori standardı. | O |
| **V2.4** | **Raporlama & forecast** | Dashboard builder, pipeline forecast, satış/hedef raporları, dönem karşılaştırma. | Yönetici görünürlüğü; satın alma kriteri. | O |
| **V2.5** | **Özelleştirme (low-code)** | Custom fields + custom objects (JSONB/EAV), kayıt başına dinamik alan + layout. | Her sektöre uyarlanabilirlik; Zoho/Salesforce gücü. | O |
| **V2.6** | **AI katmanı (Claude API)** | Lead scoring (kural+AI), e-posta taslağı, toplantı/not özeti, duplicate tespiti, "next best action", doğal dille rapor. | **Güçlü farklılaştırıcı**; Anthropic Claude ile maliyet kontrollü, self-host AI. | O |
| **V2.7** | **Ürün katalog + Teklif/CPQ + e-imza** | Ürün/fiyat listesi, Quote → mevcut **Invoice**'a dönüşüm, e-imza. | Mevcut finans modülüne doğal bağlanır (artımızı büyütür). | O |
| **V2.8** | **Entegrasyonlar & veri** | CSV içe/dışa aktarım, dedup/merge, zenginleştirme; Gmail/Slack/muhasebe konnektörleri; webhook "marketplace". | Geçiş engelini düşürür; ekosistem. | O |
| **V2.9** | **Platform olgunluk** | `AuditLog` tablosu, global full-text arama (Postgres `tsvector`/Meili), bildirimler (in-app/web push), GDPR (kişi verisi dışa aktar/sil), mobil **PWA**. | Kurumsal/uyumluluk gereksinimleri. | O |
| **V2.10** | **Multi-tenancy tamamlama** | Tüm modellere `tenantId` + JWT tenant claim + subdomain çözümleme + **RLS** (ikinci savunma) + `@@unique([tenantId, …])` + platform-admin rolü. | Gerçek SaaS'a dönüşüm. | O |

> Efor: Y = büyük, O = orta.

### Önerilen sıralama mantığı
1. **Önce temel (V2.1)** — Contact/Company/Deal olmadan diğerleri eksik kalır.
2. **Üretkenlik (V2.2–V2.4)** — e-posta + otomasyon + rapor: günlük kullanım ve satın alma kriterleri.
3. **Farklılaştırma (V2.5–V2.7)** — özelleştirme, AI, teklif/CPQ: rakipten ayrışma + finans artımızı büyütme.
4. **Ölçek & olgunluk (V2.8–V2.10)** — ekosistem, uyumluluk, tam SaaS.

### Hızlı kazanımlar (düşük efor, görünür değer)
- `Task`/`reminder` + lead'e "son aktivite" zaman çizgisi (V2.1'in küçük dilimi).
- `AuditLog` tablosu (mevcut logger zaten kim/ne/ne zaman yazıyor).
- Global arama (Postgres full-text) — leads/invoices/contacts.
- Gerçek SMTP sürücüsü (arayüz hazır; yalnız `smtp` provider).

---

## Kaynaklar

- [Salesforce vs Zoho vs HubSpot vs Pipedrive — Best CRM 2026 (Salesflare)](https://blog.salesflare.com/compare-salesforce-zoho-hubspot-pipedrive)
- [Salesforce vs HubSpot vs Zoho — 2026 (Sybill)](https://www.sybill.ai/blogs/salesforce-vs-hubspot-vs-zoho)
- [Pipedrive Pricing 2026 (EmailToolTester)](https://www.emailtooltester.com/en/crm/pipedrive-review/pricing/)
- [Pipedrive Pricing Plans 2026 (Axis Consulting)](https://axisconsulting.io/pipedrive-pricing-plans/)
- [15 Essential CRM Features (AlphonsoLabs)](https://www.alphonsolabs.com/crm-essential-features-checklist-2026/)
- [Top CRM Features 2026 (Nadcab)](https://www.nadcab.com/blog/crm-features-list)
- [HubSpot vs Salesforce 2026 Pricing (Resonate)](https://www.resonatehq.com/blog/hubspot-vs-salesforce-a-comprehensive-comparison)
- [Salesforce Sales Cloud Pricing 2026 (SaaSrat)](https://saasrat.com/products/salesforce)
- [HubSpot Sales Hub Pricing 2026 (G2)](https://www.g2.com/products/hubspot-sales-hub/pricing)
