// src/modules/pipelines/pipelines.module.ts — Pipeline stage yönetimi modülü.
import { Module } from '@nestjs/common';
import { PipelinesController } from './pipelines.controller';
import { PipelinesService } from './pipelines.service';
import { PipelinesRepository } from './pipelines.repository';

@Module({
  controllers: [PipelinesController],
  providers: [PipelinesService, PipelinesRepository],
  exports: [PipelinesService],
})
export class PipelinesModule {}
