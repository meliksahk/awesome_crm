// src/modules/custom-fields/dto/custom-field.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomFieldEntity, CustomFieldType } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateFieldDefDto {
  @ApiProperty({ enum: CustomFieldEntity })
  @IsEnum(CustomFieldEntity)
  entity: CustomFieldEntity;

  @ApiProperty({ example: 'industry_segment' })
  @Matches(/^[a-z][a-z0-9_]{0,40}$/, {
    message: 'key küçük harf/rakam/altçizgi olmalı (a-z ile başlar).',
  })
  key: string;

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  label: string;

  @ApiProperty({ enum: CustomFieldType })
  @IsEnum(CustomFieldType)
  type: CustomFieldType;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  required?: boolean;
}

export class UpdateFieldDefDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  required?: boolean;
}

export class QueryFieldDefDto {
  @ApiPropertyOptional({ enum: CustomFieldEntity })
  @IsOptional()
  @IsEnum(CustomFieldEntity)
  entity?: CustomFieldEntity;
}
