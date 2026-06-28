// src/modules/leads/dto/create-activity.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

// Kullanıcının elle ekleyebileceği aktivite türleri (STAGE_CHANGE sistem tarafından üretilir).
export const ACTIVITY_TYPES = ['NOTE', 'CALL', 'EMAIL'] as const;

export class CreateActivityDto {
  @ApiProperty({ enum: ACTIVITY_TYPES })
  @IsIn(ACTIVITY_TYPES)
  type: (typeof ACTIVITY_TYPES)[number];

  @ApiPropertyOptional({ description: 'Serbest not metni' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
