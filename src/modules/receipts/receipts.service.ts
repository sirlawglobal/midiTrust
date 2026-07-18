import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ReceiptsRepository } from './receipts.repository';
import { PdfGeneratorService } from './pdf-generator.service';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { InvoicesRepository } from '../billing/invoices.repository';
import { PatientsService } from '../patients/patients.service';

@Injectable()
export class ReceiptsService {
  private readonly logger = new Logger(ReceiptsService.name);

  constructor(
    private readonly receiptsRepository: ReceiptsRepository,
    private readonly pdfGenerator: PdfGeneratorService,
    private readonly storageService: StorageService,
    private readonly invoicesRepository: InvoicesRepository,
    private readonly patientsService: PatientsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue('receipt-generation-queue') private readonly receiptQueue: Queue,
  ) {}

  @OnEvent('payment.completed')
  async handlePaymentCompleted(payment: any) {
    this.logger.log(`Queueing receipt generation for payment ${payment.paymentReference}`);

    try {
      const invoice = await this.invoicesRepository.findById(payment.invoiceId.toString());
      if (!invoice) throw new Error('Invoice not found');

      const patient = await this.patientsService.findOne(payment.patientId.toString());
      if (!patient) throw new Error('Patient not found');

      // Generate Cryptographic JWT
      const receiptData = {
        receiptNumber: `RCP-${Date.now()}`,
        invoiceId: invoice._id,
        paymentId: payment._id,
        patientId: patient._id,
        amountPaid: payment.amountPaid,
        timestamp: new Date().toISOString(),
      };
      const signedJwtToken = this.jwtService.sign(receiptData);

      // Generate verification URL
      const frontendUrl = this.configService.get<string>('app.frontendUrl') || 'http://localhost:3000';
      const verificationUrl = `${frontendUrl}/verify?token=${signedJwtToken}`;

      // Encode into QR Code
      const qrCodeDataUrl = await this.pdfGenerator.generateQrCode(verificationUrl);

      // Push to BullMQ for asynchronous PDF generation and upload
      await this.receiptQueue.add('generate-receipt', {
        receiptData,
        patient,
        invoice,
        payment,
        signedJwtToken,
        qrCodeDataUrl,
      });

      this.logger.log(`Receipt generation job queued for ${receiptData.receiptNumber}.`);
    } catch (error) {
      this.logger.error(`Failed to queue receipt for payment ${payment.paymentReference}`, error);
    }
  }

  async findByReceiptNumber(receiptNumber: string) {
    return this.receiptsRepository.findByReceiptNumber(receiptNumber);
  }

  async resendReceipt(receiptId: string) {
    const receipt = await this.receiptsRepository.findById(receiptId);
    if (!receipt) throw new Error('Receipt not found');
    this.eventEmitter.emit('receipt.generated', receipt);
    return { status: 'success', message: 'Receipt resend queued' };
  }
}
