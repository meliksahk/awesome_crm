# Faz 4 — Finans & Fatura Modülü (İzole Yetkili)

**Amaç:** Lead/müşteri ile ilişkili faturalandırma ve ödeme takibini, **finansal verilere erişimi izole eden** sıkı yetki kuralları altında modellemek. Finansal bütünlük (immutability, audit) ön plandadır.

**Önkoşul:** Faz 2 (RBAC, `invoice.*` ve `invoice.read_financial`), Faz 3 (Lead).

---

## 1. Kapsam

- `Invoice`, `InvoiceLineItem`, `Payment` modelleri.
- Finansal alanlara (tutar, ödeme) **ayrı izin** (`invoice.read_financial`) ile erişim izolasyonu.
- Fatura yaşam döngüsü: DRAFT → SENT → PAID / PARTIALLY_PAID / OVERDUE / CANCELLED.
- Onaylanmış faturanın değiştirilemezliği (immutability) + düzeltme için credit note.
- Decimal aritmetiği, para birimi, vergi (KDV) hesabı.

---

## 2. Veri Modeli

```prisma
// backend/src/prisma/schema.prisma (Faz 4 eklentileri)

model Invoice {
  id            String   @id @default(uuid())
  number        String   @unique                       // INV-2026-000123 (sıralı, atlamasız)
  leadId        String?
  customerName  String
  customerEmail String?
  status        InvoiceStatus @default(DRAFT)
  currency      String   @default("TRY")
  subtotal      Decimal  @db.Decimal(14, 2)
  taxRate       Decimal  @db.Decimal(5, 2)             // % KDV
  taxAmount     Decimal  @db.Decimal(14, 2)
  total         Decimal  @db.Decimal(14, 2)
  amountPaid    Decimal  @db.Decimal(14, 2) @default(0)
  issuedAt      DateTime?
  dueAt         DateTime?
  lead          Lead?    @relation(fields: [leadId], references: [id])
  lineItems     InvoiceLineItem[]
  payments      Payment[]
  createdById   String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([status])
  @@index([leadId])
  @@index([dueAt])
}

enum InvoiceStatus { DRAFT SENT PARTIALLY_PAID PAID OVERDUE CANCELLED }

model InvoiceLineItem {
  id          String   @id @default(uuid())
  invoiceId   String
  description String
  quantity    Decimal  @db.Decimal(12, 3)
  unitPrice   Decimal  @db.Decimal(14, 2)
  lineTotal   Decimal  @db.Decimal(14, 2)
  invoice     Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
}

model Payment {
  id         String   @id @default(uuid())
  invoiceId  String
  amount     Decimal  @db.Decimal(14, 2)
  method     String                                    // BANK, CARD, CASH
  reference  String?
  paidAt     DateTime @default(now())
  recordedById String
  invoice    Invoice  @relation(fields: [invoiceId], references: [id])

  @@index([invoiceId])
}
```

> **Sıralı fatura numarası:** Vergisel/yasal nedenle atlamasız ve sıralı olmalıdır. Üretim, transaction içinde bir `InvoiceCounter` (yıl bazlı) tablosu kilitlenerek yapılır → yarış koşulunda numara çakışması/atlaması olmaz.

---

## 3. Yetki İzolasyonu (kritik)

Finans modülü, CRM'in geri kalanından mantıksal olarak yalıtılır:

| Erişim seviyesi | İzin | Görebildiği |
|-----------------|------|-------------|
| Fatura listesini görme (tutarsız) | `invoice.read` | Numara, müşteri, durum — **tutar gizli** |
| Finansal detay | `invoice.read_financial` | Tutar, ödeme, kâr alanları |
| Oluşturma/değiştirme | `invoice.create` / `invoice.update` | DRAFT üzerinde |
| Ödeme kaydı | `invoice.update` + finansal | Payment ekleme |

