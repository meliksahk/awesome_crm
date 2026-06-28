# Faz 3 — Satış (Lead) Modülü & Kanban

**Amaç:** Satış hattını (sales pipeline) Kanban panosu olarak modellemek; Lead'lerin aşamalar arası taşınmasını verimli ve tutarlı biçimde yönetecek veritabanı kurgusunu ve API'leri tasarlamak.

**Önkoşul:** Faz 2 tamamlanmış (RBAC, `lead.*` izinleri).

---

## 1. Kapsam

- `Pipeline`, `Stage`, `Lead`, `LeadActivity` modelleri.
- Kanban sıralaması için **kesirli sıralama (fractional ranking)** yaklaşımı.
- Lead CRUD + aşama değiştirme (move) + atama (assign).
- Sahiplik (ownership) tabanlı erişim: SALES yalnız kendi/atanmış lead'lerini görür (opsiyonel kural).
- Filtreleme, sayfalama, arama.

---

## 2. Veri Modeli

```prisma
// backend/src/prisma/schema.prisma (Faz 3 eklentileri)

model Pipeline {
  id        String   @id @default(uuid())
  name      String
  isDefault Boolean  @default(false)
  stages    Stage[]
  leads     Lead[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Stage {
  id         String   @id @default(uuid())
  pipelineId String
  name       String                                  // örn: Yeni, İletişim, Teklif, Kazanıldı, Kaybedildi
  position   Int                                     // sütun sırası
  isWon      Boolean  @default(false)
  isLost     Boolean  @default(false)
  pipeline   Pipeline @relation(fields: [pipelineId], references: [id], onDelete: Cascade)
  leads      Lead[]

  @@unique([pipelineId, position])
  @@index([pipelineId])
}

model Lead {
  id          String   @id @default(uuid())
  pipelineId  String
  stageId     String
  title       String
  contactName String?
  email       String?
  phone       String?
  company     String?
  value       Decimal? @db.Decimal(14, 2)            // tahmini değer
  currency    String   @default("TRY")
  // Kanban içi sıralama — kesirli rank (çakışmasız taşıma için)
  rank        Decimal  @db.Decimal(30, 15)
  ownerId     String?                                // atanan satış temsilcisi
  status      LeadStatus @default(OPEN)
  pipeline    Pipeline @relation(fields: [pipelineId], references: [id])
  stage       Stage    @relation(fields: [stageId], references: [id])
  owner       User?    @relation(fields: [ownerId], references: [id])
  activities  LeadActivity[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?                              // soft delete

  @@index([stageId, rank])
  @@index([ownerId])
  @@index([pipelineId, status])
}

enum LeadStatus { OPEN WON LOST }

model LeadActivity {
  id        String   @id @default(uuid())
  leadId    String
  userId    String
  type      String                                   // NOTE, STAGE_CHANGE, CALL, EMAIL
  payload   Json?                                    // {from, to} vb.
  createdAt DateTime @default(now())
  lead      Lead     @relation(fields: [leadId], references: [id], onDelete: Cascade)

  @@index([leadId, createdAt])
}
```

### 2.1 Neden "rank" (kesirli sıralama)?

Kanban'da kart sürükle-bırakta, **tüm kartların `position`'ını yeniden numaralamak** (0,1,2,...) yüksek maliyetlidir ve eşzamanlılık sorunları doğurur. Bunun yerine her kartın ondalık bir `rank` değeri olur. İki kart arasına bırakıldığında yeni rank = `(üst.rank + alt.rank) / 2`. Böylece **tek satır güncellemesiyle** taşıma yapılır.

```
A: 1.0   B: 2.0   C: 3.0
C'yi A ile B arasına taşı  →  C.rank = (1.0 + 2.0) / 2 = 1.5
Sonuç sıra: A(1.0) C(1.5) B(2.0)
```

> Çok sayıda taşımada ondalık hassasiyeti tükenirse periyodik **yeniden dengeleme (rebalance)** işi rank'leri tam sayılara normalize eder.

---

## 3. Kanban Taşıma (Move) Mantığı

```
PATCH /leads/:id/move
body: { toStageId, beforeLeadId?, afterLeadId? }

Service.move():
  1. Lead + hedef Stage doğrula (aynı pipeline mi?)
  2. beforeLeadId/afterLeadId rank'lerini oku
  3. yeniRank hesapla:
       - sütun başı:  ilkRank - 1   (veya ilk eleman varsa ilk.rank/2)
       - sütun sonu:  sonRank + 1
       - araya:       (önce.rank + sonra.rank) / 2
  4. TRANSACTION içinde:
       - Lead.stageId + Lead.rank güncelle
       - isWon/isLost stage ise Lead.status = WON/LOST
       - LeadActivity(type=STAGE_CHANGE, {from,to}) ekle
```

Tüm işlem tek transaction → yarım kalmış taşıma olmaz (atomiklik).

---

## 4. API Sözleşmesi — `/api/v1/leads`

| Method | Yol | İzin | Açıklama |
|--------|-----|------|----------|
| GET | `/board?pipelineId=` | `lead.read` | Kanban görünümü: stage'ler + sıralı lead'ler |
| GET | `/` | `lead.read` | Listeleme (filtre, arama, sayfalama) |
| GET | `/:id` | `lead.read` | Tekil lead + aktiviteler |
| POST | `/` | `lead.create` | Yeni lead |
| PATCH | `/:id` | `lead.update` | Alan güncelleme |
| PATCH | `/:id/move` | `lead.move` | Aşama/sıra değiştir |
| PATCH | `/:id/assign` | `lead.update` | Sahip ata |
| POST | `/:id/activities` | `lead.update` | Not/aktivite ekle |
| DELETE | `/:id` | `lead.delete` | Soft delete |

