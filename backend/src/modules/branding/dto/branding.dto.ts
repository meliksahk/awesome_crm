// src/modules/branding/dto/branding.dto.ts — marka (logo + uygulama adı) DTO.
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateBrandingDto {
  @ApiPropertyOptional({ description: 'Uygulama adı (boş = varsayılan)' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  appName?: string;

  // Logo: data URL (image/svg+xml, png, jpeg, webp). Boş string ('') → varsayılana sıfırla.
  // Üst sınır ~600KB karakter (data URL şişkinliği için pay).
  @ApiPropertyOptional({ description: 'Logo data URL (boş = varsayılan logo)' })
  @IsOptional()
  @IsString()
  @MaxLength(600_000)
  logo?: string;
}
