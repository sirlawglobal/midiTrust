import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { BillingModule } from '../billing/billing.module';
import { PaymentsModule } from '../payments/payments.module';
import { ReceiptsModule } from '../receipts/receipts.module';

@Module({
  imports: [BillingModule, PaymentsModule, ReceiptsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
