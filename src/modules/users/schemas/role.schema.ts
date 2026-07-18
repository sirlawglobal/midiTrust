import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'roles' })
export class Role extends Document {
  @Prop({ required: true, unique: true, uppercase: true, trim: true, index: true })
  name!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ type: [String], default: [] })
  permissions!: string[];

  @Prop({ required: true, default: false })
  isSystemRole!: boolean;
}

export const RoleSchema = SchemaFactory.createForClass(Role);
RoleSchema.index({ name: 1 }, { unique: true });
