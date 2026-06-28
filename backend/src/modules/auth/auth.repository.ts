// src/modules/auth/auth.repository.ts
// VERİ ERİŞİMİ: Prisma çağrıları YALNIZCA burada yapılır (katmanlı mimari kuralı).
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { roles: { include: { role: true } } },
    });
  }

  findById(id: string) {
    // Roller + her rolün izinleri yüklenir → her istekte güncel yetki (token'a güvenilmez).
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        },
      },
    });
  }

  createUser(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
  }) {
    return this.prisma.user.create({
      data,
      include: { roles: { include: { role: true } } },
    });
  }

  // --- Refresh token ---

  createRefreshToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    return this.prisma.refreshToken.create({ data });
  }

  findRefreshTokenById(id: string) {
    return this.prisma.refreshToken.findUnique({ where: { id } });
  }

  updateRefreshTokenHash(id: string, tokenHash: string) {
    return this.prisma.refreshToken.update({
      where: { id },
      data: { tokenHash },
    });
  }

  revokeRefreshToken(id: string) {
    return this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  // Bir kullanıcının tüm aktif refresh token'larını iptal eder (reuse/çalıntı tespiti).
  revokeAllForUser(userId: string) {
    return this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
