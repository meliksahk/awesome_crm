// src/modules/reports/reports.repository.ts
// VERİ ERİŞİMİ: rapor toplulaştırmaları (Prisma groupBy/aggregate).
import { Injectable } from '@nestjs/common';
import { DealStatus, InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  stages(pipelineId: string) {
    return this.prisma.stage.findMany({
      where: { pipelineId },
      orderBy: { position: 'asc' },
    });
  }

  dealsByStage(pipelineId: string) {
    return this.prisma.deal.groupBy({
      by: ['stageId'],
      where: { pipelineId, deletedAt: null, status: DealStatus.OPEN },
      _count: { _all: true },
      _sum: { value: true },
    });
  }

  dealsByStatus() {
    return this.prisma.deal.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { _all: true },
      _sum: { value: true },
    });
  }

  // Forecast için: açık deal'ler + stage pozisyonu.
  openDeals() {
    return this.prisma.deal.findMany({
      where: { deletedAt: null, status: DealStatus.OPEN },
      select: {
        value: true,
        stage: { select: { position: true, pipelineId: true } },
      },
    });
  }

  stageCountByPipeline() {
    return this.prisma.stage.groupBy({
      by: ['pipelineId'],
      _count: { _all: true },
    });
  }

  async invoiceTotals() {
    const all = await this.prisma.invoice.aggregate({
      where: { status: { not: InvoiceStatus.CANCELLED } },
      _sum: { total: true, amountPaid: true },
    });
    return all;
  }

  // --- Yeni raporlar ---
  // Not: groupBy tenant middleware'inde scope EDİLMEZ → findMany kullanılır (scope güvenli),
  // toplulaştırma servis katmanında JS ile (demo ölçeğinde yeterli).

  nonCancelledInvoices() {
    return this.prisma.invoice.findMany({
      where: { status: { not: InvoiceStatus.CANCELLED } },
      select: {
        total: true,
        amountPaid: true,
        issuedAt: true,
        createdAt: true,
      },
    });
  }

  allDeals() {
    return this.prisma.deal.findMany({
      where: { deletedAt: null },
      select: { ownerId: true, status: true, value: true, updatedAt: true },
    });
  }

  usersByIds(ids: string[]) {
    return this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
  }

  quoteLinesWithProduct() {
    return this.prisma.quoteLineItem.findMany({
      where: { productId: { not: null } },
      select: { productId: true, lineTotal: true, quantity: true },
    });
  }

  productsByIds(ids: string[]) {
    return this.prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
  }
}
