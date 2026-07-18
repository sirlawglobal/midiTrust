import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SendEmailDto {
  to: string;
  subject: string;
  htmlContent: string;
  attachmentUrl?: string;
  attachmentName?: string;
}

@Injectable()
export class BrevoClientService {
  private readonly logger = new Logger(BrevoClientService.name);
  private readonly apiUrl = 'https://api.brevo.com/v3/smtp/email';
  private readonly apiKey: string;
  private readonly senderEmail: string;
  private readonly senderName: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('messaging.email.brevo.apiKey') || this.configService.get<string>('messaging.brevo.apiKey') || '';
    this.senderEmail = this.configService.get<string>('messaging.email.from') || this.configService.get<string>('messaging.brevo.senderEmail') || 'no-reply@meditrust.app';
    this.senderName = this.configService.get<string>('messaging.email.fromName') || this.configService.get<string>('messaging.brevo.senderName') || 'MediTrust Hospital';
  }

  async sendEmail(data: SendEmailDto): Promise<any> {
    if (!this.apiKey || this.apiKey === 'dummy_brevo_api_key' || this.apiKey === '') {
      this.logger.warn(`Brevo API key is missing. Mocking email dispatch to ${data.to}`);
      return { messageId: `mock-brevo-id-${Date.now()}` };
    }

    const payload: any = {
      sender: { name: this.senderName, email: this.senderEmail },
      to: [{ email: data.to }],
      subject: data.subject,
      htmlContent: data.htmlContent,
    };

    if (data.attachmentUrl && data.attachmentName) {
      payload.attachment = [
        {
          url: data.attachmentUrl,
          name: data.attachmentName,
        },
      ];
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        this.logger.error(`Brevo email failed: ${JSON.stringify(errorData)}`);
        throw new InternalServerErrorException('Failed to send email via Brevo');
      }

      const responseData = await response.json();
      this.logger.log(`Email successfully sent via Brevo to ${data.to}. MessageId: ${responseData.messageId}`);
      return responseData;
    } catch (error) {
      this.logger.error(`Error communicating with Brevo: ${error.message}`, error.stack);
      throw error;
    }
  }
}
