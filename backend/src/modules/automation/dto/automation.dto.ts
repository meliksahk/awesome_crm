// src/modules/automation/dto/automation.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export const TRIGGERS = [
  'deal.created',
  'deal.moved',
  'lead.created',
  'invoice.paid',
  'invoice.issued',
] as const;

export const ACTION_TYPES = [
  'create_activity',
  'send_email',
  'send_whatsapp',
  'log',
] as const;

export class ActionDto {
  @ApiProperty({ enum: ACTION_TYPES })
  @IsIn(ACTION_TYPES)
  type: (typeof ACTION_TYPES)[number];

  // create_activity / log
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  // send_email
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  template?: string;

  @ApiPropertyOptional({ description: 'Sabit e-posta adresi' })
  @IsOptional()
  @IsString()
  to?: string;
}

export class ConditionDto {
  @ApiProperty({ description: 'Payload alanı (örn. status)' })
  @IsString()
  field: string;

  @ApiProperty()
  @IsString()
  equals: string;
}

export class CreateRuleDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @ApiProperty({ enum: TRIGGERS })
  @IsIn(TRIGGERS)
  trigger: string;

  @ApiPropertyOptional({ type: ConditionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ConditionDto)
  conditions?: ConditionDto;

  @ApiProperty({ type: [ActionDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ActionDto)
  actions: ActionDto[];
}

export class UpdateRuleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: ConditionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ConditionDto)
  conditions?: ConditionDto;

  @ApiPropertyOptional({ type: [ActionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActionDto)
  actions?: ActionDto[];

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;
}

export class QueryRuleDto extends PaginationDto {
  @ApiPropertyOptional({ enum: TRIGGERS })
  @IsOptional()
  @IsIn(TRIGGERS)
  trigger?: string;
}
