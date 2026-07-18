import { Controller, Post, Req, Headers, Param, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';
import { InvoicesRepository } from '../billing/invoices.repository';

@ApiTags('Payments & Webhooks')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly invoicesRepository: InvoicesRepository,
  ) {}

  @Post('invoices/:id/generate-account')
  @ApiOperation({ summary: 'Manually generate a virtual account for an invoice (Retry)' })
  @ApiResponse({ status: 200, description: 'Virtual account generation triggered.' })
  async generateAccount(@Param('id') id: string) {
    const invoice = await this.invoicesRepository.findById(id);
    if (!invoice) {
      throw new BadRequestException('Invoice not found');
    }
    // We reuse the event handler logic for manual retries
    await this.paymentsService.handleInvoiceCreated(invoice);
    return { success: true, message: 'Virtual account generation triggered' };
  }

  @Post('webhooks/monnify')
  @ApiOperation({ summary: 'Monnify payment webhook endpoint' })
  @ApiHeader({ name: 'monnify-signature', description: 'HMAC SHA512 Signature' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully.' })
  async handleMonnifyWebhook(
    @Req() req: Request,
    @Headers('monnify-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing monnify-signature header');
    }

    // req.rawBody is populated because we set { rawBody: true } in main.ts
    const rawBody = (req as any).rawBody;
    if (!rawBody) {
      throw new BadRequestException('Raw body is missing. Ensure { rawBody: true } is configured in NestFactory.');
    }

    return this.paymentsService.processMonnifyWebhook(rawBody, signature);
  }
}
