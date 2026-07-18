import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../infrastructure/database/base.repository';
import { AuditLog } from './schemas/audit-log.schema';

@Injectable()
export class AuditLogRepository extends BaseRepository<AuditLog> {
  constructor(@InjectModel(AuditLog.name) model: Model<AuditLog>) {
    super(model);
  }
}
