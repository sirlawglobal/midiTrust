import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { InvoiceStatus } from '../../../common/enums/invoice-status.enum';

@Schema({ _id: false })
export class InvoiceItem {
  @Prop({ required: true })
  description: string;

  @Prop()
  serviceCode?: string;

  @Prop()
  department?: string;

  @Prop({ required: true, default: 1 })
  quantity: number;

  @Prop({ required: true })
  unitPrice: number;

  @Prop({ required: true })
  totalAmount: number;
}
export const InvoiceItemSchema = SchemaFactory.createForClass(InvoiceItem);

@Schema({ timestamps: true })
export class Invoice extends Document {
  @Prop({ required: true, unique: true, index: true })
  invoiceNumber: string; // e.g., INV-2026-000001

  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true, index: true })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  issuedBy: Types.ObjectId;

  @Prop({ type: [InvoiceItemSchema], required: true })
  items: InvoiceItem[];

  @Prop({ required: true, default: 0 })
  subTotal: number;

  @Prop({ required: true, default: 0 })
  taxTotal: number;

  @Prop({ required: true, default: 0 })
  grandTotal: number;

  @Prop({ required: true, default: 0 })
  amountPaid: number;

  @Prop({ required: true, enum: InvoiceStatus, default: InvoiceStatus.PENDING_PAYMENT })
  status: InvoiceStatus;

  @Prop()
  dueDate?: Date;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
