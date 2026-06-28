// src/modules/quotes/dto/query-quote.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { QuoteStatus } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryQuoteDto extends PaginationDto {
  @ApiPropertyOptional({ enum: QuoteStatus })
  @IsOptional()
  @IsEnum(QuoteStatus)
  status?: QuoteStatus;

  @ApiPropertyOptional({ description: 'Müşteri adı/numara araması' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
