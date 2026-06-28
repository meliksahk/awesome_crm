// src/modules/contacts/contacts.controller.ts
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
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ContactsService } from './contacts.service';
import {
  CreateContactDto,
  QueryContactDto,
  UpdateContactDto,
} from './dto/contact.dto';

@ApiTags('contacts')
@ApiBearerAuth()
@Controller('contacts')
export class ContactsController {
  constructor(private readonly service: ContactsService) {}

  @Post()
  @Permissions(PERMISSIONS.CONTACT.CREATE)
  create(
    @Body() dto: CreateContactDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.create(dto, actor);
  }

  @Get()
  @Permissions(PERMISSIONS.CONTACT.READ)
  findAll(@Query() q: QueryContactDto) {
    return this.service.findAll(q);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.CONTACT.READ)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.CONTACT.UPDATE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.CONTACT.DELETE)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
