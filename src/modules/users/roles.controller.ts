import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionEnum } from '../../common/enums/permission.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { IActiveUser } from '../../common/interfaces/active-user.interface';
import { MongoIdValidationPipe } from '../../common/pipes/mongo-id-validation.pipe';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Permissions(PermissionEnum.ROLES_MANAGE)
  @Post()
  @ApiOperation({ summary: 'Create a new staff role with permissions' })
  async createRole(@Body() dto: CreateRoleDto, @CurrentUser() user: IActiveUser) {
    return this.rolesService.createRole(dto, user?.email);
  }

  @Permissions(PermissionEnum.ROLES_MANAGE)
  @Get()
  @ApiOperation({ summary: 'Get paginated list of system roles' })
  async getRoles(@Query() query: PaginationDto) {
    return this.rolesService.getRoles(query);
  }

  @Permissions(PermissionEnum.ROLES_MANAGE)
  @Get(':id')
  @ApiOperation({ summary: 'Get role details by ID' })
  async getRoleById(@Param('id', MongoIdValidationPipe) id: string) {
    return this.rolesService.getRoleById(id);
  }

  @Permissions(PermissionEnum.ROLES_MANAGE)
  @Patch(':id')
  @ApiOperation({ summary: 'Update role details and permissions' })
  async updateRole(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: IActiveUser,
  ) {
    return this.rolesService.updateRole(id, dto, user?.email);
  }

  @Permissions(PermissionEnum.ROLES_MANAGE)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a non-system role' })
  async deleteRole(@Param('id', MongoIdValidationPipe) id: string, @CurrentUser() user: IActiveUser) {
    return this.rolesService.deleteRole(id, user?.email);
  }
}
