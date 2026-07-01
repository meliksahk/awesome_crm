// src/common/crypto/secret-crypto.service.spec.ts
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { SecretCryptoService } from './secret-crypto.service';

const keyB64 = randomBytes(32).toString('base64');
const svc = (key?: string) =>
  new SecretCryptoService({
    get: () => key,
  } as unknown as ConfigService);

describe('SecretCryptoService', () => {
  it('şifreler ve geri çözer (round-trip)', () => {
    const s = svc(keyB64);
    const enc = s.encrypt('gizli-token-123');
    expect(enc.startsWith('v1:')).toBe(true);
    expect(enc).not.toContain('gizli-token-123');
    expect(s.decrypt(enc)).toBe('gizli-token-123');
  });

  it('JSON sır nesnesini şifreler/çözer', () => {
    const s = svc(keyB64);
    const enc = s.encryptJson({ token: 'abc', phoneId: '42' });
    expect(s.decryptJson(enc)).toEqual({ token: 'abc', phoneId: '42' });
  });

  it('kurcalanmış şifreyi reddeder (GCM auth)', () => {
    const s = svc(keyB64);
    const enc = s.encrypt('x');
    const tampered = enc.slice(0, -4) + (enc.endsWith('A') ? 'B' : 'A') + '==';
    expect(() => s.decrypt(tampered)).toThrow();
  });

  it('anahtar yoksa isConfigured=false ve encrypt hata', () => {
    const s = svc(undefined);
    expect(s.isConfigured()).toBe(false);
    expect(() => s.encrypt('x')).toThrow();
  });

  it('yanlış uzunluktaki anahtarı reddeder', () => {
    const s = svc(Buffer.from('short').toString('base64'));
    expect(() => s.encrypt('x')).toThrow();
  });
});