- **SALES** rolü `invoice.read_financial` **almaz** → satışçı faturanın varlığını görür ama tutarları göremez.
- **FINANCE** rolü tüm `invoice.*` + `invoice.read_financial` alır; ama `lead.*`/`user.*` **almaz** → görev ayrımı (separation of duties).
- Yanıt serileştirmede finansal alanlar, izin yoksa `class-transformer` `@Exclude`/grup ile **çıkarılır** (sadece UI'da gizlemek yetmez; API katmanında kesilir).

---

## 4. Fatura Yaşam Döngüsü & Değişmezlik

```
DRAFT      → düzenlenebilir (lineItems, müşteri, vergi)
  └ issue → SENT (issuedAt, number atanır)  ➜ ARTIK lineItems DEĞİŞTİRİLEMEZ
SENT       → ödeme geldikçe PARTIALLY_PAID / PAID; vade geçerse OVERDUE
PAID       → kilitli
CANCELLED  → yalnız DRAFT/SENT iken; PAID iptal edilemez (credit note ile düzeltilir)
```

- `SENT` ve sonrası fatura kalemleri **immutable**. Düzeltme yalnız **credit note** (ters kayıt) ile yapılır → finansal audit izi korunur.
- Tutarlar Service'te yeniden hesaplanır; istemciden gelen `total` **asla** doğrudan kabul edilmez.

```
subtotal  = Σ lineTotal
taxAmount = round(subtotal * taxRate / 100, 2)
total     = subtotal + taxAmount
status    = amountPaid >= total ? PAID : amountPaid > 0 ? PARTIALLY_PAID : SENT
```

---

## 5. API Sözleşmesi — `/api/v1/invoices`

| Method | Yol | İzin | Not |
|--------|-----|------|-----|
| GET | `/` | `invoice.read` | Liste; finansal alanlar izne göre maskeli |
| GET | `/:id` | `invoice.read` | Detay; tutarlar `invoice.read_financial` ile |
| POST | `/` | `invoice.create` | DRAFT oluştur |
| PATCH | `/:id` | `invoice.update` | Yalnız DRAFT |
| POST | `/:id/issue` | `invoice.update` | DRAFT→SENT, numara üret |
| POST | `/:id/payments` | `invoice.update` | Ödeme kaydı (finansal) |
| POST | `/:id/cancel` | `invoice.update` | Koşullu iptal |
| GET | `/:id/pdf` | `invoice.read_financial` | Fatura PDF (opsiyonel) |

### Örnek: maskeli liste (finansal izin yok)

```jsonc
// GET /api/v1/invoices  (kullanıcıda invoice.read var, read_financial YOK)
{
  "success": true,
  "data": [
    { "id": "…", "number": "INV-2026-000123", "customerName": "ACME", "status": "SENT" }
    // total/amountPaid/taxAmount alanları YOK
  ]
}
```

---

## 6. DTO'lar

```ts
// backend/src/modules/invoices/dto/create-invoice.dto.ts
import { IsString, IsOptional, IsEmail, IsUUID, IsArray, ValidateNested, IsNumberString } from 'class-validator';
import { Type } from 'class-transformer';

class LineItemDto {
  @IsString() description: string;
  @IsNumberString() quantity: string;
  @IsNumberString() unitPrice: string;
}

export class CreateInvoiceDto {
  @IsOptional() @IsUUID('4') leadId?: string;
  @IsString() customerName: string;
  @IsOptional() @IsEmail() customerEmail?: string;
  @IsNumberString() taxRate: string;               // örn "20"
  @IsArray() @ValidateNested({ each: true }) @Type(() => LineItemDto)
  lineItems: LineItemDto[];
}
```

```ts
// backend/src/modules/invoices/dto/create-payment.dto.ts
import { IsNumberString, IsString, IsOptional } from 'class-validator';
export class CreatePaymentDto {
  @IsNumberString() amount: string;
  @IsString() method: string;          // BANK | CARD | CASH
  @IsOptional() @IsString() reference?: string;
}
```

---

## 7. Güvenlik Kontrolleri (Faz 4)

| Kontrol | Uygulama |
|--------|----------|
| Finansal izolasyon | `invoice.read_financial` olmadan tutarlar API'de kesilir |
| Görev ayrımı | FINANCE ↔ SALES rolleri ayrık; aşırı yetki birikimi yok |
| Sunucu tarafı hesap | total/tax/subtotal daima sunucuda hesaplanır |
| Decimal | Tüm para alanları `Decimal`; float yasak |
| Aşırı ödeme | `amountPaid` > `total` engellenir/uyarılır |
| Immutability | SENT+ faturada kalem değişimi reddedilir |
| Sıralı numara | Transaction + sayaç kilidi; atlamasız, çakışmasız |
| Audit | issue/payment/cancel işlemleri kim-ne-zaman loglanır |
| IDOR | `:id` yetki + (multi-tenant'ta) tenant kontrolünden geçer |
| PDF erişimi | İmzalı/yetkili erişim; tahmin edilebilir URL yok |

---

## 8. Kabul Kriterleri

- [ ] SALES `GET /invoices` çağrısında tutar alanlarını **göremez**.
- [ ] FINANCE tüm finansal alanları görür ve ödeme kaydedebilir.
- [ ] DRAFT faturada kalem değişir; SENT faturada değişmez (`409`).
- [ ] İstemciden gelen sahte `total` yok sayılır; sunucu hesabı kullanılır.
- [ ] Eşzamanlı iki `issue` çağrısı çakışmayan sıralı numara üretir.
- [ ] PAID fatura iptal edilemez.

---

## 9. Test Senaryoları (Faz 4)

### 9.1 Birim Testleri

| ID | Test | Beklenen |
|----|------|----------|
| U-4.1 | `calcTotals` subtotal/tax/total | doğru Decimal sonuç |
| U-4.2 | Ödeme sonrası status geçişi | PARTIALLY_PAID / PAID doğru |
| U-4.3 | SENT faturada `update` | `ConflictException` |
| U-4.4 | Aşırı ödeme | reddet/uyar |
| U-4.5 | PAID fatura `cancel` | `ConflictException` |
| U-4.6 | Numara üretimi (mock sayaç) | atlamasız, formatlı |

### 9.2 E2E Testleri

| ID | Senaryo | Beklenen |
|----|---------|----------|
| E-4.1 | FINANCE `POST /invoices` | `201`, DRAFT |
| E-4.2 | SALES `GET /invoices` | `200` ama tutar alanları yok |
| E-4.3 | FINANCE `GET /invoices` | tutarlar görünür |
| E-4.4 | SALES `POST /invoices/:id/payments` | `403` |
| E-4.5 | `POST /:id/issue` → tekrar `PATCH /:id` | `409` |
| E-4.6 | Sahte `total` ile create | sunucu hesabı uygulanır |
| E-4.7 | Aşağı yuvarlama hassasiyeti (`0.1+0.2`) | Decimal doğru |

### 9.3 Eşzamanlılık / Güvenlik Testleri

| ID | Test | Beklenen |
|----|------|----------|
| C-4.1 | Paralel `issue` | benzersiz sıralı numara, atlama yok |
| S-4.1 | `invoice.read` ile finansal alan zorla isteme | alanlar yine yok |
| S-4.2 | Başka tenant faturasına IDOR | `403/404` |
| S-4.3 | Negatif/manipüle quantity-unitPrice | doğrulama reddi |

> **Sonraki faz:** [Faz 5 — Dış Entegrasyonlar](./05-faz5-entegrasyonlar.md)
