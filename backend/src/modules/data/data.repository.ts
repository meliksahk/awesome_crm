// src/modules/data/data.repository.ts
// VERİ ERİŞİMİ: Prisma çağrıları YALNIZCA burada. Birleştirme tek transaction.
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DataRepository {
  constructor(private readonly prisma: PrismaService) {}

  // --- Export kaynakları ---

  listContacts() {
    return this.prisma.contact.findMany({
      orderBy: { createdAt: 'desc' },
      include: { company: { select: { name: true } } },
    });
  }

  listCompanies() {
    return this.prisma.company.findMany({ orderBy: { createdAt: 'desc' } });
  }

  listDeals() {
    return this.prisma.deal.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { stage: { select: { name: true } } },
    });
  }

  // --- Import yardımcıları ---

  findContactByEmail(email: string) {
    return this.prisma.contact.findFirst({ where: { email } });
  }

  createContact(data: Prisma.ContactCreateInput) {
    return this.prisma.contact.create({ data });
  }

  findCompanyByName(name: string) {
    return this.prisma.company.findFirst({ where: { name } });
  }

  createCompany(data: Prisma.CompanyCreateInput) {
    return this.prisma.company.create({ data });
  }

  // --- Duplicate tespiti ---

  async duplicateContacts() {
    const groups = await this.prisma.contact.groupBy({
      by: ['email'],
      where: { email: { not: null } },
      _count: { _all: true },
      having: { email: { _count: { gt: 1 } } },
    });
    const result: { email: string; count: number; ids: string[] }[] = [];
    for (const g of groups) {
      const rows = await this.prisma.contact.findMany({
        where: { email: g.email },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      });
      result.push({
        email: g.email as string,
        count: g._count._all,
        ids: rows.map((r) => r.id),
      });
    }
    return result;
  }

  async duplicateCompanies() {
    const groups = await this.prisma.company.groupBy({
      by: ['name'],
      _count: { _all: true },
      having: { name: { _count: { gt: 1 } } },
    });
    const result: { name: string; count: number; ids: string[] }[] = [];
    for (const g of groups) {
      const rows = await this.prisma.company.findMany({
        where: { name: g.name },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      });
      result.push({
        name: g.name,
        count: g._count._all,
        ids: rows.map((r) => r.id),
      });
    }
    return result;
  }

  // --- Birleştirme (kaynak → hedef) ---

  getContact(id: string) {
    return this.prisma.contact.findUnique({ where: { id } });
  }

  getCompany(id: string) {
    return this.prisma.company.findUnique({ where: { id } });
  }

  // Kaynağın deal'lerini hedefe taşı, kaynağı sil — tek transaction.
  async mergeContacts(targetId: string, sourceId: string) {
    return this.prisma.$transaction(async (tx) => {
      const moved = await tx.deal.updateMany({
        where: { contactId: sourceId },
        data: { contactId: targetId },
      });
      await tx.contact.delete({ where: { id: sourceId } });
      return { movedDeals: moved.count };
    });
  }

  // Kaynak şirketin kişilerini + deal'lerini hedefe taşı, kaynağı sil.
  async mergeCompanies(targetId: string, sourceId: string) {
    return this.prisma.$transaction(async (tx) => {
      const movedContacts = await tx.contact.updateMany({
        where: { companyId: sourceId },
        data: { companyId: targetId },
      });
      const movedDeals = await tx.deal.updateMany({
        where: { companyId: sourceId },
        data: { companyId: targetId },
      });
      await tx.company.delete({ where: { id: sourceId } });
      return {
        movedContacts: movedContacts.count,
        movedDeals: movedDeals.count,
      };
    });
  }
}
