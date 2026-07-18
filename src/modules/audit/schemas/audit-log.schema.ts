import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'audit_logs' })
export class AuditLog extends Document {
  @Prop({ required: true, index: true })
  action!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true, required: false })
  userId?: Types.ObjectId;

  @Prop({ required: false })
  userEmail?: string;

  @Prop({ required: false, index: true })
  resourceId?: string;

  @Prop({ required: false, index: true })
  resourceType?: string;

  @Prop({ required: false })
  ipAddress?: string;

  @Prop({ required: false })
  userAgent?: string;

  @Prop({ type: Object, required: false })
  oldState?: Record<string, unknown>;

  @Prop({ type: Object, required: false })
  newState?: Record<string, unknown>;

  @Prop({ required: true, enum: ['SUCCESS', 'FAILURE'], default: 'SUCCESS' })
  status!: string;

  @Prop({ type: Object, required: false })
  metadata?: Record<string, unknown>;

  @Prop({ required: true, default: Date.now, index: true })
  timestamp!: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ resourceId: 1, resourceType: 1 });
AuditLogSchema.index({ userId: 1, timestamp: -1 });
