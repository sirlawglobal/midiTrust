import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../../common/enums/role.enum';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Get all public hospital settings' })
  async getPublicSettings() {
    return this.settingsService.getAllSettings(false);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @Get()
  @ApiOperation({ summary: 'Get all settings (Admin only)' })
  async getAllSettings() {
    return this.settingsService.getAllSettings(true);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @Patch(':key')
  @ApiOperation({ summary: 'Update a specific setting' })
  async updateSetting(@Param('key') key: string, @Body() body: { value: any }) {
    return this.settingsService.updateSetting(key, body.value);
  }
}
