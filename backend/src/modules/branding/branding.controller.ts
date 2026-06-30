// src/modules/branding/branding.controller.ts — marka oku (public) + güncelle (yetki).
import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../../common/constants/permission.enum';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { BrandingService } from './branding.service';
import { UpdateBrandingDto } from './dto/branding.dto';

@ApiTags('branding')
@Controller('branding')
export class BrandingController {
  constructor(private readonly service: BrandingService) {}

  // Login ekranı oturum açmadan logoyu çeker → @Public.
  @Public()
  @Get()
  @ApiOperation({ summary: 'Marka (logo + uygulama adı) — public' })
  get() {
    return this.service.get();
  }

  @Patch()
  @ApiBearerAuth()
  @Permissions(PERMISSIONS.BRANDING.MANAGE)
  @ApiOperation({ summary: 'Marka güncelle (logo data URL / uygulama adı)' })
  update(@Body() dto: UpdateBrandingDto) {
    return this.service.update(dto);
  }
}
