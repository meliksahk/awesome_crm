// src/common/decorators/public.decorator.ts
// Bir endpoint'i global JwtAuthGuard'dan muaf tutar (secure-by-default bilinçli istisnası).
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
