// src/modules/leads/leads.controller.ts
// SADECE HTTP: DTO + yetki dekoratörleri + servis çağrısı.
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../../common/constants/permission.enum';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { MoveLeadDto } from './dto/move-lead.dto';
import { AssignLeadDto } from './dto/assign-lead.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { QueryLeadDto } from './dto/query-lead.dto';

@ApiTags('leads')
@ApiBearerAuth()
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  // 'board' statik yolu, ':id' parametresinden ÖNCE tanımlanır.
  @Get('board')
  @Permissions(PERMISSIONS.LEAD.READ)
  @ApiOperation({ summary: "Kanban panosu: stage + sıralı lead'ler" })
  board(@Query('pipelineId', ParseUUIDPipe) pipelineId: string) {
    return this.leadsService.findBoard(pipelineId);
  }

  @Get()
  @Permissions(PERMISSIONS.LEAD.READ)
  @ApiOperation({ summary: 'Lead listele (filtre/arama/sayfalama)' })
  findAll(@Query() q: QueryLeadDto) {
    return this.leadsService.findAll(q);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.LEAD.READ)
  @ApiOperation({ summary: 'Tekil lead + aktiviteler' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.leadsService.findOne(id);
  }

  @Post()
  @Permissions(PERMISSIONS.LEAD.CREATE)
  @ApiOperation({ summary: 'Yeni lead' })
  create(@Body() dto: CreateLeadDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.leadsService.create(dto, actor);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.LEAD.UPDATE)
  @ApiOperation({ summary: 'Lead alan güncelle' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.leadsService.update(id, dto, actor);
  }

  @Patch(':id/move')
  @Permissions(PERMISSIONS.LEAD.MOVE)
  @ApiOperation({ summary: 'Aşama/sıra değiştir (Kanban move)' })
  move(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoveLeadDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.leadsService.move(id, dto, actor);
  }

  @Patch(':id/assign')
  @Permissions(PERMISSIONS.LEAD.UPDATE)
  @ApiOperation({ summary: 'Sahip ata/kaldır' })
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignLeadDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.leadsService.assign(id, dto, actor);
  }

  @Post(':id/activities')
  @Permissions(PERMISSIONS.LEAD.UPDATE)
  @ApiOperation({ summary: 'Not/aktivite ekle' })
  addActivity(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateActivityDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.leadsService.addActivity(id, dto, actor);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.LEAD.DELETE)
  @ApiOperation({ summary: 'Lead soft delete' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.leadsService.remove(id, actor);
  }
}
