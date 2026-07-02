// src/modules/whatsapp/dto/whatsapp.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SendWhatsAppDto {
  @ApiProperty({ example: '+905551112233' })
  @IsString()
  @MinLength(7)
  @MaxLength(20)
  to: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  body: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  leadId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  contactId?: string;
}
