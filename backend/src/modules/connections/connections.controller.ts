// src/modules/connections/connections.controller.ts — entegrasyon bağlantıları (korumalı).
// İzin: mevcut integration.read / integration.manage (bağlantılar = entegrasyon yönetimi).
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../../common/constants/permission.enum';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ConnectionsService } from './connections.service';
import { CreateConnectionDto, UpdateConnectionDto } from './dto/connection.dto';

@ApiTags('connections')
@ApiBearerAuth()
@Controller('connections')
export class ConnectionsController {
  constructor(private readonly service: ConnectionsService) {}

  @Get('catalog')
  @Permissions(PERMISSIONS.INTEGRATION.READ)
  @ApiOperation({ summary: 'Sağlayıcı kataloğu (+ şifreleme hazır mı)' })
  catalog() {
    return this.service.catalog();
  }

  @Get()
  @Permissions(PERMISSIONS.INTEGRATION.READ)
  @ApiOperation({ summary: 'Bağlı entegrasyonlar (sırlar maskeli)' })
  list() {
    return this.service.list();
  }

  @Post()
  @Permissions(PERMISSIONS.INTEGRATION.MANAGE)
  @ApiOperation({ summary: 'Sağlayıcı bağla (sırlar şifreli saklanır)' })
  connect(@Body() dto: CreateConnectionDto) {
    return this.service.connect(dto);
  }

  @Post(':id/test')
  @Permissions(PERMISSIONS.INTEGRATION.MANAGE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bağlantıyı test et (ping)' })
  test(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.test(id);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.INTEGRATION.MANAGE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConnectionDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.INTEGRATION.MANAGE)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