### Örnek: Kanban board yanıtı

```jsonc
// GET /api/v1/leads/board?pipelineId=...
{
  "success": true,
  "data": {
    "pipelineId": "…",
    "stages": [
      {
        "id": "stage-new", "name": "Yeni", "position": 0,
        "leads": [
          { "id": "l1", "title": "ACME teklifi", "value": "12000.00", "rank": "1.000" }
        ]
      }
    ]
  }
}
```

---

## 5. DTO'lar

```ts
// backend/src/modules/leads/dto/create-lead.dto.ts
import { IsString, IsOptional, IsEmail, IsNumberString, IsUUID } from 'class-validator';

export class CreateLeadDto {
  @IsUUID('4') pipelineId: string;
  @IsUUID('4') stageId: string;
  @IsString() title: string;
  @IsOptional() @IsString() contactName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsNumberString() value?: string;   // Decimal güvenliği için string
}
```

```ts
// backend/src/modules/leads/dto/move-lead.dto.ts
import { IsUUID, IsOptional } from 'class-validator';

export class MoveLeadDto {
  @IsUUID('4') toStageId: string;
  @IsOptional() @IsUUID('4') beforeLeadId?: string;
  @IsOptional() @IsUUID('4') afterLeadId?: string;
}
```

> Parasal değer (`value`) `string`/`IsNumberString` ile alınır, Service'te `Decimal`'e dönüştürülür → float yuvarlama hatası engellenir.

---

## 6. Güvenlik Kontrolleri (Faz 3)

| Kontrol | Uygulama |
|--------|----------|
| Yetki | Tüm uçlar `lead.*` izniyle korunur; `move` ayrı izin |
| Sahiplik (opsiyonel) | SALES yalnız `ownerId = self` lead'lere yazar; MANAGER hepsine |
| Pipeline tutarlılığı | Hedef stage, lead'in pipeline'ına ait olmalı (cross-pipeline taşıma engeli) |
| IDOR | `:id` ve `beforeLeadId/afterLeadId` aynı tenant/pipeline'da doğrulanır |
| Decimal güvenliği | Parasal alanlar Decimal; float kullanılmaz |
| Race condition | Move tek transaction; eşzamanlı taşımada rank yeniden hesaplanır |
| Soft delete | `deletedAt`; silinmiş lead listede/board'da görünmez |
| Girdi doğrulama | DTO whitelist; arama parametreleri parametrik (injection yok) |

---

## 7. Kabul Kriterleri

- [ ] `GET /leads/board` stage'leri pozisyona, lead'leri rank'e göre sıralı döner.
- [ ] `move` ile kart araya bırakıldığında yalnız o kartın rank'i güncellenir.
- [ ] `isWon` stage'e taşımada `status=WON` olur ve aktivite kaydı düşer.
- [ ] Farklı pipeline'ın stage'ine taşıma reddedilir.
- [ ] `lead.move` izni olmayan kullanıcı taşıyamaz (`403`).

---

## 8. Test Senaryoları (Faz 3)

### 8.1 Birim Testleri

| ID | Test | Beklenen |
|----|------|----------|
| U-3.1 | `computeRank` iki kart arası | ortalama rank döner |
| U-3.2 | `computeRank` sütun başı/sonu | uç rank doğru |
| U-3.3 | `move` cross-pipeline | `BadRequestException` |
| U-3.4 | `move` isWon stage | `status=WON` + STAGE_CHANGE aktivitesi |
| U-3.5 | `create` geçersiz stageId | `NotFound/BadRequest` |
| U-3.6 | Decimal `value` "12000.10" | hassasiyet korunur |

### 8.2 E2E Testleri

| ID | Senaryo | Beklenen |
|----|---------|----------|
| E-3.1 | SALES `POST /leads` | `201` |
| E-3.2 | `GET /leads/board` | stage+lead sıralı yapı |
| E-3.3 | `PATCH /leads/:id/move` araya bırak | `200`, doğru yeni sıra |
| E-3.4 | VIEWER `PATCH /leads/:id/move` | `403` |
| E-3.5 | Cross-pipeline move | `400` |
| E-3.6 | `DELETE /leads/:id` sonra board | lead görünmez |
| E-3.7 | Sayfalama + arama | doğru `meta`, filtrelenmiş sonuç |

### 8.3 Eşzamanlılık / Güvenlik Testleri

| ID | Test | Beklenen |
|----|------|----------|
| C-3.1 | İki kullanıcı aynı anda aynı slot'a move | İkisi de tutarlı, rank çakışması yok |
| C-3.2 | Çok sayıda art arda move (rank tükenmesi) | rebalance sonrası tutarlı sıra |
| S-3.1 | Başka kullanıcının lead'ine IDOR ile yazma | yetki/sahiplik yoksa `403` |
| S-3.2 | Arama alanına injection denemesi | etkisiz (parametrik) |

> **Sonraki faz:** [Faz 4 — Finans & Fatura](./04-faz4-finans-fatura.md)
