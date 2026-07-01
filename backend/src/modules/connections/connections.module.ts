// src/modules/connections/connections.module.ts — entegrasyon bağlantıları modülü.
import { Module } from '@nestjs/common';
import { SecretCryptoService } from '../../common/crypto/secret-crypto.service';
import { ConnectionsController } from './connections.controller';
import { ConnectionsService } from './connections.service';
import { ConnectionsRepository } from './connections.repository';

@Module({
  controllers: [ConnectionsController],
  providers: [ConnectionsService, ConnectionsRepository, SecretCryptoService],
  exports: [ConnectionsService, SecretCryptoService],
})
export class ConnectionsModule {}
