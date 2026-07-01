// src/modules/connections/provider-catalog.ts
// Entegrasyon provider kataloğu + bağlantı testi. secret=true alanlar şifreli saklanır,
// diğerleri (config) düz. available=false → panelde "yakında" (henüz bağlanamaz).

export interface ProviderField {
  key: string;
  label: string;
  secret: boolean;
  required: boolean;
  placeholder?: string;
}

export interface ProviderDef {
  key: string;
  name: string;
  category: string; // messaging | payments | accounting | ...
  authType: 'api_key' | 'oauth2';
  available: boolean;
  testable: boolean;
  fields: ProviderField[];
}

export const PROVIDERS: ProviderDef[] = [
  {
    key: 'whatsapp',
    name: 'WhatsApp Business',
    category: 'messaging',
    authType: 'api_key',
    available: true,
    testable: true,
    fields: [
      {
        key: 'accessToken',
        label: 'Access Token',
        secret: true,
        required: true,
      },
      {
        key: 'phoneNumberId',
        label: 'Phone Number ID',
        secret: false,
        required: true,
      },
    ],
  },
  {
    key: 'stripe',
    name: 'Stripe',
    category: 'payments',
    authType: 'api_key',
    available: true,
    testable: true,
    fields: [
      {
        key: 'secretKey',
        label: 'Secret Key (sk_...)',
        secret: true,
        required: true,
      },
    ],
  },
  // OAuth2 tabanlılar — çatı hazır; akış sonraki fazda (V3.2/V3.3).
  {
    key: 'quickbooks',
    name: 'QuickBooks Online',
    category: 'accounting',
    authType: 'oauth2',
    available: false,
    testable: false,
    fields: [],
  },
  {
    key: 'xero',
    name: 'Xero',
    category: 'accounting',
    authType: 'oauth2',
    available: false,
    testable: false,
    fields: [],
  },
  {
    key: 'iyzico',
    name: 'iyzico',
    category: 'payments',
    authType: 'api_key',
    available: false,
    testable: false,
    fields: [],
  },
];

export function findProvider(key: string): ProviderDef | undefined {
  return PROVIDERS.find((p) => p.key === key);
}

// Bağlantı testi — sağlayıcının kimlik bilgileriyle hafif bir "ping".
export async function testConnection(
  provider: string,
  secrets: Record<string, string>,
  config: Record<string, unknown>,
): Promise<{ ok: boolean; message: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    if (provider === 'whatsapp') {
      const res = await fetch(
        `https://graph.facebook.com/v20.0/${String(config.phoneNumberId)}`,
        {
          headers: { Authorization: `Bearer ${secrets.accessToken}` },
          signal: controller.signal,
        },
      );
      return res.ok
        ? { ok: true, message: 'WhatsApp bağlantısı doğrulandı.' }
        : { ok: false, message: `WhatsApp hata: HTTP ${res.status}` };
    }
    if (provider === 'stripe') {
      const res = await fetch('https://api.stripe.com/v1/account', {
        headers: { Authorization: `Bearer ${secrets.secretKey}` },
        signal: controller.signal,
      });
      return res.ok
        ? { ok: true, message: 'Stripe bağlantısı doğrulandı.' }
        : { ok: false, message: `Stripe hata: HTTP ${res.status}` };
    }
    return { ok: false, message: 'Bu sağlayıcı için test yok.' };
  } catch (e) {
    return {
      ok: false,
      message: `Test başarısız: ${(e as Error).message}`,
    };
  } finally {
    clearTimeout(timer);
  }
}
