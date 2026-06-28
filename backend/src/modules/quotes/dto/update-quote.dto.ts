// src/modules/quotes/dto/update-quote.dto.ts
// Yalnız DRAFT teklif güncellenebilir (servis kontrol eder). dealId değişmez.
import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateQuoteDto } from './create-quote.dto';

export class UpdateQuoteDto extends PartialType(
  OmitType(CreateQuoteDto, ['dealId'] as const),
) {}
