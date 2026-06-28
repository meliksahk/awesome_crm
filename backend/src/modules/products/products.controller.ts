// src/modules/products/products.controller.ts
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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../../common/constants/permission.enum';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  @Permissions(PERMISSIONS.PRODUCT.READ)
  findAll(@Query() q: QueryProductDto) {
    return this.service.findAll(q);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.PRODUCT.READ)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Permissions(PERMISSIONS.PRODUCT.CREATE)
  create(
    @Body() dto: CreateProductDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.create(dto, actor);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.PRODUCT.UPDATE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, actor);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.PRODUCT.DELETE)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.remove(id, actor);
  }
}
