import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Receipt } from './schemas/receipt.schema';
import { BaseRepository } from '../../infrastructure/database/base.repository';

@Injectable()
export class ReceiptsRepository extends BaseRepository<Receipt> {
  constructor(@InjectModel(Receipt.name) private readonly receiptModel: Model<Receipt>) {
    super(receiptModel);
  }

  async findByReceiptNumber(receiptNumber: string): Promise<Receipt | null> {
    return this.findOne({ receiptNumber });
  }

  async findByInvoiceId(invoiceId: string): Promise<Receipt | null> {
    return this.findOne({ invoiceId: invoiceId as any });
  }

  async findByToken(token: string): Promise<Receipt | null> {
    return this.findOne({ signedJwtToken: token });
  }
}
