// src/modules/roles/dto/create-role.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ALL_PERMISSIONS } from '../../../common/constants/permission.enum';

export class CreateRoleDto {
  // Rol adı: büyük harf/altçizgi (örn. CUSTOM_ROLE). Benzersiz.
  @ApiProperty({ example: 'SUPPORT' })
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  @Matches(/^[A-Z][A-Z0-9_]*$/, {
    message: 'Rol adı BÜYÜK harf, rakam ve altçizgi olmalı (örn. SUPPORT).',
  })
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  // İzinler "kaynak.eylem" action string'leri olarak verilir; bilinen kümeyle sınırlı.
  @ApiPropertyOptional({
    type: [String],
    example: ['lead.read', 'invoice.read'],
  })
  @IsOptional()
  @IsArray()
  @IsIn(ALL_PERMISSIONS, { each: true })
  permissions?: string[];
}
