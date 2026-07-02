// src/modules/whatsapp/whatsapp.controller.ts — WhatsApp gönderim + gelen kutusu (korumalı).
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../../common/constants/permission.enum';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { WhatsAppService } from './whatsapp.service';
import { SendWhatsAppDto } from './dto/whatsapp.dto';

@ApiTags('whatsapp')
@ApiBearerAuth()
@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly service: WhatsAppService) {}

  @Get('status')
  @Permissions(PERMISSIONS.WHATSAPP.READ)
  status() {
    return this.service.status();
  }

  @Post('send')
  @Permissions(PERMISSIONS.WHATSAPP.SEND)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Metin mesajı gönder (sonuç kayda geçer)' })
  send(@Body() dto: SendWhatsAppDto) {
    return this.service.send(dto);
  }

  @Get('conversations')
  @Permissions(PERMISSIONS.WHATSAPP.READ)
  conversations() {
    return this.service.conversations();
  }

  @Get('thread/:phone')
  @Permissions(PERMISSIONS.WHATSAPP.READ)
  thread(@Param('phone') phone: string) {
    return this.service.thread(phone);
  }
}
