# Test Stratejisi (Tüm Fazlar)

Bu doküman, projenin test yaklaşımını, araçlarını, kapsam hedeflerini ve her faza yayılan test türlerini tanımlar. Her faz dokümanı kendi somut test senaryolarını içerir; burada **çerçeve** verilir.

---

## 1. Test Piramidi

```
        /\        E2E  (az sayı, kritik akış)        — test/*.e2e-spec.ts
       /  \       Entegrasyon (orta) — modül + DB    — *.integration.spec.ts
      /____\      Birim (çok) — Service/Guard/util   — *.spec.ts
```

- **Birim:** İş mantığı izole; bağımlılıklar mock'lanır. En hızlı, en çok sayıda.
- **Entegrasyon:** Service + Repository + gerçek (test) PostgreSQL; transaction davranışı.
- **E2E:** HTTP üzerinden uçtan uca; kimlik, RBAC, gerçek akışlar.

---

## 2. Araçlar

| Amaç | Araç |
|------|------|
| Test koşucu | **Jest** (NestJS varsayılan) |
| HTTP/E2E | **Supertest** + `@nestjs/testing` |
| Test DB | Dockerized **PostgreSQL** (izole test şeması) veya Testcontainers |
| Mock | Jest mock + özel repository mock'ları |
| Kapsam | Jest `--coverage` (Istanbul) |
| Frontend | **Jest + React Testing Library**, E2E için **Playwright** |
| Yük/temel performans | k6 / autocannon (opsiyonel) |

---

## 3. Kapsam Hedefleri

| Katman | Satır kapsamı hedefi |
|--------|----------------------|
| Service (iş mantığı) | ≥ %90 |
| Guard / Filter / util (kritik) | ≥ %95 |
| Controller | ≥ %70 (E2E ile desteklenir) |
| Genel proje | ≥ %85 |

> Kapsam bir sonuçtur, amaç değildir. Hedef: kritik güvenlik ve iş mantığı yollarının **anlamlı** test edilmesi (yalnız satır sayısı değil, senaryo çeşitliliği).

---

## 4. Test Türleri ve Sorumluluk

### 4.1 Birim Testleri
- Service metotları (mutlu yol + hata yolları + sınır durumları).
- Guard'lar (`RolesGuard`, `PermissionsGuard`) izin matrisi.
- Saf yardımcılar: rank hesabı (Faz 3), tutar/vergi hesabı (Faz 4), HMAC imza (Faz 5).

### 4.2 Entegrasyon Testleri
- Repository + gerçek test DB: migration, transaction, benzersizlik kısıtları.
- Eşzamanlılık: rank taşıma (Faz 3), sıralı fatura numarası (Faz 4).
- Tenant filtre middleware (Faz 6).

### 4.3 E2E Testleri
- Kimlik akışı: register/login/refresh/logout (Faz 1).
- RBAC matrisi: rol × endpoint izin/ret (Faz 2).
- Lead Kanban move akışı (Faz 3).
- Fatura yaşam döngüsü + finansal maskeleme (Faz 4).
- Webhook gönderim/doğrulama, inbound (Faz 5).
- Multi-tenant izolasyon (Faz 6).

### 4.4 Güvenlik Testleri (her fazda)
- IDOR, privilege escalation, injection, JWT kurcalama, SSRF, enumeration.
- Negatif testler birinci sınıf vatandaştır (yalnız mutlu yol değil).

---

## 5. Test Verisi & Ortam

- Her test çalışması izole şema/transaction ile başlar; testler birbirini etkilemez.
- `beforeEach`/`afterEach` ile temizlik; deterministik seed.
- Sırlar test ortamında ayrı (`.env.test`); gerçek servis çağrısı yok (mail `simulated`, webhook mock alıcı).
- Saat/tarih ve rastgelelik test edilebilirlik için enjekte edilir (sabit clock, seedli rng).

---

## 6. RBAC Test Matrisi (örnek şablon)

Her korumalı endpoint için rol × beklenen sonuç tablosu doldurulur:

| Endpoint | ADMIN | MANAGER | SALES | FINANCE | VIEWER |
|----------|-------|---------|-------|---------|--------|
| `POST /users` | 201 | 403 | 403 | 403 | 403 |
| `POST /leads` | 201 | 201 | 201 | 403 | 403 |
| `GET /invoices` (tutar) | ✓ | ✗ | ✗ | ✓ | ✗ |
| `POST /invoices/:id/payments` | 200 | 403 | 403 | 200 | 403 |
| `POST /webhooks` | 201 | 201 | 403 | 403 | 403 |

> ✓/✗ = finansal alanların görünürlüğü. Bu matris Faz 2'den itibaren büyütülerek bakımı yapılır.

---

## 7. CI Entegrasyonu

```
push/PR →  lint  →  birim testleri  →  test DB ayağa kalkar  →  entegrasyon + E2E
        →  kapsam raporu (eşik altıysa FAIL)  →  npm audit + imaj taraması
```

- Kapsam eşiği altındaysa veya kritik açık varsa pipeline **kırılır** (merge engeli).
- Her faz birleştirilmeden önce kendi kabul kriterleri + test senaryoları yeşil olmalı.

---

## 8. Her Faz İçin "Tamamlandı" Tanımı (DoD)

Bir faz, ancak şunlar sağlandığında tamamlanmış sayılır:

- [ ] Kabul kriterlerinin tümü karşılandı.
- [ ] Birim + entegrasyon + (varsa) E2E testleri yazıldı ve yeşil.
- [ ] Güvenlik test senaryoları (negatif testler) geçti.
- [ ] Kapsam hedefleri karşılandı.
- [ ] Mimari ihlal yok (Prisma yalnız repo; Atomic Design katmanları).
- [ ] Dokümantasyon (bu klasör) güncel.
