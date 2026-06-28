// src/modules/companies/companies.controller.ts
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
import { CompaniesService } from './companies.service';
import {
  CreateCompanyDto,
  QueryCompanyDto,
  UpdateCompanyDto,
} from './dto/company.dto';

@ApiTags('companies')
@ApiBearerAuth()
@Controller('companies')
export class CompaniesController {
  constructor(private readonly service: CompaniesService) {}

  @Post()
  @Permissions(PERMISSIONS.COMPANY.CREATE)
  create(
    @Body() dto: CreateCompanyDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.create(dto, actor);
  }

  @Get()
  @Permissions(PERMISSIONS.COMPANY.READ)
  findAll(@Query() q: QueryCompanyDto) {
    return this.service.findAll(q);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.COMPANY.READ)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.COMPANY.UPDATE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.COMPANY.DELETE)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
