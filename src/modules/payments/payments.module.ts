import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MonnifyClientService } from './monnify-client.service';
import { PaymentsRepository } from './payments.repository';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { BillingModule } from '../billing/billing.module';
import { PatientsModule } from '../patients/patients.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
    BillingModule,
    PatientsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, MonnifyClientService, PaymentsRepository],
  exports: [PaymentsService, PaymentsRepository],
})
export class PaymentsModule {}
