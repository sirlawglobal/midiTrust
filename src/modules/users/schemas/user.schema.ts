import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Role } from './role.schema';

@Schema({ timestamps: true, collection: 'users' })
export class User extends Document {
  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email!: string;

  @Prop({ required: true, select: false })
  passwordHash!: string;

  @Prop({ required: true, trim: true })
  firstName!: string;

  @Prop({ required: true, trim: true })
  lastName!: string;

  @Prop({ required: true, index: true })
  phone!: string;

  @Prop({ type: Types.ObjectId, ref: 'Role', required: true, index: true })
  roleId!: Types.ObjectId | Role;

  @Prop({ required: false })
  department?: string;

  @Prop({ required: true, default: true, index: true })
  isActive!: boolean;

  @Prop({ required: false })
  lastLoginAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ roleId: 1, isActive: 1 });
UserSchema.index({ phone: 1 });
