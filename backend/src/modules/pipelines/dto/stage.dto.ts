// src/modules/pipelines/dto/stage.dto.ts — Pipeline stage DTO'ları.
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateStageDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isWon?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isLost?: boolean;
}

export class UpdateStageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isWon?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isLost?: boolean;
}

export class ReorderStagesDto {
  @ApiProperty({ type: [String], description: 'Stage id sırası (soldan sağa)' })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  stageIds: string[];
}
