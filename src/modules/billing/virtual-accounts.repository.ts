import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VirtualAccount } from './schemas/virtual-account.schema';
import { BaseRepository } from '../../infrastructure/database/base.repository';

@Injectable()
export class VirtualAccountsRepository extends BaseRepository<VirtualAccount> {
  constructor(@InjectModel(VirtualAccount.name) private readonly virtualAccountModel: Model<VirtualAccount>) {
    super(virtualAccountModel);
  }

  async findByInvoiceId(invoiceId: string): Promise<VirtualAccount | null> {
    return this.findOne({ invoiceId: invoiceId as any });
  }

  async findByReference(reference: string): Promise<VirtualAccount | null> {
    return this.findOne({ reference });
  }
}
