// src/modules/whatsapp/whatsapp.module.ts — v3.1 WhatsApp mesajlaşma modülü.
import { Module } from '@nestjs/common';
import { ConnectionsModule } from '../connections/connections.module';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppPublicController } from './whatsapp.public.controller';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppRepository } from './whatsapp.repository';
import { FetchGraphClient, WA_GRAPH_CLIENT } from './graph-client';

@Module({
  imports: [ConnectionsModule],
  controllers: [WhatsAppController, WhatsAppPublicController],
  providers: [
    WhatsAppService,
    WhatsAppRepository,
    { provide: WA_GRAPH_CLIENT, useClass: FetchGraphClient },
  ],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
