import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Receipt } from '../receipts/schemas/receipt.schema';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    private readonly jwtService: JwtService,
    @InjectModel(Receipt.name) private readonly receiptModel: Model<Receipt>,
  ) {}

  async verifyReceipt(token: string) {
    try {
      // 1. Cryptographically verify the token
      const payload = this.jwtService.verify(token);

      // 2. Look up the receipt in the database
      const receipt = await this.receiptModel.findOne({ signedJwtToken: token });

      if (!receipt) {
        throw new NotFoundException('Receipt not found in the system');
      }

      // 3. Update the verification count and timestamps
      receipt.isVerified = true;
      receipt.verificationCount += 1;
      receipt.lastVerifiedAt = new Date();
      await receipt.save();

      this.logger.log(`Receipt ${receipt.receiptNumber} successfully verified. Scan count: ${receipt.verificationCount}`);

      return {
        status: 'VALID_PAYMENT_CONFIRMED',
        message: 'The receipt is cryptographically valid and payment is confirmed.',
        receiptDetails: {
          receiptNumber: receipt.receiptNumber,
          amountPaid: payload.amountPaid,
          issuedAt: receipt.issuedAt,
          scanCount: receipt.verificationCount,
          lastVerifiedAt: receipt.lastVerifiedAt,
        },
      };
    } catch (error) {
      this.logger.warn(`Verification failed for token: ${error.message}`);
      throw new BadRequestException('Invalid or tampered receipt token');
    }
  }
}
