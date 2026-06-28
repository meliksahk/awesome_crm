// src/modules/users/dto/create-user.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'sales@crm.dev' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 10 })
  @IsString()
  @MinLength(10)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/, {
    message:
      'Parola yeterince güçlü değil (büyük/küçük harf, rakam, özel karakter).',
  })
  password: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  firstName: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  lastName: string;

  // Atanacak rol id'leri (yalnız role.assign izniyle anlamlı; mass-assignment'a karşı whitelist).
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds?: string[];
}
