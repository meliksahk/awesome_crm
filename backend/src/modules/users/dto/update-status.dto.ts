// src/modules/users/dto/update-status.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateStatusDto {
  @ApiProperty({ example: false, description: 'Kullanıcı aktif mi?' })
  @IsBoolean()
  isActive: boolean;
}
