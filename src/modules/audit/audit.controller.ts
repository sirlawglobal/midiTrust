import { Controller, Get, Param, Query, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionEnum } from '../../common/enums/permission.enum';
import { MongoIdValidationPipe } from '../../common/pipes/mongo-id-validation.pipe';
import { ERROR_CODES } from '../../common/constants/error-codes.constant';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Permissions(PermissionEnum.AUDIT_LOGS_READ)
  @Get()
  @ApiOperation({ summary: 'Get paginated audit logs' })
  async getAuditLogs(@Query() query: PaginationDto) {
    return this.auditService.getAuditLogs(query);
  }

  @Permissions(PermissionEnum.AUDIT_LOGS_READ)
  @Get(':id')
  @ApiOperation({ summary: 'Get a single audit log entry by ID' })
  async getAuditLogById(@Param('id', MongoIdValidationPipe) id: string) {
    const log = await this.auditService.getAuditLogById(id);
    if (!log) {
      throw new NotFoundException({
        success: false,
        errorCode: ERROR_CODES.NOT_FOUND,
        message: `Audit log with ID '${id}' not found.`,
        timestamp: new Date().toISOString(),
      });
    }
    return log;
  }
}
