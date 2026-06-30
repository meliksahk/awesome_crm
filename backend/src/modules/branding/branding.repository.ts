// src/modules/branding/branding.repository.ts
// VERİ ERİŞİMİ: Prisma çağrıları YALNIZCA burada (tekil Branding satırı).
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const ID = 'singleton';

@Injectable()
export class BrandingRepository {
  constructor(private readonly prisma: PrismaService) {}

  get() {
    return this.prisma.branding.findUnique({ where: { id: ID } });
  }

  upsert(data: { appName?: string | null; logo?: string | null }) {
    return this.prisma.branding.upsert({
      where: { id: ID },
      create: { id: ID, ...data } as Prisma.BrandingCreateInput,
      update: data,
    });
  }
}
