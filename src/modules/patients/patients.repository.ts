import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Patient } from './schemas/patient.schema';
import { BaseRepository } from '../../infrastructure/database/base.repository';

@Injectable()
export class PatientsRepository extends BaseRepository<Patient> {
  constructor(@InjectModel(Patient.name) private readonly patientModel: Model<Patient>) {
    super(patientModel);
  }

  async countByYear(year: number): Promise<number> {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

    return this.patientModel.countDocuments({
      createdAt: {
        $gte: startOfYear,
        $lte: endOfYear,
      },
    }).exec();
  }

  async findByPhone(phone: string): Promise<Patient | null> {
    return this.findOne({ phone });
  }
}
