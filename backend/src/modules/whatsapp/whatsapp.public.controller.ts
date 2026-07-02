// src/modules/whatsapp/whatsapp.public.controller.ts
// PUBLIC uçlar (bilinçli @Public):
//   GET  /webhooks/whatsapp — Meta doğrulama challenge'ı (verifyToken eşleşirse HAM metin döner)
//   POST /webhooks/whatsapp — gelen mesaj (X-Hub-Signature-256 zorunlu; imzasız → 401, yazım yok)
import {
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  RawBodyRequest,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { WhatsAppService } from './whatsapp.service';

@ApiTags('whatsapp-public')
@Controller('webhooks/whatsapp')
export class WhatsAppPublicController {
  constructor(private readonly service: WhatsAppService) {}

  // Meta challenge ham metin bekler → @Res ile yanıt zarfını (success/data) bilinçli atla.
  @Public()
  @Get()
  @ApiOperation({ summary: 'Meta webhook doğrulama (hub.challenge)' })
  async verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const value = await this.service.verifyChallenge(mode, token, challenge);
    res.status(HttpStatus.OK).type('text/plain').send(value);
  }

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gelen WhatsApp mesajı (HMAC imza zorunlu)' })
  inbound(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature?: string,
  ) {
    return this.service.handleInbound(req.rawBody?.toString() ?? '', signature);
  }
}
