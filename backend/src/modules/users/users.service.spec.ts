// src/modules/users/users.service.spec.ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

const actor = (permissions: string[] = []): AuthenticatedUser => ({
  id: 'actor-1',
  email: 'a@crm.dev',
  roles: [],
  permissions,
});

const userRow = (over: Record<string, unknown> = {}) => ({
  id: 'u-1',
  email: 'u@crm.dev',
  firstName: 'U',
  lastName: 'Ser',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  roles: [],
  ...over,
});

describe('UsersService', () => {
  let service: UsersService;
  let repo: { [k in keyof UsersRepository]: jest.Mock };

  const config = {
    get: () => 12,
  } as unknown as ConfigService;

  beforeEach(() => {
    repo = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findManyPaginated: jest.fn(),
      updateProfile: jest.fn(),
      setStatus: jest.fn(),
      replaceRoles: jest.fn(),
      countRolesByIds: jest.fn(),
      roleNamesByIds: jest.fn(),
      isAdmin: jest.fn(),
      countActiveAdmins: jest.fn(),
    } as unknown as typeof repo;
    service = new UsersService(repo as unknown as UsersRepository, config);
  });

  // Privilege escalation: role.assign yetkisi olmadan rol atanamaz.
  it('create: roleIds verilip role.assign yoksa ForbiddenException', async () => {
    await expect(
      service.create(
        {
          email: 'x@crm.dev',
          password: 'S3cure!Pass00',
          firstName: 'X',
          lastName: 'Y',
          roleIds: ['11111111-1111-4111-8111-111111111111'],
        },
        actor([]), // role.assign yok
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  // U-2.4 — geçersiz roleId
  it('assignRoles: geçersiz roleId BadRequest atar', async () => {
    repo.findById.mockResolvedValue(userRow());
    repo.countRolesByIds.mockResolvedValue(0); // hiçbiri bulunamadı
    await expect(
      service.assignRoles(
        'u-1',
        ['22222222-2222-4222-8222-222222222222'],
        actor(['role.assign']),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  // U-2.5 — son admin pasifleştirilemez
  it('setStatus(false): son aktif admin ConflictException atar', async () => {
    repo.findById.mockResolvedValue(userRow({ isActive: true }));
    repo.isAdmin.mockResolvedValue(true);
    repo.countActiveAdmins.mockResolvedValue(1); // tek aktif admin
    await expect(
      service.setStatus('u-1', false, actor(['user.update'])),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repo.setStatus).not.toHaveBeenCalled();
  });

  it("assignRoles: son admin'den ADMIN rolü çekilince ConflictException", async () => {
    repo.findById.mockResolvedValue(userRow({ isActive: true }));
    repo.countRolesByIds.mockResolvedValue(1);
    repo.roleNamesByIds.mockResolvedValue(['SALES']); // ADMIN içermiyor
    repo.isAdmin.mockResolvedValue(true); // hedef şu an admin
    repo.countActiveAdmins.mockResolvedValue(1);
    await expect(
      service.assignRoles(
        'u-1',
        ['33333333-3333-4333-8333-333333333333'],
        actor(['role.assign']),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('setStatus(false): admin değilse serbestçe pasifleştirir', async () => {
    repo.findById.mockResolvedValue(userRow());
    repo.isAdmin.mockResolvedValue(false);
    repo.setStatus.mockResolvedValue(userRow({ isActive: false }));
    const res = await service.setStatus('u-1', false, actor(['user.update']));
    expect(res.isActive).toBe(false);
    expect(repo.setStatus).toHaveBeenCalledWith('u-1', false);
  });
});
