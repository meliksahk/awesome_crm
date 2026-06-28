// src/modules/roles/roles.repository.ts
// VERİ ERİŞİMİ: Prisma çağrıları YALNIZCA burada.
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const roleSelect = {
  id: true,
  name: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  permissions: { select: { permission: { select: { action: true } } } },
} satisfies Prisma.RoleSelect;

@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByName(name: string) {
    return this.prisma.role.findUnique({ where: { name } });
  }

  findById(id: string) {
    return this.prisma.role.findUnique({ where: { id }, select: roleSelect });
  }

  findAll() {
    return this.prisma.role.findMany({
      orderBy: { name: 'asc' },
      select: roleSelect,
    });
  }

  async create(
    name: string,
    description: string | undefined,
    actions: string[],
  ) {
    const permissionIds = await this.permissionIdsByActions(actions);
    return this.prisma.role.create({
      data: {
        name,
        description,
        permissions: {
          create: permissionIds.map((permissionId) => ({ permissionId })),
        },
      },
      select: roleSelect,
    });
  }

  updateDescription(id: string, description: string | undefined) {
    return this.prisma.role.update({
      where: { id },
      data: { description },
      select: roleSelect,
    });
  }

  delete(id: string) {
    // İlişkili RolePermission/UserRole satırları onDelete: Cascade ile silinir.
    return this.prisma.role.delete({ where: { id } });
  }

  // Rolün izinlerini tam liste ile değiştirir.
  async replacePermissions(id: string, actions: string[]) {
    const permissionIds = await this.permissionIdsByActions(actions);
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      this.prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId: id,
          permissionId,
        })),
        skipDuplicates: true,
      }),
    ]);
    return this.findById(id);
  }

  countUsersWithRole(id: string): Promise<number> {
    return this.prisma.userRole.count({ where: { roleId: id } });
  }

  private async permissionIdsByActions(actions: string[]): Promise<string[]> {
    if (actions.length === 0) return [];
    const perms = await this.prisma.permission.findMany({
      where: { action: { in: actions } },
      select: { id: true },
    });
    return perms.map((p) => p.id);
  }
}
