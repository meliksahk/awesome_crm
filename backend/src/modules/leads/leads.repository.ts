// src/modules/leads/leads.repository.ts
// VERİ ERİŞİMİ: Prisma çağrıları YALNIZCA burada. Move tek transaction (atomiklik).
import { Injectable } from '@nestjs/common';
import { LeadStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LeadsRepository {
  constructor(private readonly prisma: PrismaService) {}

  getStage(id: string) {
    return this.prisma.stage.findUnique({ where: { id } });
  }

  getPipeline(id: string) {
    return this.prisma.pipeline.findUnique({ where: { id } });
  }

  userExists(id: string) {
    return this.prisma.user.findUnique({ where: { id }, select: { id: true } });
  }

  // Silinmemiş lead.
  getLead(id: string) {
    return this.prisma.lead.findFirst({
      where: { id, deletedAt: null },
      include: { stage: true, owner: { select: { id: true } } },
    });
  }

  async maxRankInStage(stageId: string): Promise<number | null> {
    const res = await this.prisma.lead.aggregate({
      where: { stageId, deletedAt: null },
      _max: { rank: true },
    });
    return res._max.rank ? Number(res._max.rank) : null;
  }

  create(data: Prisma.LeadCreateInput) {
    return this.prisma.lead.create({
      data,
      include: { stage: true, owner: { select: { id: true } } },
    });
  }

  update(id: string, data: Prisma.LeadUpdateInput) {
    return this.prisma.lead.update({
      where: { id },
      data,
      include: { stage: true, owner: { select: { id: true } } },
    });
  }

  softDelete(id: string) {
    return this.prisma.lead.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  setOwner(id: string, ownerId: string | null) {
    return this.prisma.lead.update({
      where: { id },
      data: { ownerId },
      include: { stage: true, owner: { select: { id: true } } },
    });
  }

  // Aşama+sıra değişimi + aktivite kaydı TEK transaction'da.
  async applyMove(params: {
    id: string;
    toStageId: string;
    rank: number;
    status: LeadStatus;
    fromStageId: string;
    userId: string;
  }) {
    const [lead] = await this.prisma.$transaction([
      this.prisma.lead.update({
        where: { id: params.id },
        data: {
          stageId: params.toStageId,
          rank: params.rank,
          status: params.status,
        },
        include: { stage: true, owner: { select: { id: true } } },
      }),
      this.prisma.leadActivity.create({
        data: {
          leadId: params.id,
          userId: params.userId,
          type: 'STAGE_CHANGE',
          payload: { from: params.fromStageId, to: params.toStageId },
        },
      }),
    ]);
    return lead;
  }

  board(pipelineId: string) {
    return this.prisma.stage.findMany({
      where: { pipelineId },
      orderBy: { position: 'asc' },
      include: {
        leads: {
          where: { deletedAt: null },
          orderBy: { rank: 'asc' },
        },
      },
    });
  }

  async list(where: Prisma.LeadWhereInput, skip: number, take: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.lead.findMany({
        where,
        skip,
        take,
        orderBy: [{ stageId: 'asc' }, { rank: 'asc' }],
        include: { stage: true, owner: { select: { id: true } } },
      }),
      this.prisma.lead.count({ where }),
    ]);
    return { items, total };
  }

  addActivity(
    leadId: string,
    userId: string,
    type: string,
    payload: Prisma.InputJsonValue | undefined,
  ) {
    return this.prisma.leadActivity.create({
      data: { leadId, userId, type, payload },
    });
  }

  getActivities(leadId: string) {
    return this.prisma.leadActivity.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
