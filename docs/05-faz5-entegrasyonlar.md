# Faz 5 — Dış Entegrasyonlar (Webhook, SMTP Simülasyonu) & Servis Katmanı

**Amaç:** CRM'i dış dünyaya açmak: olay tabanlı **giden webhook**'lar (HMAC imzalı), gelen webhook alımı (doğrulamalı), ve **SMTP simülasyonu** ile e-posta gönderimi. Tümü temiz, test edilebilir bir **servis katmanı (provider soyutlaması)** üzerinden.

**Önkoşul:** Faz 1–4 (kimlik, RBAC, Lead, Invoice).

---

## 1. Kapsam

- **Giden webhook:** Sistem olaylarında (örn. `lead.created`, `invoice.paid`) abone URL'lere imzalı HTTP POST.
- **Gelen webhook:** Dış sistemden gelen olayları imza doğrulamasıyla kabul.
- **E-posta (SMTP simülasyonu):** `MailService` arkasında sahte/gerçek sağlayıcı (dev'de MailHog/console transport).
- **Servis katmanı soyutlaması:** `IMailProvider`, `IWebhookDispatcher` arayüzleri → SOLID/DIP.
- Yeniden deneme (retry), kuyruk, idempotency, rate limit.

---

## 2. Mimari — Olay Akışı

```
Domain olayı (LeadCreated, InvoicePaid)
   │  (EventEmitter2 / iç event bus)
   ▼
EventHandlers  →  WebhookDispatcherService   →  imzalı POST → abone URL (retry'li kuyruk)
               →  MailService (IMailProvider)  →  SMTP/sim transport
```

> İş servisleri (LeadService, InvoiceService) **doğrudan HTTP/SMTP çağırmaz**. Yalnız domain olayı yayar (`eventEmitter.emit('invoice.paid', payload)`). Entegrasyon handler'ları bu olayları dinler → gevşek bağlılık (loose coupling), test kolaylığı.

---

## 3. Veri Modeli

```prisma
// backend/src/prisma/schema.prisma (Faz 5 eklentileri)

model WebhookSubscription {
  id        String   @id @default(uuid())
  url       String
  events    String[]                                   // ["lead.created","invoice.paid"]
  secret    String                                     // HMAC imza anahtarı (şifreli saklanır)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  deliveries WebhookDelivery[]
}

model WebhookDelivery {
  id           String   @id @default(uuid())
  subscriptionId String
  event        String
  payload      Json
  status       DeliveryStatus @default(PENDING)
  attempts     Int      @default(0)
  lastError    String?
  nextRetryAt  DateTime?
  signature    String
  createdAt    DateTime @default(now())
  subscription WebhookSubscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)

  @@index([status, nextRetryAt])
}

enum DeliveryStatus { PENDING SUCCESS FAILED DEAD }

model EmailLog {
  id        String   @id @default(uuid())
  to        String
  subject   String
  template  String
  status    String                                     // SENT, FAILED, SIMULATED
  error     String?
  createdAt DateTime @default(now())
}
```

---

## 4. Giden Webhook — İmza & Güvenlik

Her giden istek HMAC-SHA256 ile imzalanır:

```
İmza   = HMAC_SHA256(secret, timestamp + "." + rawBody)
Başlıklar:
  X-CRM-Event:      invoice.paid
  X-CRM-Timestamp:  1751107200
  X-CRM-Signature:  sha256=<hex>
  X-CRM-Delivery:   <deliveryId>   (idempotency anahtarı)
```

Alıcı tarafta doğrulama: aynı secret ile imzayı yeniden üret, sabit zamanlı karşılaştır, timestamp penceresi (örn ±5 dk) ile **replay** engelle.

### Teslimat & Retry

```
gönder → 2xx? → SUCCESS
       → değil/timeout → attempts++ ; üstel geri çekilme (backoff): 1m,5m,30m,2h,6h
       → maxAttempts aşılırsa → DEAD (manuel inceleme)
```

- Teslimatlar **idempotent**: `X-CRM-Delivery` ile alıcı tekrarları ayırt eder.
- Bir worker (cron/queue) `PENDING`/retry zamanı gelmiş kayıtları işler.

---

## 5. Gelen Webhook — Doğrulama

```
POST /api/v1/integrations/webhooks/inbound/:source
  - rawBody korunur (imza için body parser ham gövdeyi saklar)
  - X-Signature HMAC doğrulanır (kaynağın secret'ı ile)
  - timestamp penceresi kontrol (replay engeli)
  - idempotency anahtarı daha önce işlendiyse 200 (tekrar işleme yok)
  - geçerliyse olay işlenir
```

> Gelen webhook endpoint'i `@Public()`'tir (dış sistem JWT taşımaz) ama **imza zorunlu** → yetkilendirme imzayla yapılır. İmza yoksa/yanlışsa `401`.

---

## 6. E-posta Servisi (SMTP Simülasyonu)

```ts
// backend/src/modules/integrations/mail/mail-provider.interface.ts
export interface IMailProvider {
  send(input: { to: string; subject: string; template: string; context: Record<string, unknown> }): Promise<void>;
}
```

```ts
// backend/src/modules/integrations/mail/providers/simulated-mail.provider.ts
// Geliştirme/test: gerçekten göndermez; render eder, loglar, EmailLog(status=SIMULATED) yazar.

// backend/src/modules/integrations/mail/providers/smtp-mail.provider.ts
// Üretim: nodemailer ile gerçek SMTP. Kimlik bilgisi .env'den.
```

Sağlayıcı seçimi `MAIL_DRIVER` env'i ile yapılır (`simulated` | `smtp`). Servis tüketicileri **arayüze** bağımlıdır, somut sınıfa değil (DIP).

Dev ortamında **MailHog** gibi bir yakalayıcı SMTP önerilir → gerçek e-posta gitmeden gönderim test edilir.

---

## 7. API Sözleşmesi — `/api/v1/integrations`

| Method | Yol | İzin | Açıklama |
|--------|-----|------|----------|
| POST | `/webhooks` | `integration.manage` | Abonelik oluştur |
| GET | `/webhooks` | `integration.read` | Abonelikleri listele |
| DELETE | `/webhooks/:id` | `integration.manage` | Abonelik sil |
| POST | `/webhooks/:id/test` | `integration.manage` | Test olayı gönder |
| GET | `/webhooks/:id/deliveries` | `integration.read` | Teslimat geçmişi |
| POST | `/webhooks/inbound/:source` | `@Public()` + HMAC | Gelen webhook |

> Yeni izinler Faz 2 modeline eklenir: `integration.read`, `integration.manage`. Yalnız ADMIN/MANAGER alır.

---

## 8. DTO'lar

```ts
// backend/src/modules/integrations/dto/create-webhook.dto.ts
import { IsUrl, IsArray, IsString, ArrayNotEmpty, IsIn } from 'class-validator';

const SUPPORTED_EVENTS = ['lead.created','lead.moved','invoice.issued','invoice.paid'] as const;

export class CreateWebhookDto {
  @IsUrl({ require_protocol: true, protocols: ['https'] })  // yalnız HTTPS
  url: string;

  @IsArray() @ArrayNotEmpty()
  @IsIn(SUPPORTED_EVENTS, { each: true })
  events: string[];
}
```

> `secret` istemciden alınmaz; sunucu kriptografik olarak üretir ve **bir kez** yanıtta döner (sonra yalnız hash/şifreli saklanır).

---

## 9. Güvenlik Kontrolleri (Faz 5)

| Kontrol | Uygulama |
|--------|----------|
| Giden imza | HMAC-SHA256 (timestamp+body); alıcı doğrular |
| Gelen doğrulama | İmza zorunlu, sabit zamanlı karşılaştırma |
| Replay engeli | Timestamp penceresi + idempotency anahtarı |
| SSRF engeli | Webhook URL allowlist/denylist; iç IP'lere (169.254/10.x/127.x) POST yasak |
| Yalnız HTTPS | Abonelik URL'i `https` zorunlu |
| Secret saklama | Şifreli (at-rest); logda asla görünmez |
| Rate limit | Giden teslimat ve inbound endpoint sınırlı |
| Mail injection | `to`/subject header injection'a karşı temizlenir (CRLF) |
| DoS | Retry üstel backoff + DEAD durumu; sonsuz döngü yok |
| Gizlilik | Payload'da yalnız gerekli alan; PII minimizasyonu |

> **SSRF kritik:** Webhook hedef URL'leri saldırgan kontrolünde olabilir. DNS rebinding'e karşı çözümlenen IP de kontrol edilir; iç ağ adreslerine istek reddedilir.

---

## 10. Kabul Kriterleri

- [ ] `invoice.paid` olayında abone URL'e imzalı POST gider.
- [ ] Alıcı imzayı doğrulayabilir; bozuk imza reddedilir.
- [ ] Başarısız teslimat backoff ile yeniden denenir, maxAttempts sonrası DEAD olur.
- [ ] Gelen webhook imzasız/yanlış imzalı ise `401`.
- [ ] İç IP'li webhook URL'i reddedilir (SSRF).
- [ ] Mail `simulated` sürücüde gerçek gönderim yapmaz, `EmailLog` yazar.

---

## 11. Test Senaryoları (Faz 5)

### 11.1 Birim Testleri

| ID | Test | Beklenen |
|----|------|----------|
| U-5.1 | `sign(payload)` deterministik HMAC | beklenen imza |
| U-5.2 | `verify` yanlış imza | `false` |
| U-5.3 | `verify` eski timestamp | `false` (replay) |
| U-5.4 | Retry backoff hesabı | doğru `nextRetryAt` |
| U-5.5 | SSRF: iç IP URL | reddedilir |
| U-5.6 | `MailService` → `IMailProvider.send` çağrısı | doğru context ile |

### 11.2 E2E Testleri

| ID | Senaryo | Beklenen |
|----|---------|----------|
| E-5.1 | ADMIN `POST /webhooks` | `201`, secret bir kez döner |
| E-5.2 | SALES `POST /webhooks` | `403` |
| E-5.3 | `http://` URL ile abonelik | `400` (yalnız HTTPS) |
| E-5.4 | Olay tetikle → mock alıcı imzalı POST alır | imza doğrulanır |
| E-5.5 | Alıcı 500 döner → delivery FAILED, retry planlanır | doğru durum |
| E-5.6 | Inbound imzasız | `401` |
| E-5.7 | Inbound tekrar (aynı idempotency) | `200`, çift işlem yok |

### 11.3 Güvenlik / Dayanıklılık Testleri

| ID | Test | Beklenen |
|----|------|----------|
| S-5.1 | SSRF: `http://169.254.169.254/...` | reddedilir |
| S-5.2 | Mail header injection (`to: "a@b\r\nBcc: x"`) | temizlenir/reddedilir |
| S-5.3 | Secret yanıt/loglarda sızıntı | yok |
| C-5.1 | Alıcı yavaş/timeout | teslimat timeout + retry, sistem bloklanmaz |

> **Sonraki faz:** [Faz 6 — Dockerization & Multi-tenancy](./06-faz6-docker-multitenancy.md)
