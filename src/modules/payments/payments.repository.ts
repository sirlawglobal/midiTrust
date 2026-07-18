import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment } from './schemas/payment.schema';
import { BaseRepository } from '../../infrastructure/database/base.repository';

@Injectable()
export class PaymentsRepository extends BaseRepository<Payment> {
  constructor(@InjectModel(Payment.name) private readonly paymentModel: Model<Payment>) {
    super(paymentModel);
  }

  async findByPaymentReference(paymentReference: string): Promise<Payment | null> {
    return this.findOne({ paymentReference });
  }

  async findByInvoiceId(invoiceId: string): Promise<Payment[]> {
    return this.find({ invoiceId: invoiceId as any });
  }
}
