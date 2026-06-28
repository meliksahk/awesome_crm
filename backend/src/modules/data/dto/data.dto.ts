// src/modules/data/dto/data.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class ImportDto {
  @ApiProperty({ description: 'Ham CSV içeriği (başlık satırı zorunlu)' })
  @IsString()
  @MinLength(1)
  @MaxLength(1_000_000) // ~1MB güvenlik sınırı
  csv: string;
}

export class MergeDto {
  @ApiProperty({ description: 'Korunacak (hedef) kayıt' })
  @IsUUID('4')
  targetId: string;

  @ApiProperty({ description: 'Silinecek (kaynak) kayıt' })
  @IsUUID('4')
  sourceId: string;
}
