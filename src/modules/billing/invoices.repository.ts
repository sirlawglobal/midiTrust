import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Invoice } from './schemas/invoice.schema';
import { BaseRepository } from '../../infrastructure/database/base.repository';

@Injectable()
export class InvoicesRepository extends BaseRepository<Invoice> {
  constructor(@InjectModel(Invoice.name) private readonly invoiceModel: Model<Invoice>) {
    super(invoiceModel);
  }

  async countByYear(year: number): Promise<number> {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

    return this.invoiceModel.countDocuments({
      createdAt: {
        $gte: startOfYear,
        $lte: endOfYear,
      },
    }).exec();
  }
}
