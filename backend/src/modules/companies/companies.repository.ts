// src/modules/companies/companies.repository.ts
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CompaniesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.CompanyCreateInput) {
    return this.prisma.company.create({ data });
  }

  findById(id: string) {
    return this.prisma.company.findFirst({
      where: { id },
      include: { _count: { select: { contacts: true } } },
    });
  }

  async list(where: Prisma.CompanyWhereInput, skip: number, take: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.company.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { contacts: true } } },
      }),
      this.prisma.company.count({ where }),
    ]);
    return { items, total };
  }

  update(id: string, data: Prisma.CompanyUpdateInput) {
    return this.prisma.company.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.company.delete({ where: { id } });
  }
}
