// src/modules/custom-fields/custom-fields.controller.ts
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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../../common/constants/permission.enum';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CustomFieldsService } from './custom-fields.service';
import {
  CreateFieldDefDto,
  QueryFieldDefDto,
  UpdateFieldDefDto,
} from './dto/custom-field.dto';

@ApiTags('custom-fields')
@ApiBearerAuth()
@Controller('custom-fields')
export class CustomFieldsController {
  constructor(private readonly service: CustomFieldsService) {}

  @Post()
  @Permissions(PERMISSIONS.CUSTOM_FIELD.MANAGE)
  create(@Body() dto: CreateFieldDefDto) {
    return this.service.create(dto);
  }

  @Get()
  @Permissions(PERMISSIONS.CUSTOM_FIELD.READ)
  findAll(@Query() q: QueryFieldDefDto) {
    return this.service.findAll(q);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.CUSTOM_FIELD.MANAGE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFieldDefDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.CUSTOM_FIELD.MANAGE)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
