// src/modules/products/products.repository.ts
// VERİ ERİŞİMİ: Prisma çağrıları YALNIZCA burada.
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ProductCreateInput) {
    return this.prisma.product.create({ data });
  }

  // Silinmemiş ürün.
  findById(id: string) {
    return this.prisma.product.findFirst({ where: { id, deletedAt: null } });
  }

  findBySku(sku: string) {
    return this.prisma.product.findUnique({ where: { sku } });
  }

  update(id: string, data: Prisma.ProductUpdateInput) {
    return this.prisma.product.update({ where: { id }, data });
  }

  softDelete(id: string) {
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });
  }

  async list(where: Prisma.ProductWhereInput, skip: number, take: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);
    return { items, total };
  }
}
