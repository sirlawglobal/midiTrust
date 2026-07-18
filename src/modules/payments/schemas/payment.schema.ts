import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERPAID = 'OVERPAID',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
}

export enum PaymentMethod {
  ACCOUNT_TRANSFER = 'ACCOUNT_TRANSFER',
  CARD = 'CARD',
  USSD = 'USSD',
}

@Schema({ timestamps: true })
export class Payment extends Document {
  @Prop({ required: true, unique: true, index: true })
  paymentReference: string; // Monnify transaction reference

  @Prop({ type: Types.ObjectId, ref: 'Invoice', required: true, index: true })
  invoiceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true, index: true })
  patientId: Types.ObjectId;

  @Prop({ required: true, index: true })
  accountReference: string;

  @Prop({ required: true })
  amountPaid: number;

  @Prop({ required: true, default: 0 })
  fee: number;

  @Prop({ required: true })
  netAmount: number;

  @Prop({ default: 'NGN' })
  currency: string;

  @Prop({ enum: PaymentMethod, required: true })
  paymentMethod: string;

  @Prop({ enum: PaymentStatus, required: true, index: true })
  status: string;

  @Prop({ index: true })
  paidOn?: Date;

  @Prop()
  payerBankName?: string;

  @Prop()
  payerAccountNumber?: string;

  @Prop()
  payerAccountName?: string;

  @Prop({ type: Object })
  rawWebhookPayload: Record<string, any>;

  @Prop()
  processedAt?: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
