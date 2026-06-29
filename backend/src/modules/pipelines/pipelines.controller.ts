// src/modules/pipelines/pipelines.controller.ts — Pipeline stage yönetimi (korumalı).
// Not: 'reorder' route'u ':stageId'den ÖNCE tanımlı (Express literal'i param'dan önce eşler).
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../../common/constants/permission.enum';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PipelinesService } from './pipelines.service';
import {
  CreateStageDto,
  ReorderStagesDto,
  UpdateStageDto,
} from './dto/stage.dto';

@ApiTags('pipelines')
@ApiBearerAuth()
@Controller('pipelines')
export class PipelinesController {
  constructor(private readonly service: PipelinesService) {}

  @Get()
  @Permissions(PERMISSIONS.PIPELINE.READ)
  @ApiOperation({ summary: 'Pipeline + stage listesi' })
  list() {
    return this.service.listPipelines();
  }

  @Get(':pipelineId/stages')
  @Permissions(PERMISSIONS.PIPELINE.READ)
  getStages(@Param('pipelineId', ParseUUIDPipe) pipelineId: string) {
    return this.service.getStages(pipelineId);
  }

  @Post(':pipelineId/stages')
  @Permissions(PERMISSIONS.PIPELINE.MANAGE)
  @ApiOperation({ summary: 'Stage ekle (sona)' })
  addStage(
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
    @Body() dto: CreateStageDto,
  ) {
    return this.service.addStage(pipelineId, dto);
  }

  @Patch(':pipelineId/stages/reorder')
  @Permissions(PERMISSIONS.PIPELINE.MANAGE)
  @ApiOperation({ summary: 'Stage sırasını değiştir' })
  reorder(
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
    @Body() dto: ReorderStagesDto,
  ) {
    return this.service.reorder(pipelineId, dto);
  }

  @Patch(':pipelineId/stages/:stageId')
  @Permissions(PERMISSIONS.PIPELINE.MANAGE)
  @ApiOperation({ summary: 'Stage yeniden adlandır / kazan-kayıp işaretle' })
  updateStage(
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
    @Param('stageId', ParseUUIDPipe) stageId: string,
    @Body() dto: UpdateStageDto,
  ) {
    return this.service.updateStage(pipelineId, stageId, dto);
  }

  @Delete(':pipelineId/stages/:stageId')
  @Permissions(PERMISSIONS.PIPELINE.MANAGE)
  @ApiOperation({ summary: 'Stage sil (boşsa ve son değilse)' })
  removeStage(
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
    @Param('stageId', ParseUUIDPipe) stageId: string,
  ) {
    return this.service.removeStage(pipelineId, stageId);
  }
}
