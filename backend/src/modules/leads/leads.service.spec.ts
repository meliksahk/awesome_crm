// src/modules/leads/leads.service.spec.ts
import { BadRequestException } from '@nestjs/common';
import { LeadStatus, Prisma } from '@prisma/client';
import { LeadsService } from './leads.service';
import { LeadsRepository } from './leads.repository';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

const admin: AuthenticatedUser = {
  id: 'actor-1',
  email: 'a@crm.dev',
  roles: ['ADMIN'],
  permissions: [],
};

const leadRecord = (over: Record<string, unknown> = {}) => ({
  id: 'l-1',
  pipelineId: 'p-1',
  stageId: 's-1',
  title: 'Lead',
  contactName: null,
  email: null,
  phone: null,
  company: null,
  value: null as Prisma.Decimal | null,
  currency: 'TRY',
  rank: new Prisma.Decimal(1),
  ownerId: 'actor-1',
  status: LeadStatus.OPEN,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
});

describe('LeadsService', () => {
  let service: LeadsService;
  let repo: { [k in keyof LeadsRepository]: jest.Mock };

  beforeEach(() => {
    repo = {
      getStage: jest.fn(),
      getPipeline: jest.fn(),
      userExists: jest.fn(),
      getLead: jest.fn(),
      maxRankInStage: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      setOwner: jest.fn(),
      applyMove: jest.fn(),
      board: jest.fn(),
      list: jest.fn(),
      addActivity: jest.fn(),
      getActivities: jest.fn(),
    } as unknown as typeof repo;
    service = new LeadsService(repo as unknown as LeadsRepository);
  });

  // U-3.5
  it('create: geçersiz stageId BadRequest', async () => {
    repo.getStage.mockResolvedValue(null);
    await expect(
      service.create({ pipelineId: 'p-1', stageId: 's-x', title: 'X' }, admin),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("create: stage farklı pipeline'a aitse BadRequest", async () => {
    repo.getStage.mockResolvedValue({ id: 's-1', pipelineId: 'OTHER' });
    await expect(
      service.create({ pipelineId: 'p-1', stageId: 's-1', title: 'X' }, admin),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  // U-3.6 — Decimal hassasiyeti
  it('create: Decimal value hassasiyeti korunur (float yok)', async () => {
    repo.getStage.mockResolvedValue({ id: 's-1', pipelineId: 'p-1' });
    repo.maxRankInStage.mockResolvedValue(null);
    repo.create.mockResolvedValue(
      leadRecord({ value: new Prisma.Decimal('12000.10') }),
    );
    const res = await service.create(
      { pipelineId: 'p-1', stageId: 's-1', title: 'X', value: '12000.10' },
      admin,
    );
    expect(res.value).toBe('12000.1'); // string; float yuvarlaması yok
    expect(typeof res.rank).toBe('string');
  });

  // U-3.3 — cross-pipeline move
  it("move: farklı pipeline stage'ine taşıma BadRequest", async () => {
    repo.getLead.mockResolvedValue(leadRecord());
    repo.getStage.mockResolvedValue({
      id: 's-2',
      pipelineId: 'OTHER',
      isWon: false,
      isLost: false,
    });
    await expect(
      service.move('l-1', { toStageId: 's-2' }, admin),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  // U-3.4 — isWon stage → status WON + applyMove çağrısı
  it('move: isWon stage → status WON ve STAGE_CHANGE (applyMove) çağrılır', async () => {
    repo.getLead.mockResolvedValue(leadRecord());
    repo.getStage.mockResolvedValue({
      id: 's-won',
      pipelineId: 'p-1',
      isWon: true,
      isLost: false,
    });
    repo.maxRankInStage.mockResolvedValue(5);
    repo.applyMove.mockResolvedValue(
      leadRecord({
        stageId: 's-won',
        status: LeadStatus.WON,
        rank: new Prisma.Decimal(6),
      }),
    );

    const res = await service.move('l-1', { toStageId: 's-won' }, admin);

    expect(repo.applyMove).toHaveBeenCalledWith(
      expect.objectContaining({
        toStageId: 's-won',
        status: LeadStatus.WON,
        fromStageId: 's-1',
        userId: 'actor-1',
      }),
    );
    expect(res.status).toBe(LeadStatus.WON);
  });

  it("move: komşu kart farklı stage'de ise BadRequest (IDOR/tutarlılık)", async () => {
    repo.getLead
      .mockResolvedValueOnce(leadRecord()) // taşınan lead
      .mockResolvedValueOnce(leadRecord({ id: 'nb', stageId: 'WRONG' })); // komşu
    repo.getStage.mockResolvedValue({
      id: 's-2',
      pipelineId: 'p-1',
      isWon: false,
      isLost: false,
    });
    await expect(
      service.move('l-1', { toStageId: 's-2', beforeLeadId: 'nb' }, admin),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
