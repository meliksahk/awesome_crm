// src/modules/whatsapp/whatsapp.repository.ts
// VERİ ERİŞİMİ: Prisma çağrıları YALNIZCA burada (WhatsAppMessage + telefon eşleme).
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WhatsAppRepository {
  constructor(private readonly prisma: PrismaService) {}

  createMessage(data: Prisma.WhatsAppMessageUncheckedCreateInput) {
    return this.prisma.whatsAppMessage.create({ data });
  }

  // Tenant scope middleware groupBy'ı kapsamaz → findMany + JS toplulaştırma (raporlarla tutarlı).
  listAll(take = 500) {
    return this.prisma.whatsAppMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  thread(phone: string, take = 100) {
    return this.prisma.whatsAppMessage.findMany({
      where: { phone },
      orderBy: { createdAt: 'asc' },
      take,
    });
  }

  // Telefonun son 10 hanesi ile lead/contact eşle (format farklarına dayanıklı).
  findLeadByPhoneTail(tail: string) {
    return this.prisma.lead.findFirst({
      where: { phone: { contains: tail } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findContactByPhoneTail(tail: string) {
    return this.prisma.contact.findFirst({
      where: { phone: { contains: tail } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
