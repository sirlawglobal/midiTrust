import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VerificationService } from './verification.service';
import { VerificationController } from './verification.controller';
import { Receipt, ReceiptSchema } from '../receipts/schemas/receipt.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Receipt.name, schema: ReceiptSchema }]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        // No expiration validation required here because it is handled dynamically
        // but jwt setup requires it if default expires.
      }),
    }),
  ],
  controllers: [VerificationController],
  providers: [VerificationService],
})
export class VerificationModule {}
