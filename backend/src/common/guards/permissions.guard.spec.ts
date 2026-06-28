// src/common/guards/permissions.guard.spec.ts
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';

const ctxWithUser = (user: unknown): ExecutionContext =>
  ({
    getHandler: () => null,
    getClass: () => null,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new PermissionsGuard(reflector as unknown as Reflector);
  });

  it('izin şartı yoksa geçer', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(ctxWithUser({ permissions: [] }))).toBe(true);
  });

  // U-2.1
  it('gerekli izin yoksa ForbiddenException atar', () => {
    reflector.getAllAndOverride.mockReturnValue(['user.create']);
    expect(() =>
      guard.canActivate(ctxWithUser({ permissions: ['user.read'] })),
    ).toThrow(ForbiddenException);
  });

  // U-2.2 — çoklu izin (AND): biri eksikse reddeder
  it('AND mantığı: izinlerden biri eksikse reddeder', () => {
    reflector.getAllAndOverride.mockReturnValue(['user.read', 'user.update']);
    expect(() =>
      guard.canActivate(ctxWithUser({ permissions: ['user.read'] })),
    ).toThrow(ForbiddenException);
  });

  it('tüm gerekli izinler varsa geçer', () => {
    reflector.getAllAndOverride.mockReturnValue(['user.read', 'user.update']);
    expect(
      guard.canActivate(
        ctxWithUser({ permissions: ['user.read', 'user.update', 'x'] }),
      ),
    ).toBe(true);
  });

  it('kullanıcı yoksa (izin şartı varken) reddeder', () => {
    reflector.getAllAndOverride.mockReturnValue(['user.read']);
    expect(() => guard.canActivate(ctxWithUser(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
