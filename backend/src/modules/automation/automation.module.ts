// src/modules/automation/automation.module.ts
import { Module } from '@nestjs/common';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';
import { AutomationRepository } from './automation.repository';
import { AutomationEngine } from './automation.engine';
import { IntegrationsModule } from '../integrations/integrations.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [IntegrationsModule, WhatsAppModule], // MailService + WhatsAppService
  controllers: [AutomationController],
  providers: [AutomationService, AutomationRepository, AutomationEngine],
  exports: [AutomationService],
})
export class AutomationModule {}
