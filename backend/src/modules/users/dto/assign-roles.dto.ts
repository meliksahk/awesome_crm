// src/modules/users/dto/assign-roles.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class AssignRolesDto {
  // Kullanıcının yeni rol id'leri (tam liste — mevcut roller bununla değiştirilir).
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds: string[];
}
