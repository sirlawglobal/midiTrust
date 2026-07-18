import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

@Schema({ timestamps: true, collection: 'sessions' })
export class Session extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId | User;

  @Prop({ required: true, index: true })
  refreshTokenHash!: string;

  @Prop({ required: false })
  ipAddress?: string;

  @Prop({ required: false })
  userAgent?: string;

  @Prop({ required: true, default: true, index: true })
  isValid!: boolean;

  @Prop({ required: true, index: { expireAfterSeconds: 0 } })
  expiresAt!: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);
SessionSchema.index({ userId: 1, isValid: 1 });
SessionSchema.index({ refreshTokenHash: 1 });
