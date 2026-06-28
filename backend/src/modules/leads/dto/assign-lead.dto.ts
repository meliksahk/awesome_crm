// src/modules/leads/dto/assign-lead.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class AssignLeadDto {
  // null/boş → sahipliği kaldırır; UUID → o kullanıcıya atar.
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID('4')
  ownerId?: string | null;
}
