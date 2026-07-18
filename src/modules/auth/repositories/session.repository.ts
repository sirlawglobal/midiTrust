import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../infrastructure/database/base.repository';
import { Session } from '../schemas/session.schema';

@Injectable()
export class SessionRepository extends BaseRepository<Session> {
  constructor(@InjectModel(Session.name) model: Model<Session>) {
    super(model);
  }

  async invalidateUserSessions(userId: string): Promise<boolean> {
    const res = await this.model.updateMany({ userId, isValid: true }, { isValid: false }).exec();
    return res.modifiedCount > 0;
  }
}
