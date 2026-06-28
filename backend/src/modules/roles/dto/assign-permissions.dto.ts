// src/modules/roles/dto/assign-permissions.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn } from 'class-validator';
import { ALL_PERMISSIONS } from '../../../common/constants/permission.enum';

export class AssignPermissionsDto {
  // Rolün yeni izin listesi (tam liste — mevcut izinler bununla değiştirilir).
  @ApiProperty({ type: [String], example: ['lead.read', 'lead.create'] })
  @IsArray()
  @IsIn(ALL_PERMISSIONS, { each: true })
  permissions: string[];
}
