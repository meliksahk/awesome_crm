// src/modules/roles/dto/update-role.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

// Rol adı değişmez (referans bütünlüğü/karışıklık engeli); yalnız açıklama güncellenir.
// İzinler ayrı uçtan (PATCH /:id/permissions) yönetilir.
export class UpdateRoleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}
