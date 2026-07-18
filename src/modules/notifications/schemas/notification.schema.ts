import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum NotificationChannel {
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
}

@Schema({ timestamps: true })
export class Notification extends Document {
  @Prop({ required: true, index: true })
  recipient: string; // Phone number or email

  @Prop({ required: true, enum: NotificationChannel, index: true })
  channel: string;

  @Prop({ required: true })
  templateName: string; // e.g., "PAYMENT_RECEIPT"

  @Prop({ type: Object, default: {} })
  contextData: Record<string, any>; // Variables like receiptUrl, invoiceNumber, amount

  @Prop({ required: true, enum: NotificationStatus, default: NotificationStatus.PENDING, index: true })
  status: string;

  @Prop({ type: Object })
  providerResponse?: Record<string, any>;

  @Prop()
  errorMessage?: string;

  @Prop({ default: 0 })
  retryCount: number;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  relatedEntityId: Types.ObjectId; // E.g. the Receipt ID

  @Prop({ required: true })
  relatedEntityType: string; // "Receipt", "Invoice", etc.
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Create compound index for querying pending/retrying jobs
NotificationSchema.index({ status: 1, channel: 1 });
