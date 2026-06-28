// src/modules/leads/dto/move-lead.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class MoveLeadDto {
  @ApiProperty()
  @IsUUID('4')
  toStageId: string;

  // Taşınan kartın ÜSTÜNDE kalacak kart (yoksa sütun başı).
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  beforeLeadId?: string;

  // Taşınan kartın ALTINDA kalacak kart (yoksa sütun sonu).
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  afterLeadId?: string;
}
