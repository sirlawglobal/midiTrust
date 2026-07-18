import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class VirtualAccount extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Invoice', required: true, index: true })
  invoiceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true, index: true })
  patientId: Types.ObjectId;

  // Primary account (first in the array) for backward compat display
  @Prop({ required: true })
  accountNumber: string;

  @Prop({ required: true })
  accountName: string;

  @Prop({ required: true })
  bankName: string;

  // Full array of all reserved accounts across banks
  @Prop({ type: [{ accountNumber: String, accountName: String, bankName: String, bankCode: String }], default: [] })
  accounts: { accountNumber: string; accountName: string; bankName: string; bankCode: string }[];

  @Prop({ required: true, unique: true })
  reference: string;

  @Prop()
  expiresAt?: Date;
}

export const VirtualAccountSchema = SchemaFactory.createForClass(VirtualAccount);
