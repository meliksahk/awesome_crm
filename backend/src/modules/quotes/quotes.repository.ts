// src/modules/quotes/quotes.repository.ts
// VERİ ERİŞİMİ: Prisma çağrıları YALNIZCA burada.
// Numara (QUO-yıl-seq) ON CONFLICT ile atomik; convert TEK transaction.
import { Injectable } from '@nestjs/common';
import { InvoiceStatus, Prisma, QuoteStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

interface LineItemData {
  productId?: string;
  description: string;
  quantity: Prisma.Decimal | string;
  unitPrice: Prisma.Decimal | string;
  lineTotal: Prisma.Decimal | string;
}

interface QuoteScalars {
  dealId?: string;
  customerName: string;
  customerEmail?: string;
  currency: string;
  subtotal: Prisma.Decimal;
  taxRate: Prisma.Decimal | string;
  taxAmount: Prisma.Decimal;
  total: Prisma.Decimal;
  validUntil?: Date;
  createdById: string;
}

@Injectable()
export class QuotesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(scalars: QuoteScalars, lineItems: LineItemData[]) {
    return this.prisma.quote.create({
      data: { ...scalars, lineItems: { create: lineItems } },
      include: { lineItems: true },
    });
  }

  findById(id: string) {
    return this.prisma.quote.findUnique({
      where: { id },
      include: { lineItems: true },
    });
  }

  async list(where: Prisma.QuoteWhereInput, skip: number, take: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.quote.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { lineItems: true },
      }),
      this.prisma.quote.count({ where }),
    ]);
    return { items, total };
  }

  replaceDraft(
    id: string,
    scalars: Omit<QuoteScalars, 'dealId' | 'createdById'>,
    lineItems: LineItemData[],
  ) {
    return this.prisma.quote.update({
      where: { id },
      data: { ...scalars, lineItems: { deleteMany: {}, create: lineItems } },
      include: { lineItems: true },
    });
  }

  // DRAFT → SENT: yıl sayacını atomik artırıp numara atar.
  async sendWithNumber(id: string, year: number) {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ lastNumber: number }[]>(Prisma.sql`
        INSERT INTO "QuoteCounter" ("year", "lastNumber") VALUES (${year}, 1)
        ON CONFLICT ("year")
        DO UPDATE SET "lastNumber" = "QuoteCounter"."lastNumber" + 1
        RETURNING "lastNumber";
      `);
      const seq = rows[0].lastNumber;
      const number = `QUO-${year}-${String(seq).padStart(6, '0')}`;
      return tx.quote.update({
        where: { id },
        data: { status: QuoteStatus.SENT, number },
        include: { lineItems: true },
      });
    });
  }

  setStatus(id: string, status: QuoteStatus) {
    return this.prisma.quote.update({
      where: { id },
      data: { status },
      include: { lineItems: true },
    });
  }

  // Kalemler cascade ile silinir.
  delete(id: string) {
    return this.prisma.quote.delete({ where: { id } });
  }

  // Teklifi faturaya çevirir: Invoice + kalemler oluştur, quote.status=CONVERTED,
  // convertedInvoiceId bağla. TEK transaction (atomiklik + idempotency).
  async convertToInvoice(params: {
    quoteId: string;
    invoice: {
      dealId?: string;
      customerName: string;
      customerEmail?: string;
      currency: string;
      subtotal: Prisma.Decimal;
      taxRate: Prisma.Decimal | string;
      taxAmount: Prisma.Decimal;
      total: Prisma.Decimal;
      createdById: string;
    };
    lineItems: {
      description: string;
      quantity: Prisma.Decimal | string;
      unitPrice: Prisma.Decimal | string;
      lineTotal: Prisma.Decimal | string;
    }[];
  }) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          ...params.invoice,
          status: InvoiceStatus.DRAFT,
          lineItems: { create: params.lineItems },
        },
        include: { lineItems: true, payments: true },
      });
      const quote = await tx.quote.update({
        where: { id: params.quoteId },
        data: {
          status: QuoteStatus.CONVERTED,
          convertedInvoiceId: invoice.id,
        },
        include: { lineItems: true },
      });
      return { invoice, quote };
    });
  }
}
