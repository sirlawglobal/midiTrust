import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionEnum } from '../../common/enums/permission.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { IActiveUser } from '../../common/interfaces/active-user.interface';
import { MongoIdValidationPipe } from '../../common/pipes/mongo-id-validation.pipe';

@ApiTags('User Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Permissions(PermissionEnum.USERS_CREATE)
  @Post()
  @ApiOperation({ summary: 'Create a new staff user account' })
  async createUser(@Body() dto: CreateUserDto, @CurrentUser() user: IActiveUser) {
    return this.usersService.createUser(dto, user?.email);
  }

  @Permissions(PermissionEnum.USERS_READ)
  @Get()
  @ApiOperation({ summary: 'Get paginated list of hospital staff users' })
  async getUsers(@Query() query: PaginationDto) {
    return this.usersService.getUsers(query);
  }

  @Permissions(PermissionEnum.USERS_READ)
  @Get(':id')
  @ApiOperation({ summary: 'Get single staff user by ID' })
  async getUserById(@Param('id', MongoIdValidationPipe) id: string) {
    return this.usersService.getUserById(id);
  }

  @Permissions(PermissionEnum.USERS_UPDATE)
  @Patch(':id')
  @ApiOperation({ summary: 'Update staff user profile/role' })
  async updateUser(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: IActiveUser,
  ) {
    return this.usersService.updateUser(id, dto, user?.email);
  }

  @Permissions(PermissionEnum.USERS_UPDATE)
  @Patch(':id/status')
  @ApiOperation({ summary: 'Activate or deactivate a staff account' })
  async updateUserStatus(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() user: IActiveUser,
  ) {
    return this.usersService.updateUserStatus(id, dto, user?.email);
  }

  @Permissions(PermissionEnum.USERS_DELETE)
  @Delete(':id')
  @ApiOperation({ summary: 'Permanently delete staff user' })
  async deleteUser(@Param('id', MongoIdValidationPipe) id: string, @CurrentUser() user: IActiveUser) {
    return this.usersService.deleteUser(id, user?.email);
  }
}
