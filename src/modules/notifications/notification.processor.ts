import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationsRepository } from './notifications.repository';
import { NotificationChannel } from './schemas/notification.schema';
import { BrevoClientService } from '../../infrastructure/mailer/brevo-client.service';
import { WhatsAppClientService } from '../../infrastructure/messaging/whatsapp-client.service';
import { StorageService } from '../../infrastructure/storage/storage.service';

@Processor('notification-dispatch-queue')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly brevoClientService: BrevoClientService,
    private readonly whatsAppClientService: WhatsAppClientService,
    private readonly storageService: StorageService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { notificationId } = job.data;
    const notification = await this.notificationsRepository.findById(notificationId);

    if (!notification) {
      this.logger.warn(`Notification record ${notificationId} not found, skipping.`);
      return;
    }

    try {
      this.logger.log(`Processing ${notification.channel} notification for ${notification.recipient}`);
      let providerResponse = null;

      switch (notification.channel) {
        case NotificationChannel.EMAIL:
          providerResponse = await this.processEmail(notification);
          break;
        case NotificationChannel.SMS:
          providerResponse = await this.processMockSms(notification);
          break;
        case NotificationChannel.WHATSAPP:
          providerResponse = await this.processWhatsApp(notification);
          break;
        default:
          throw new Error(`Unsupported channel ${notification.channel}`);
      }

      await this.notificationsRepository.markAsSent(notificationId, providerResponse);
      this.logger.log(`Successfully sent ${notification.channel} to ${notification.recipient}`);
    } catch (error) {
      this.logger.error(`Failed to send ${notification.channel} to ${notification.recipient}`, error);
      await this.notificationsRepository.markAsFailed(notificationId, error.message);
      throw error; // Re-throw to trigger BullMQ retry logic
    }
  }

  private async processEmail(notification: any): Promise<any> {
    const { receiptUrl, receiptNumber, patientName, pdfBase64 } = notification.contextData;

    const htmlContent = `
      <h3>Dear ${patientName},</h3>
      <p>Your payment was successfully received.</p>
      <p>Receipt Number: <strong>${receiptNumber}</strong></p>
      <p>Your official digital receipt is attached to this email.</p>
      <br/>
      <p>Thank you for choosing MediTrust Hospital.</p>
    `;

    return this.brevoClientService.sendEmail({
      to: notification.recipient,
      subject: `Payment Receipt - ${receiptNumber}`,
      htmlContent,
      // Use raw base64 PDF bytes directly — bypasses all Cloudinary URL/ACL issues
      attachmentContent: pdfBase64 || undefined,
      attachmentUrl: pdfBase64 ? undefined : receiptUrl,
      attachmentName: `${receiptNumber}.pdf`,
    });
  }

  private async processMockSms(notification: any): Promise<any> {
    const { receiptUrl, receiptNumber } = notification.contextData;
    const text = `MediTrust: Payment successful. Receipt ${receiptNumber}. View here: ${receiptUrl}`;
    
    // MOCK API CALL
    return new Promise((resolve) => {
      setTimeout(() => {
        this.logger.log(`[MOCK SMS] Sent to ${notification.recipient}: "${text}"`);
        resolve({ provider: 'mock-sms', status: 'delivered', messageId: `sms-${Date.now()}` });
      }, 500); // simulate network latency
    });
  }

  private async processWhatsApp(notification: any): Promise<any> {
    const { receiptUrl, receiptNumber, patientName, pdfCloudinaryId } = notification.contextData;
    const caption = `Hi ${patientName || 'there'}, here's your MediTrust payment receipt (${receiptNumber}). Thank you for choosing us!`;

    // Prefer a signed Cloudinary download URL — Cloudinary blocks unauthenticated
    // delivery of raw PDF files by default, so the plain `receiptUrl` may not be
    // fetchable by Meta's servers.
    const documentUrl = pdfCloudinaryId
      ? this.storageService.getSignedPdfDownloadUrl(pdfCloudinaryId)
      : receiptUrl;

    if (documentUrl) {
      try {
        return await this.whatsAppClientService.sendDocumentMessage(
          notification.recipient,
          documentUrl,
          `${receiptNumber}.pdf`,
          caption,
        );
      } catch (error: any) {
        this.logger.warn(`WhatsApp document delivery failed for ${notification.recipient}, falling back to text: ${error.message}`);
      }
    }

    // Fallback: plain text message with a link, in case document delivery fails
    // (unreachable/expired link) or no document is available at all.
    return this.whatsAppClientService.sendTextMessage(
      notification.recipient,
      documentUrl ? `${caption} View/download: ${documentUrl}` : caption,
    );
  }
}
