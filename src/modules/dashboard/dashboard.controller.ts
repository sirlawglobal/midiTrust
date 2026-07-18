import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../../common/enums/role.enum';

@ApiTags('Dashboard Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Roles(RoleEnum.ADMIN, RoleEnum.STAFF)
  @Get('summary')
  @ApiOperation({ summary: 'Get high-level live metrics summary' })
  async getSummary() {
    return this.dashboardService.getSummary();
  }

  @Roles(RoleEnum.ADMIN)
  @Get('revenue')
  @ApiOperation({ summary: 'Get daily revenue time-series data for charting' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days to look back (default: 7)' })
  async getRevenueChart(@Query('days') days?: string) {
    const parsedDays = days ? parseInt(days, 10) : 7;
    return this.dashboardService.getRevenueChart(parsedDays);
  }

  @Roles(RoleEnum.ADMIN, RoleEnum.STAFF)
  @Get('recent-transactions')
  @ApiOperation({ summary: 'Get recent payment transactions' })
  async getRecentTransactions() {
    return this.dashboardService.getRecentTransactions();
  }
}
