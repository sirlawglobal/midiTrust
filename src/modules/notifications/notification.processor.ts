import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationsRepository } from './notifications.repository';
import { NotificationChannel } from './schemas/notification.schema';
import { BrevoClientService } from '../../infrastructure/mailer/brevo-client.service';

@Processor('notification-dispatch-queue')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly brevoClientService: BrevoClientService,
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
          providerResponse = await this.processMockWhatsApp(notification);
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
    const { receiptUrl, receiptNumber, patientName } = notification.contextData;

    const htmlContent = `
      <h3>Dear ${patientName},</h3>
      <p>Your payment was successfully received.</p>
      <p>Receipt Number: <strong>${receiptNumber}</strong></p>
      <p>You can find your official digital receipt attached.</p>
      <br/>
      <p>Thank you for choosing MediTrust Hospital.</p>
    `;

    let attachmentContent: string | undefined;
    if (receiptUrl) {
      try {
        const response = await fetch(receiptUrl);
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          attachmentContent = Buffer.from(buffer).toString('base64');
          this.logger.log(`Successfully downloaded receipt PDF from Cloudinary for Brevo. Size: ${buffer.byteLength} bytes.`);
        } else {
          this.logger.warn(`Failed to download receipt from Cloudinary. Status: ${response.status}`);
        }
      } catch (err: any) {
        this.logger.error(`Error downloading receipt from ${receiptUrl}`, err.message);
      }
    }

    return this.brevoClientService.sendEmail({
      to: notification.recipient,
      subject: `Payment Receipt - ${receiptNumber}`,
      htmlContent,
      attachmentContent,
      attachmentUrl: attachmentContent ? undefined : receiptUrl,
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

  private async processMockWhatsApp(notification: any): Promise<any> {
    const { receiptUrl, receiptNumber } = notification.contextData;
    
    // MOCK API CALL
    return new Promise((resolve) => {
      setTimeout(() => {
        this.logger.log(`[MOCK WHATSAPP] Sent Document PDF to ${notification.recipient}. Document URL: ${receiptUrl}`);
        resolve({ provider: 'mock-whatsapp', status: 'delivered', messageId: `wa-${Date.now()}` });
      }, 500);
    });
  }
}
