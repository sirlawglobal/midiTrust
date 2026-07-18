import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';

export interface ReceiptData {
  hospitalName: string;
  hospitalAddress: string;
  receiptNumber: string;
  invoiceNumber: string;
  paymentReference: string;
  patientName: string;
  patientId: string;
  date: Date;
  items: { description: string; quantity: number; unitPrice: number; totalPrice: number }[];
  amountPaid: number;
  totalAmount: number;
  qrCodeDataUrl: string; // The base64 QR code image
}

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);

  async generateQrCode(data: string): Promise<string> {
    try {
      return await QRCode.toDataURL(data, { errorCorrectionLevel: 'H', margin: 1, width: 150 });
    } catch (error) {
      this.logger.error('Failed to generate QR Code', error);
      throw new Error('Failed to generate QR Code');
    }
  }

  async generateReceiptPdf(data: ReceiptData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // Header
        doc.fontSize(20).font('Helvetica-Bold').text(data.hospitalName, { align: 'center' });
        doc.fontSize(10).font('Helvetica').text(data.hospitalAddress, { align: 'center' });
        doc.moveDown(2);

        // Title
        doc.fontSize(16).font('Helvetica-Bold').text('OFFICIAL PAYMENT RECEIPT', { align: 'center' });
        doc.moveDown();

        // Info Box
        doc.fontSize(10).font('Helvetica');
        const startY = doc.y;
        
        doc.text(`Receipt No: ${data.receiptNumber}`, 50, startY);
        doc.text(`Invoice No: ${data.invoiceNumber}`, 50, startY + 15);
        doc.text(`Payment Ref: ${data.paymentReference}`, 50, startY + 30);
        
        doc.text(`Date: ${data.date.toLocaleDateString()}`, 350, startY);
        doc.text(`Patient: ${data.patientName}`, 350, startY + 15);
        doc.text(`Patient ID: ${data.patientId}`, 350, startY + 30);
        
        doc.moveDown(3);

        // Table Header
        const tableTop = doc.y;
        doc.font('Helvetica-Bold');
        doc.text('Description', 50, tableTop);
        doc.text('Qty', 300, tableTop, { width: 50, align: 'right' });
        doc.text('Unit Price', 380, tableTop, { width: 70, align: 'right' });
        doc.text('Total', 480, tableTop, { width: 65, align: 'right' });
        
        doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke();
        
        // Table Rows
        let yPosition = tableTop + 25;
        doc.font('Helvetica');
        data.items.forEach((item) => {
          doc.text(item.description, 50, yPosition);
          doc.text(item.quantity.toString(), 300, yPosition, { width: 50, align: 'right' });
          doc.text(`N ${item.unitPrice.toLocaleString()}`, 380, yPosition, { width: 70, align: 'right' });
          doc.text(`N ${item.totalPrice.toLocaleString()}`, 480, yPosition, { width: 65, align: 'right' });
          yPosition += 20;
        });

        doc.moveTo(50, yPosition).lineTo(545, yPosition).stroke();
        yPosition += 15;

        // Totals
        doc.font('Helvetica-Bold');
        doc.text('Total Amount:', 350, yPosition);
        doc.text(`N ${data.totalAmount.toLocaleString()}`, 450, yPosition, { width: 95, align: 'right' });
        yPosition += 20;
        
        doc.text('Amount Paid:', 350, yPosition);
        doc.text(`N ${data.amountPaid.toLocaleString()}`, 450, yPosition, { width: 95, align: 'right' });

        doc.moveDown(4);

        // QR Code
        doc.image(data.qrCodeDataUrl, 50, doc.y, { width: 100 });
        doc.fontSize(8).font('Helvetica-Oblique').text('Scan to verify receipt authenticity.', 50, doc.y + 105);

        // Footer
        doc.fontSize(10).font('Helvetica').text('Thank you for choosing MediTrust.', 50, 700, { align: 'center', width: 495 });

        doc.end();
      } catch (error) {
        this.logger.error('Failed to generate PDF', error);
        reject(error);
      }
    });
  }
}
