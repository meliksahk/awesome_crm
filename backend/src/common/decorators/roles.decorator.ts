// src/common/decorators/roles.decorator.ts
// Kaba taneli yetki: yalnızca belirtilen roller erişebilir.
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
