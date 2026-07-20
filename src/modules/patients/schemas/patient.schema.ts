import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } })
export class Patient extends Document {
  @Prop({ required: true, unique: true, index: true })
  hospitalId: string; // e.g. PAT-2026-000001

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true })
  phone: string;

  @Prop()
  bvn?: string; // Required by Monnify for virtual account compliance

  @Prop()
  email?: string;

  @Prop()
  dob?: Date;

  @Prop({ enum: ['MALE', 'FEMALE', 'OTHER'] })
  gender?: string;

  @Prop()
  address?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const PatientSchema = SchemaFactory.createForClass(Patient);

// The API contract (see README) documents the patient's human-readable ID as
// `patientNumber`, but it's stored on the `hospitalId` field. Expose it as a virtual
// alias so every consumer (frontend patient pages, receipt PDF generation) that reads
// `patientNumber` gets the real value instead of silently getting `undefined`.
PatientSchema.virtual('patientNumber').get(function (this: Patient) {
  return this.hospitalId;
});

// Add text index for searching
PatientSchema.index({ firstName: 'text', lastName: 'text', phone: 'text', hospitalId: 'text' });
