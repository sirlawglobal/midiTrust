import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../infrastructure/database/base.repository';
import { Role } from '../schemas/role.schema';

@Injectable()
export class RoleRepository extends BaseRepository<Role> {
  constructor(@InjectModel(Role.name) model: Model<Role>) {
    super(model);
  }

  async findByName(name: string): Promise<Role | null> {
    return this.model.findOne({ name: name.toUpperCase() }).exec();
  }
}
