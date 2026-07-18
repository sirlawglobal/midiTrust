import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HealthCheckService, HealthCheck, MongooseHealthIndicator } from '@nestjs/terminus';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Health & Liveness')
@Controller()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly mongooseHealth: MongooseHealthIndicator,
  ) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Liveness check endpoint' })
  @HealthCheck()
  checkLiveness() {
    return this.health.check([
      () => this.mongooseHealth.pingCheck('mongodb', { timeout: 1500 }),
    ]);
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness check endpoint' })
  @HealthCheck()
  checkReadiness() {
    return this.health.check([
      () => this.mongooseHealth.pingCheck('mongodb', { timeout: 1500 }),
    ]);
  }
}
