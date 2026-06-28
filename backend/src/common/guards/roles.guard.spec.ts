// src/common/guards/roles.guard.spec.ts
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

const ctxWithUser = (user: unknown): ExecutionContext =>
  ({
    getHandler: () => null,
    getClass: () => null,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('rol şartı yoksa geçer', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(ctxWithUser({ roles: [] }))).toBe(true);
  });

  // U-2.3 — rol eşleşmesi
  it('rollerden biri eşleşirse geçer', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN', 'MANAGER']);
    expect(
      guard.canActivate(ctxWithUser({ roles: ['SALES', 'MANAGER'] })),
    ).toBe(true);
  });

  it('hiç rol eşleşmezse reddeder', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);
    expect(() => guard.canActivate(ctxWithUser({ roles: ['SALES'] }))).toThrow(
      ForbiddenException,
    );
  });
});
