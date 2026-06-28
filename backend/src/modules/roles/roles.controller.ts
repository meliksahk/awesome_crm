// src/modules/roles/roles.controller.ts
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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../../common/constants/permission.enum';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @Permissions(PERMISSIONS.ROLE.CREATE)
  @ApiOperation({ summary: 'Rol oluştur' })
  create(@Body() dto: CreateRoleDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.rolesService.create(dto, actor);
  }

  @Get()
  @Permissions(PERMISSIONS.ROLE.READ)
  @ApiOperation({ summary: 'Rolleri listele' })
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @Permissions(PERMISSIONS.ROLE.READ)
  @ApiOperation({ summary: 'Tek rol' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.ROLE.UPDATE)
  @ApiOperation({ summary: 'Rol açıklamasını güncelle' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @Patch(':id/permissions')
  @Permissions(PERMISSIONS.ROLE.UPDATE)
  @ApiOperation({ summary: 'Rolün izinlerini ata (tam liste)' })
  assignPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignPermissionsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.rolesService.assignPermissions(id, dto.permissions, actor);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.ROLE.DELETE)
  @ApiOperation({ summary: 'Rol sil' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.rolesService.remove(id, actor);
  }
}
