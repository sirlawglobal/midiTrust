import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ReceiptsRepository } from './receipts.repository';
import { PdfGeneratorService } from './pdf-generator.service';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { SettingsService } from '../settings/settings.service';

@Processor('receipt-generation-queue')
export class ReceiptProcessor extends WorkerHost {
  private readonly logger = new Logger(ReceiptProcessor.name);

  constructor(
    private readonly receiptsRepository: ReceiptsRepository,
    private readonly pdfGenerator: PdfGeneratorService,
    private readonly storageService: StorageService,
    private readonly settingsService: SettingsService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { receiptData, patient, invoice, payment, signedJwtToken, qrCodeDataUrl } = job.data;
    
    this.logger.log(`Processing asynchronous PDF generation for receipt ${receiptData.receiptNumber}`);

    try {
      // Map Invoice Items
      const items = invoice.items.map((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalAmount || item.totalPrice || 0,
      }));

      // Fetch dynamic settings instead of hardcoding
      const hospitalName = await this.settingsService.getSetting('hospitalName', 'MediTrust Hospital');
      const hospitalAddress = await this.settingsService.getSetting('hospitalAddress', '123 Health Avenue, Medical District');

      // Generate PDF
      const pdfBuffer = await this.pdfGenerator.generateReceiptPdf({
        hospitalName,
        hospitalAddress,
        receiptNumber: receiptData.receiptNumber,
        invoiceNumber: invoice.invoiceNumber,
        paymentReference: payment.paymentReference,
        patientName: `${patient.firstName} ${patient.lastName}`,
        patientId: patient.patientNumber || patient._id.toString(), // Support actual patient number
        date: new Date(),
        items,
        amountPaid: payment.amountPaid,
        totalAmount: invoice.grandTotal || invoice.totalAmount, 
        qrCodeDataUrl,
      });

      const filename = `${receiptData.receiptNumber}.pdf`;

      // Upload to Cloudinary for archival (resource_type 'raw' so it uploads correctly)
      let pdfUrl = '';
      let pdfCloudinaryId = '';
      try {
        const uploadResult = await this.storageService.uploadPdf(pdfBuffer, filename);
        pdfUrl = uploadResult.url;
        pdfCloudinaryId = uploadResult.publicId;
        this.logger.log(`Receipt PDF archived to Cloudinary: ${pdfUrl}`);
      } catch (uploadErr: any) {
        this.logger.warn(`Cloudinary upload failed (non-fatal): ${uploadErr.message}`);
      }

      // Save Receipt
      const receipt = await this.receiptsRepository.create({
        receiptNumber: receiptData.receiptNumber,
        invoiceId: invoice._id,
        paymentId: payment._id,
        patientId: patient._id,
        qrCodeDataUrl,
        signedJwtToken,
        pdfCloudinaryId,
        pdfUrl,
        issuedAt: new Date(),
      });

      this.logger.log(`Receipt ${receipt.receiptNumber} successfully generated.`);
      
      // Trigger notification dispatch — pass the raw PDF buffer as base64 to avoid
      // Cloudinary URL access issues when Brevo tries to download the attachment.
      this.eventEmitter.emit('receipt.generated', {
        ...receipt.toObject ? receipt.toObject() : receipt,
        pdfBase64: pdfBuffer.toString('base64'),
      });
      
      return { status: 'success', receiptUrl: pdfUrl };
    } catch (error) {
      this.logger.error(`Failed to generate receipt PDF for ${receiptData.receiptNumber}`, error);
      throw error;
    }
  }
}
