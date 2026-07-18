import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryOptions } from 'mongoose';
import { BaseRepository } from '../../../infrastructure/database/base.repository';
import { User } from '../schemas/user.schema';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(@InjectModel(User.name) model: Model<User>) {
    super(model);
  }

  async findByEmail(email: string, includePassword = false): Promise<User | null> {
    const query = this.model.findOne({ email: email.toLowerCase() });
    if (includePassword) {
      query.select('+passwordHash');
    }
    return query.populate('roleId').exec();
  }

  async findByIdWithRole(id: string, options?: QueryOptions): Promise<User | null> {
    return this.model.findById(id, undefined, options).populate('roleId').exec();
  }
}
