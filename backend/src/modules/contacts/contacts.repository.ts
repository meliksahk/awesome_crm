// src/modules/contacts/contacts.repository.ts
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const includeCompany = {
  company: { select: { id: true, name: true } },
} satisfies Prisma.ContactInclude;

@Injectable()
export class ContactsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ContactCreateInput) {
    return this.prisma.contact.create({ data, include: includeCompany });
  }

  findById(id: string) {
    return this.prisma.contact.findFirst({
      where: { id },
      include: includeCompany,
    });
  }

  companyExists(id: string) {
    return this.prisma.company.findFirst({
      where: { id },
      select: { id: true },
    });
  }

  async list(where: Prisma.ContactWhereInput, skip: number, take: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.contact.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: includeCompany,
      }),
      this.prisma.contact.count({ where }),
    ]);
    return { items, total };
  }

  update(id: string, data: Prisma.ContactUpdateInput) {
    return this.prisma.contact.update({
      where: { id },
      data,
      include: includeCompany,
    });
  }

  delete(id: string) {
    return this.prisma.contact.delete({ where: { id } });
  }
}
