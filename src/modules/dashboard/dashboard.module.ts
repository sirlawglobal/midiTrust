import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { BillingModule } from '../billing/billing.module';
import { PaymentsModule } from '../payments/payments.module';
import { ReceiptsModule } from '../receipts/receipts.module';
import { PatientsModule } from '../patients/patients.module';

@Module({
  imports: [BillingModule, PaymentsModule, ReceiptsModule, PatientsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
