// src/modules/users/users.repository.ts
// VERİ ERİŞİMİ: Prisma çağrıları YALNIZCA burada. passwordHash dışarı seçilmez.
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLE_NAMES } from '../../common/constants/permission.enum';

// passwordHash HARİÇ güvenli seçim + roller.
const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  roles: { select: { role: { select: { id: true, name: true } } } },
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  create(
    data: {
      email: string;
      passwordHash: string;
      firstName: string;
      lastName: string;
    },
    roleIds: string[],
  ) {
    return this.prisma.user.create({
      data: {
        ...data,
        roles: { create: roleIds.map((roleId) => ({ roleId })) },
      },
      select: userSelect,
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id }, select: userSelect });
  }

  async findManyPaginated(skip: number, take: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: userSelect,
      }),
      this.prisma.user.count(),
    ]);
    return { items, total };
  }

  updateProfile(id: string, data: { firstName?: string; lastName?: string }) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: userSelect,
    });
  }

  setStatus(id: string, isActive: boolean) {
    return this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: userSelect,
    });
  }

  // Rolleri tam liste ile değiştirir (eski UserRole'ler silinir, yenileri eklenir).
  async replaceRoles(id: string, roleIds: string[]) {
    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId: id } }),
      this.prisma.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId: id, roleId })),
        skipDuplicates: true,
      }),
    ]);
    return this.findById(id);
  }

  // Verilen id'lerin tümü gerçekten var mı? (geçersiz roleId kontrolü)
  async countRolesByIds(roleIds: string[]): Promise<number> {
    return this.prisma.role.count({ where: { id: { in: roleIds } } });
  }

  async roleNamesByIds(roleIds: string[]): Promise<string[]> {
    const roles = await this.prisma.role.findMany({
      where: { id: { in: roleIds } },
      select: { name: true },
    });
    return roles.map((r) => r.name);
  }

  // Bir kullanıcının ADMIN rolü var mı?
  async isAdmin(id: string): Promise<boolean> {
    const count = await this.prisma.userRole.count({
      where: { userId: id, role: { name: ROLE_NAMES.ADMIN } },
    });
    return count > 0;
  }

  // Sistemdeki AKTİF admin sayısı (son admin koruması için).
  countActiveAdmins(): Promise<number> {
    return this.prisma.user.count({
      where: {
        isActive: true,
        roles: { some: { role: { name: ROLE_NAMES.ADMIN } } },
      },
    });
  }
}
