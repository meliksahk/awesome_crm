// src/common/decorators/permissions.decorator.ts
// İnce taneli yetki: belirtilen tüm izinler (AND) gereklidir.
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...perms: string[]) =>
  SetMetadata(PERMISSIONS_KEY, perms);
