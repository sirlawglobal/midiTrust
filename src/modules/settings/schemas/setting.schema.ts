import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Setting extends Document {
  @Prop({ required: true, unique: true, index: true })
  key: string;

  @Prop({ type: Object, required: true })
  value: any;

  @Prop({ default: 'System setting' })
  description: string;

  @Prop({ default: true })
  isPublic: boolean; // If true, can be read without auth (e.g. hospital name)
}

export const SettingSchema = SchemaFactory.createForClass(Setting);
