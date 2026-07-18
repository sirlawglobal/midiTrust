import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { Invoice, InvoiceSchema } from './schemas/invoice.schema';
import { VirtualAccount, VirtualAccountSchema } from './schemas/virtual-account.schema';
import { InvoicesRepository } from './invoices.repository';
import { VirtualAccountsRepository } from './virtual-accounts.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invoice.name, schema: InvoiceSchema },
      { name: VirtualAccount.name, schema: VirtualAccountSchema },
    ]),
  ],
  controllers: [BillingController],
  providers: [BillingService, InvoicesRepository, VirtualAccountsRepository],
  exports: [BillingService, InvoicesRepository, VirtualAccountsRepository],
})
export class BillingModule {}
