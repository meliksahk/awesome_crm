// src/modules/pipelines/pipelines.repository.ts
// VERİ ERİŞİMİ: Prisma çağrıları YALNIZCA burada (Pipeline + Stage).
// Not: Pipeline/Stage tenant kapsamlı DEĞİL (paylaşımlı yapılandırma); erişim RBAC ile.
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PipelinesRepository {
  constructor(private readonly prisma: PrismaService) {}

  listPipelines() {
    return this.prisma.pipeline.findMany({
      orderBy: { createdAt: 'asc' },
      include: { stages: { orderBy: { position: 'asc' } } },
    });
  }

  findPipelineById(id: string) {
    return this.prisma.pipeline.findUnique({ where: { id } });
  }

  findStageById(id: string) {
    return this.prisma.stage.findUnique({ where: { id } });
  }

  listStages(pipelineId: string) {
    return this.prisma.stage.findMany({
      where: { pipelineId },
      orderBy: { position: 'asc' },
    });
  }

  async maxPosition(pipelineId: string): Promise<number> {
    const agg = await this.prisma.stage.aggregate({
      where: { pipelineId },
      _max: { position: true },
    });
    return agg._max.position ?? -1;
  }

  countStages(pipelineId: string) {
    return this.prisma.stage.count({ where: { pipelineId } });
  }

  createStage(data: Prisma.StageUncheckedCreateInput) {
    return this.prisma.stage.create({ data });
  }

  updateStage(id: string, data: Prisma.StageUpdateInput) {
    return this.prisma.stage.update({ where: { id }, data });
  }

  deleteStage(id: string) {
    return this.prisma.stage.delete({ where: { id } });
  }

  // Soft-delete edilmiş deal'ler de FK ile stage'e bağlı kalır → stage silinemez.
  // Bu yüzden TÜM deal satırları sayılır (aktif + soft-deleted) → temiz 409, FK 500 değil.
  countDealsInStage(stageId: string) {
    return this.prisma.deal.count({ where: { stageId } });
  }

  // Yeniden sıralama: @@unique([pipelineId, position]) çakışmasını önlemek için iki geçiş.
  // 1) geçici yüksek pozisyonlar → 2) nihai 0..n. Tek transaction.
  async reorder(pipelineId: string, stageIds: string[]) {
    return this.prisma.$transaction(async (tx) => {
      for (let i = 0; i < stageIds.length; i++) {
        await tx.stage.update({
          where: { id: stageIds[i] },
          data: { position: 1000 + i },
        });
      }
      for (let i = 0; i < stageIds.length; i++) {
        await tx.stage.update({
          where: { id: stageIds[i] },
          data: { position: i },
        });
      }
      return tx.stage.findMany({
        where: { pipelineId },
        orderBy: { position: 'asc' },
      });
    });
  }
}
