// src/modules/leads/leads.service.ts
// İŞ MANTIĞI: Lead CRUD, Kanban board, atomik move (rank), sahiplik tabanlı erişim.
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { LeadStatus, Prisma } from '@prisma/client';
import { ROLE_NAMES } from '../../common/constants/permission.enum';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { LeadsRepository } from './leads.repository';
import { computeRank, RANK_GAP } from './rank.util';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { MoveLeadDto } from './dto/move-lead.dto';
import { AssignLeadDto } from './dto/assign-lead.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { QueryLeadDto } from './dto/query-lead.dto';

// Tüm lead'lere yazabilen roller (sahiplikten bağımsız).
const MANAGE_ALL_ROLES: string[] = [ROLE_NAMES.ADMIN, ROLE_NAMES.MANAGER];

interface LeadRecord {
  id: string;
  pipelineId: string;
  stageId: string;
  title: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  value: Prisma.Decimal | null;
  currency: string;
  rank: Prisma.Decimal;
  ownerId: string | null;
  status: LeadStatus;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(private readonly repo: LeadsRepository) {}

  async create(dto: CreateLeadDto, actor: AuthenticatedUser) {
    const stage = await this.repo.getStage(dto.stageId);
    if (!stage) {
      throw new BadRequestException('Geçersiz stageId.');
    }
    // Pipeline tutarlılığı: stage verilen pipeline'a ait olmalı.
    if (stage.pipelineId !== dto.pipelineId) {
      throw new BadRequestException("Stage, belirtilen pipeline'a ait değil.");
    }

    // Yeni kart sütunun sonuna yerleşir.
    const maxRank = await this.repo.maxRankInStage(dto.stageId);
    const rank = (maxRank ?? 0) + RANK_GAP;

    const created = await this.repo.create({
      title: dto.title,
      contactName: dto.contactName,
      email: dto.email,
      phone: dto.phone,
      company: dto.company,
      value: dto.value ?? null,
      currency: dto.currency ?? 'TRY',
      rank,
      status: LeadStatus.OPEN,
      pipeline: { connect: { id: dto.pipelineId } },
      stage: { connect: { id: dto.stageId } },
      // Oluşturan kullanıcı varsayılan sahip olur.
      owner: { connect: { id: actor.id } },
    });
    this.logger.log(`lead.create by=${actor.id} lead=${created.id}`);
    return this.toView(created as LeadRecord);
  }

  async findBoard(pipelineId: string) {
    const pipeline = await this.repo.getPipeline(pipelineId);
    if (!pipeline) {
      throw new NotFoundException('Pipeline bulunamadı');
    }
    const stages = await this.repo.board(pipelineId);
    return {
      pipelineId,
      stages: stages.map((s) => ({
        id: s.id,
        name: s.name,
        position: s.position,
        isWon: s.isWon,
        isLost: s.isLost,
        leads: s.leads.map((l) => this.toView(l as LeadRecord)),
      })),
    };
  }

  async findAll(q: QueryLeadDto) {
    const where: Prisma.LeadWhereInput = { deletedAt: null };
    if (q.pipelineId) where.pipelineId = q.pipelineId;
    if (q.stageId) where.stageId = q.stageId;
    if (q.status) where.status = q.status as LeadStatus;
    if (q.q) {
      // Prisma parametrik → injection yok.
      where.OR = [
        { title: { contains: q.q, mode: 'insensitive' } },
        { company: { contains: q.q, mode: 'insensitive' } },
        { contactName: { contains: q.q, mode: 'insensitive' } },
      ];
    }
    const { items, total } = await this.repo.list(where, q.skip, q.limit);
    return {
      data: (items as LeadRecord[]).map((l) => this.toView(l)),
      meta: { page: q.page, limit: q.limit, total },
    };
  }

  async findOne(id: string) {
    const lead = await this.getLeadOrThrow(id);
    const activities = await this.repo.getActivities(id);
    return { ...this.toView(lead as LeadRecord), activities };
  }

  async update(id: string, dto: UpdateLeadDto, actor: AuthenticatedUser) {
    const lead = await this.getLeadOrThrow(id);
    this.assertCanWrite(lead, actor);
    const updated = await this.repo.update(id, {
      title: dto.title,
      contactName: dto.contactName,
      email: dto.email,
      phone: dto.phone,
      company: dto.company,
      value: dto.value ?? undefined,
      currency: dto.currency,
    });
    return this.toView(updated as LeadRecord);
  }

