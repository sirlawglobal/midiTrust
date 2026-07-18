import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Receipt extends Document {
  @Prop({ required: true, unique: true, index: true })
  receiptNumber: string; // e.g., "RCP-2026-99182"

  @Prop({ type: Types.ObjectId, ref: 'Invoice', required: true, unique: true, index: true })
  invoiceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Payment', required: true, unique: true, index: true })
  paymentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true, index: true })
  patientId: Types.ObjectId;

  @Prop()
  qrCodeDataUrl?: string; // Base64 or verification URL encoded inside QR

  @Prop({ required: true, index: true })
  signedJwtToken: string; // High-security cryptographic verification token

  @Prop()
  pdfCloudinaryId?: string; // Cloudinary Public ID

  @Prop()
  pdfUrl?: string; // Public / Signed download URL

  @Prop({ required: true, index: true })
  issuedAt: Date;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ default: 0 })
  verificationCount: number;

  @Prop()
  lastVerifiedAt?: Date;
}

export const ReceiptSchema = SchemaFactory.createForClass(Receipt);
