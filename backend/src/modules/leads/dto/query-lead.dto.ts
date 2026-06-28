// src/modules/leads/dto/query-lead.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export enum LeadStatusFilter {
  OPEN = 'OPEN',
  WON = 'WON',
  LOST = 'LOST',
}

export class QueryLeadDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  pipelineId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  stageId?: string;

  @ApiPropertyOptional({ enum: LeadStatusFilter })
  @IsOptional()
  @IsEnum(LeadStatusFilter)
  status?: LeadStatusFilter;

  // Arama: title/company/contactName (Prisma parametrik → injection yok).
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