  async move(id: string, dto: MoveLeadDto, actor: AuthenticatedUser) {
    const lead = await this.getLeadOrThrow(id);
    this.assertCanWrite(lead, actor);

    const toStage = await this.repo.getStage(dto.toStageId);
    if (!toStage) {
      throw new BadRequestException('Geçersiz hedef stage.');
    }
    // Cross-pipeline taşıma engeli.
    if (toStage.pipelineId !== lead.pipelineId) {
      throw new BadRequestException(
        "Lead farklı bir pipeline'ın stage'ine taşınamaz.",
      );
    }

    const beforeRank = await this.resolveNeighborRank(
      dto.beforeLeadId,
      dto.toStageId,
    );
    const afterRank = await this.resolveNeighborRank(
      dto.afterLeadId,
      dto.toStageId,
    );

    let rank: number;
    if (beforeRank === null && afterRank === null) {
      const maxRank = await this.repo.maxRankInStage(dto.toStageId);
      rank = (maxRank ?? 0) + RANK_GAP;
    } else {
      rank = computeRank(beforeRank, afterRank);
    }

    const status = toStage.isWon
      ? LeadStatus.WON
      : toStage.isLost
        ? LeadStatus.LOST
        : LeadStatus.OPEN;

    const moved = await this.repo.applyMove({
      id,
      toStageId: dto.toStageId,
      rank,
      status,
      fromStageId: lead.stageId,
      userId: actor.id,
    });
    this.logger.log(
      `lead.move by=${actor.id} lead=${id} ${lead.stageId}->${dto.toStageId} rank=${rank}`,
    );
    return this.toView(moved as LeadRecord);
  }

  async assign(id: string, dto: AssignLeadDto, actor: AuthenticatedUser) {
    const lead = await this.getLeadOrThrow(id);
    this.assertCanWrite(lead, actor);
    const ownerId = dto.ownerId ?? null;
    if (ownerId) {
      const exists = await this.repo.userExists(ownerId);
      if (!exists) {
        throw new BadRequestException('Atanacak kullanıcı bulunamadı.');
      }
    }
    const updated = await this.repo.setOwner(id, ownerId);
    this.logger.log(`lead.assign by=${actor.id} lead=${id} owner=${ownerId}`);
    return this.toView(updated as LeadRecord);
  }

  async addActivity(
    id: string,
    dto: CreateActivityDto,
    actor: AuthenticatedUser,
  ) {
    const lead = await this.getLeadOrThrow(id);
    this.assertCanWrite(lead, actor);
    const payload: Prisma.InputJsonValue = {
      ...(dto.payload ?? {}),
      ...(dto.note ? { note: dto.note } : {}),
    };
    return this.repo.addActivity(id, actor.id, dto.type, payload);
  }

  async remove(id: string, actor: AuthenticatedUser) {
    const lead = await this.getLeadOrThrow(id);
    this.assertCanWrite(lead, actor);
    await this.repo.softDelete(id);
    this.logger.log(`lead.delete by=${actor.id} lead=${id}`);
    return { deleted: true };
  }

  // --- Yardımcılar ---

  private async getLeadOrThrow(id: string) {
    const lead = await this.repo.getLead(id);
    if (!lead) {
      throw new NotFoundException('Lead bulunamadı');
    }
    return lead;
  }

  // Sahiplik: MANAGER/ADMIN hepsine; diğerleri yalnız kendi lead'ine yazabilir (IDOR engeli).
  private assertCanWrite(
    lead: { ownerId: string | null },
    actor: AuthenticatedUser,
  ): void {
    const managesAll = actor.roles.some((r) => MANAGE_ALL_ROLES.includes(r));
    if (managesAll) return;
    if (lead.ownerId && lead.ownerId === actor.id) return;
    throw new ForbiddenException('Bu lead üzerinde yetkiniz yok.');
  }

  // Komşu kart rank'ini çözer; kart aynı hedef stage'de ve silinmemiş olmalı (IDOR/tutarlılık).
  private async resolveNeighborRank(
    leadId: string | undefined,
    toStageId: string,
  ): Promise<number | null> {
    if (!leadId) return null;
    const neighbor = await this.repo.getLead(leadId);
    if (!neighbor || neighbor.stageId !== toStageId) {
      throw new BadRequestException(
        'Komşu kart hedef sütunda bulunamadı (geçersiz before/afterLeadId).',
      );
    }
    return Number(neighbor.rank);
  }

  private toView(l: LeadRecord) {
    return {
      id: l.id,
      pipelineId: l.pipelineId,
      stageId: l.stageId,
      title: l.title,
      contactName: l.contactName,
      email: l.email,
      phone: l.phone,
      company: l.company,
      // Decimal alanlar string olarak döner (float kaybı yok).
      value: l.value !== null ? l.value.toString() : null,
      currency: l.currency,
      rank: l.rank.toString(),
      ownerId: l.ownerId,
      status: l.status,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
    };
  }
}
