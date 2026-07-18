import { Injectable, Logger } from '@nestjs/common';
import { AuditLogRepository } from './audit-log.repository';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginationBuilder } from '../../common/utils/pagination.builder';

export interface CreateAuditLogParams {
  action: string;
  userId?: string;
  userEmail?: string;
  resourceId?: string;
  resourceType?: string;
  ipAddress?: string;
  userAgent?: string;
  oldState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  status?: 'SUCCESS' | 'FAILURE';
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  /**
   * Log critical system/user actions asynchronously without blocking HTTP response
   */
  async logAction(params: CreateAuditLogParams): Promise<void> {
    try {
      await this.auditLogRepository.create({
        action: params.action,
        userId: params.userId ? (params.userId as unknown as any) : undefined,
        userEmail: params.userEmail,
        resourceId: params.resourceId,
        resourceType: params.resourceType,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        oldState: params.oldState,
        newState: params.newState,
        status: params.status || 'SUCCESS',
        metadata: params.metadata,
        timestamp: new Date(),
      });
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to record audit log (${params.action}): ${errMessage}`);
    }
  }

  async getAuditLogs(query: PaginationDto) {
    const { page = 1, limit = 20, search } = query;
    const { skip, limit: safeLimit } = PaginationBuilder.getSkipAndLimit(page, limit);

    const filter: Record<string, unknown> = {};
    if (search) {
      filter.$or = [
        { action: { $regex: search, $options: 'i' } },
        { resourceId: { $regex: search, $options: 'i' } },
        { userEmail: { $regex: search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.auditLogRepository.find(filter, undefined, {
        skip,
        limit: safeLimit,
        sort: { timestamp: -1 },
      }),
      this.auditLogRepository.count(filter),
    ]);

    return {
      data,
      meta: PaginationBuilder.buildMeta(total, page, safeLimit),
    };
  }

  async getAuditLogById(id: string) {
    return this.auditLogRepository.findById(id);
  }
}
