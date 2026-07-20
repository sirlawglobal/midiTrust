import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { VerificationService } from './verification.service';

import { VerifyReceiptDto } from './dto/verify-receipt.dto';

@ApiTags('Verification')
@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post('verify')
  @ApiOperation({ summary: 'Verify a receipt using its cryptographic JWT token (from QR code)' })
  async verifyReceipt(@Body() body: VerifyReceiptDto) {
    return this.verificationService.verifyReceipt(body.token);
  }
}
