// src/modules/connections/connections.repository.ts
// VERİ ERİŞİMİ: Prisma çağrıları YALNIZCA burada (Connection). Tenant scope middleware'de.
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ConnectionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ConnectionUncheckedCreateInput) {
    return this.prisma.connection.create({ data });
  }

  findById(id: string) {
    return this.prisma.connection.findFirst({ where: { id } });
  }

  findByProvider(provider: string) {
    return this.prisma.connection.findFirst({ where: { provider } });
  }

  list() {
    return this.prisma.connection.findMany({ orderBy: { createdAt: 'desc' } });
  }

  update(id: string, data: Prisma.ConnectionUpdateInput) {
    return this.prisma.connection.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.connection.delete({ where: { id } });
  }
}
