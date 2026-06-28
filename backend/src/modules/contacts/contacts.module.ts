// src/modules/contacts/contacts.module.ts
import { Module } from '@nestjs/common';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { ContactsRepository } from './contacts.repository';

@Module({
  controllers: [ContactsController],
  providers: [ContactsService, ContactsRepository],
  exports: [ContactsService],
})
export class ContactsModule {}
