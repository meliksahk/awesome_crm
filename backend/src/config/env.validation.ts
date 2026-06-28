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
});
