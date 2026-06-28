// src/modules/quotes/quotes.controller.ts
// SADECE HTTP: DTO + yetki + servis çağrısı.
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
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { QueryQuoteDto } from './dto/query-quote.dto';

@ApiTags('quotes')
@ApiBearerAuth()
@Controller('quotes')
export class QuotesController {
  constructor(private readonly service: QuotesService) {}

  @Get()
  @Permissions(PERMISSIONS.QUOTE.READ)
  findAll(@Query() q: QueryQuoteDto) {
    return this.service.findAll(q);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.QUOTE.READ)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Permissions(PERMISSIONS.QUOTE.CREATE)
  create(@Body() dto: CreateQuoteDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.create(dto, actor);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.QUOTE.UPDATE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuoteDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, actor);
  }

  @Post(':id/send')
  @Permissions(PERMISSIONS.QUOTE.SEND)
  @ApiOperation({ summary: 'Teklifi gönder (numara ata)' })
  send(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.send(id, actor);
  }

  @Post(':id/accept')
  @Permissions(PERMISSIONS.QUOTE.SEND)
  @ApiOperation({ summary: 'Teklifi kabul edildi işaretle' })
  accept(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.accept(id, actor);
  }

  @Post(':id/reject')
  @Permissions(PERMISSIONS.QUOTE.SEND)
  @ApiOperation({ summary: 'Teklifi reddedildi işaretle' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.reject(id, actor);
  }

  @Post(':id/convert')
  @Permissions(PERMISSIONS.QUOTE.CONVERT)
  @ApiOperation({ summary: 'Teklifi faturaya dönüştür (DRAFT invoice)' })
  convert(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.convert(id, actor);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.QUOTE.DELETE)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.remove(id, actor);
  }
}
