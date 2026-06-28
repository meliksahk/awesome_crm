# Katkı Rehberi

Açık Kaynak CRM'e katkıda bulunduğunuz için teşekkürler!

## Geliştirme Akışı

1. Repoyu fork'layın ve `feature/<kısa-ad>` dalı açın.
2. İlgili faz dokümanını (`docs/0X-...`) ve [Mimari Genel Bakış](./docs/00-mimari-genel-bakis.md)'ı okuyun.
3. Değişikliği yapın; **mimari kurallara** uyun (aşağı bkz.).
4. `npm run lint && npm run test && npm run test:e2e` yeşil olmalı.
5. Anlamlı commit mesajı (NE + NEDEN). PR açın; kabul kriterlerini işaretleyin.

## Değişmez Mimari Kuralları

- **Katmanlı mimari:** `Controller → Service → Repository`. Controller'da iş mantığı yok;
  `prisma.*` çağrısı **yalnızca** Repository'de.
- **Secure by default:** Tüm endpoint korumalı; herkese açık olanlar bilinçli `@Public()`.
- **DTO + validation:** Tüm girdiler class-validator DTO'larından geçer.
- **Sırlar `.env`'de;** koda gömülmez. Parola/token/PII loglanmaz.
- **Frontend:** Atomic Design katmanları (Atoms → Molecules → Organisms → Templates → Pages).

## Test Beklentisi

Her değişiklik mutlu yol **ve** hata/güvenlik (negatif) yollarını test etmelidir.
Kapsam hedefleri ve test piramidi: [Test Stratejisi](./docs/91-test-stratejisi.md).

## Davranış Kuralları

Saygılı, yapıcı ve kapsayıcı olun. Taciz veya ayrımcılığa yer yoktur.
