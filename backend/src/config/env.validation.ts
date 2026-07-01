// src/config/env.validation.ts
// Ortam değişkenleri başlangıçta Joi ile doğrulanır (fail-fast):
// eksik/yanlış değişkende uygulama açılmaz.
import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().default(3000),

  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),

  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string()
    .min(16)
    .required()
    .invalid(Joi.ref('JWT_ACCESS_SECRET')) // access ve refresh sırrı farklı olmalı
    .messages({
      'any.invalid': 'JWT_REFRESH_SECRET, JWT_ACCESS_SECRET ile aynı olamaz.',
    }),
  JWT_ACCESS_TTL: Joi.string().default('15m'),
  JWT_REFRESH_TTL: Joi.string().default('7d'),

  BCRYPT_COST: Joi.number().min(10).max(15).default(12),

  CORS_ORIGINS: Joi.string().default('http://localhost:3001'),
  COOKIE_SECURE: Joi.boolean().default(false),

  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(5),

  SEED_ADMIN_EMAIL: Joi.string().email().optional(),
  SEED_ADMIN_PASSWORD: Joi.string().optional(),

  // --- Faz 5: Entegrasyonlar ---
  MAIL_DRIVER: Joi.string().valid('simulated', 'smtp').default('simulated'),
  // Giden webhook için özel ağ/http'ye izin (test/self-host; üretimde false).
  WEBHOOK_ALLOW_PRIVATE: Joi.boolean().default(false),
  // Gelen webhook HMAC doğrulama sırrı (opsiyonel; yoksa inbound 400).
  INBOUND_WEBHOOK_SECRET: Joi.string().allow('').optional(),

  // --- v2.2: SMTP (MAIL_DRIVER=smtp ise) ---
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().optional(),
  SMTP_SECURE: Joi.boolean().optional(),
  SMTP_USER: Joi.string().allow('').optional(),
  SMTP_PASS: Joi.string().allow('').optional(),
  SMTP_FROM: Joi.string().optional(),

  // --- v2.6: AI (Claude) opsiyonel ---
  ANTHROPIC_API_KEY: Joi.string().allow('').optional(),
  AI_MODEL: Joi.string().optional(),

  // --- v3.0: Entegrasyon bağlantıları — panel sırlarını AES-256-GCM ile şifreler.
  // base64 kodlu 32 baytlık anahtar. Yoksa bağlantı sır işlemleri açık hata döner (fail-safe).
  APP_ENCRYPTION_KEY: Joi.string().allow('').optional(),
});
