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

// Distinguishes the two things this collection is used for:
// - DISPATCH: an outbound SMS/Email/WhatsApp delivery attempt to a *patient* (existing use).
// - IN_APP: an in-app alert shown to *staff* in the notification bell/feed (e.g. "Invoice created").
export enum NotificationKind {
  DISPATCH = 'DISPATCH',
  IN_APP = 'IN_APP',
}

export enum AlertType {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

@Schema({ timestamps: true })
export class Notification extends Document {
  @Prop({ enum: NotificationKind, default: NotificationKind.DISPATCH, index: true })
  kind: string;

  // --- DISPATCH (patient SMS/Email/WhatsApp) fields ---
  @Prop({ index: true })
  recipient?: string; // Phone number or email

  @Prop({ enum: NotificationChannel, index: true })
  channel?: string;

  @Prop()
  templateName?: string; // e.g., "PAYMENT_RECEIPT"

  @Prop({ type: Object, default: {} })
  contextData: Record<string, any>; // Variables like receiptUrl, invoiceNumber, amount

  @Prop({ enum: NotificationStatus, default: NotificationStatus.PENDING, index: true })
  status: string;

  @Prop({ type: Object })
  providerResponse?: Record<string, any>;

  @Prop()
  errorMessage?: string;

  @Prop({ default: 0 })
  retryCount: number;

  @Prop({ type: Types.ObjectId, index: true })
  relatedEntityId?: Types.ObjectId; // E.g. the Receipt ID

  @Prop()
  relatedEntityType?: string; // "Receipt", "Invoice", etc.

  // --- IN_APP (staff notification feed) fields ---
  @Prop()
  title?: string;

  @Prop()
  message?: string;

  @Prop({ enum: AlertType, default: AlertType.INFO })
  type?: string;

  @Prop({ default: false, index: true })
  isRead: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Create compound index for querying pending/retrying jobs
NotificationSchema.index({ status: 1, channel: 1 });

