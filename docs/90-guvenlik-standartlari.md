# Güvenlik Standartları (Tüm Fazlar İçin Geçerli)

Bu doküman, her fazda uyulması zorunlu güvenlik temelini tanımlar. Her fazın kendi güvenlik bölümü bunu somutlaştırır. Referans çerçeve: **OWASP Top 10 (2021)** ve **OWASP ASVS**.

---

## 1. OWASP Top 10 Eşlemesi

| OWASP Riski | Bu projedeki karşılık |
|-------------|------------------------|
| A01 Broken Access Control | RBAC Guard'ları (Faz 2), IDOR kontrolleri, tenant izolasyonu (Faz 6), finansal izolasyon (Faz 4) |
| A02 Cryptographic Failures | bcrypt (cost≥12), JWT güçlü sırlar, refresh hash'li saklama, HTTPS/HSTS, secret'lar şifreli |
| A03 Injection | Prisma parametrik sorgular, class-validator DTO, whitelist, mail header temizleme |
| A04 Insecure Design | Katmanlı mimari, secure-by-default, görev ayrımı, threat modeling her fazda |
| A05 Security Misconfiguration | Helmet, CORS allowlist, fail-fast env (Joi), root'suz konteyner, DB ağ izolasyonu |
| A06 Vulnerable Components | `npm audit`, Dependabot, imaj zafiyet taraması (trivy) |
| A07 Auth Failures | Rate limit, brute-force koruması, token rotasyonu, generic hata mesajları |
| A08 Data Integrity Failures | Fatura immutability, webhook HMAC imzası, idempotency |
| A09 Logging & Monitoring | Yapılandırılmış log, audit izi, hassas veri loglanmaz, correlation id |
| A10 SSRF | Webhook URL allowlist, iç IP engeli (Faz 5) |

---

## 2. Kimlik Doğrulama & Oturum

- Parola: bcrypt cost ≥ 12; minimum 10 karakter + karmaşıklık.
- Access token kısa ömürlü (15 dk), refresh httpOnly+Secure+SameSite=Strict cookie.
- Refresh rotasyonu + reuse detection (çalıntı tespitinde tüm oturum iptali).
- Login ve hassas endpoint'lerde rate limit (`@nestjs/throttler`).
- Kullanıcı enumeration engeli: tek tip "geçersiz kimlik bilgileri" mesajı, sabit zamanlı karşılaştırma.

---

## 3. Yetkilendirme

- Secure by default: tüm endpoint korumalı; `@Public()` ile açık olanlar bilinçli.
- İki katman: rol (`@Roles`) + izin (`@Permissions`), AND mantığı.
- Yetkiler her istekte güncel kaynaktan; token'a körü körüne güvenilmez.
- IDOR: her `:id` parametresi yetki + sahiplik + tenant kontrolünden geçer.
- Privilege escalation engeli; görev ayrımı (SALES ≠ FINANCE).
- Son admin koruması.

---

## 4. Girdi Doğrulama & Çıktı Kodlama

- Global `ValidationPipe`: `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`.
- Tüm DTO'lar class-validator ile; UUID/email/sayı tipleri katı.
- Mass assignment engeli (whitelist + açık alan kontrolü).
- Parasal değerler `Decimal`; float kullanılmaz.
- Çıktıda finansal/PII alanları izne göre `class-transformer` ile kesilir.

---

## 5. Veri Koruma

- Düz parola/secret/token hiçbir yerde (log/DB/yanıt) görünmez.
- Refresh token, webhook secret → hash'li/şifreli saklanır.
- Hassas alanlar at-rest şifreleme (DB/disk düzeyi) ile korunur.
- PII minimizasyonu: yalnız gerekli veri tutulur ve gönderilir.
- Yedekleme ve veri saklama politikası tanımlı.

---

## 6. HTTP Sertleştirme (main.ts)

```ts
// backend/src/main.ts (güvenlik kurulumu özeti)
app.use(helmet());                         // güvenlik başlıkları + HSTS
app.enableCors({ origin: ALLOWLIST, credentials: true });
app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
app.useGlobalFilters(new AllExceptionsFilter());
// @nestjs/throttler global rate limit
// cookie-parser (refresh cookie için)
```

- CORS: yalnız bilinen origin'ler; `*` yasak (credentials ile birlikte).
- Body limit (örn. 1 MB) → payload DoS engeli.
- HTTPS zorunlu; HTTP→HTTPS yönlendirme (ters proxy).

---

## 7. Hata Yönetimi & Loglama

- Global `AllExceptionsFilter` tüm hataları yakalar, tutarlı zarfa sarar.
- Production'da stack trace / SQL / iç detay **sızdırılmaz**; yalnız sunucu loguna.
- Yapılandırılmış (JSON) log + correlation/request id.
- Audit log: kimlik, RBAC değişimi, fatura işlemleri, webhook teslimatı (kim, ne, ne zaman).
- Loglarda parola/token/secret/PII maskelenir.

---

## 8. Bağımlılık & Tedarik Zinciri

- `npm ci` ile kilitli kurulum; `npm audit` CI'da.
- Otomatik bağımlılık güncelleme (Dependabot/Renovate).
- Docker imaj zafiyet taraması (trivy/grype).
- Minimal temel imaj (alpine), root'suz konteyner.

---

## 9. Faz Bazlı Güvenlik Özeti

| Faz | Öne çıkan güvenlik teması |
|-----|---------------------------|
| 1 | Parola/bcrypt, JWT rotasyonu, enumeration & timing engeli |
| 2 | RBAC, privilege escalation & IDOR, görev ayrımı, son admin |
| 3 | Sahiplik, cross-pipeline & race condition, Decimal |
| 4 | Finansal izolasyon, immutability, sunucu tarafı hesap, sıralı numara |
| 5 | HMAC imza, replay engeli, SSRF, mail injection |
| 6 | Konteyner sertleştirme, ağ izolasyonu, tenant izolasyonu (+RLS) |

---

## 10. Sürüm Öncesi Güvenlik Kontrol Listesi

- [ ] Tüm endpoint'ler yetki kontrolünden geçiyor (secure by default).
- [ ] Sırlar env/secret manager'da; repoda/imajda yok.
- [ ] Rate limit ve brute-force koruması aktif.
- [ ] Hata yanıtları iç detay sızdırmıyor.
- [ ] `npm audit` ve imaj taraması temiz (kritik açık yok).
- [ ] PII/secret loglanmıyor.
- [ ] CORS allowlist ve HTTPS/HSTS aktif.
- [ ] IDOR/tenant izolasyon testleri yeşil.
