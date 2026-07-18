import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Receipt, ReceiptSchema } from './schemas/receipt.schema';
import { ReceiptsRepository } from './receipts.repository';
import { ReceiptsService } from './receipts.service';
import { ReceiptsController } from './receipts.controller';
import { PdfGeneratorService } from './pdf-generator.service';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { BillingModule } from '../billing/billing.module';
import { PatientsModule } from '../patients/patients.module';
import { BullModule } from '@nestjs/bullmq';
import { ReceiptProcessor } from './receipt.processor';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Receipt.name, schema: ReceiptSchema }]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: { expiresIn: '10y' }, // Receipts are verified practically forever
      }),
    }),
    BullModule.registerQueue({
      name: 'receipt-generation-queue',
    }),
    BillingModule, // To access InvoicesRepository
    PatientsModule, // To access PatientsService
    SettingsModule, // To access SettingsService
  ],
  controllers: [ReceiptsController],
  providers: [
    ReceiptsRepository,
    ReceiptsService,
    PdfGeneratorService,
    StorageService,
    ReceiptProcessor,
  ],
  exports: [ReceiptsService, ReceiptsRepository],
})
export class ReceiptsModule {}
