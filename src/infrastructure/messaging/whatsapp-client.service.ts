import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsAppClientService {
  private readonly logger = new Logger(WhatsAppClientService.name);

  constructor(private readonly configService: ConfigService) {}

  private get apiUrl(): string {
    return this.configService.get<string>('messaging.whatsapp.apiUrl') || 'https://graph.facebook.com/v20.0';
  }

  private get phoneNumberId(): string {
    return this.configService.get<string>('messaging.whatsapp.phoneNumberId') || '';
  }

  private get accessToken(): string {
    return this.configService.get<string>('messaging.whatsapp.accessToken') || '';
  }

  /**
   * Sends a free-form text message via the WhatsApp Cloud API.
   * Note: outside of a 24h customer-service window, Meta only allows pre-approved
   * message templates for business-initiated messages. This is used as a best-effort
   * notification and as the fallback when document delivery fails.
   */
  async sendTextMessage(to: string, body: string): Promise<any> {
    return this.post({
      messaging_product: 'whatsapp',
      to: this.normalizePhoneNumber(to),
      type: 'text',
      text: { preview_url: true, body },
    });
  }

  /**
   * Sends a document (e.g. the receipt PDF) as a WhatsApp message. `documentUrl` must be
   * a publicly reachable HTTPS link that Meta's servers can fetch directly.
   */
  async sendDocumentMessage(to: string, documentUrl: string, filename: string, caption?: string): Promise<any> {
    return this.post({
      messaging_product: 'whatsapp',
      to: this.normalizePhoneNumber(to),
      type: 'document',
      document: { link: documentUrl, filename, caption },
    });
  }

  private async post(payload: Record<string, any>): Promise<any> {
    if (!this.phoneNumberId || !this.accessToken) {
      throw new InternalServerErrorException('WhatsApp is not configured (missing phoneNumberId/accessToken)');
    }

    const url = `${this.apiUrl}/${this.phoneNumberId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data: any = await response.json().catch(() => ({}));

    if (!response.ok) {
      this.logger.error(`WhatsApp API error (status ${response.status}) for ${payload.to}: ${JSON.stringify(data)}`);
      throw new InternalServerErrorException(data?.error?.message || 'Failed to send WhatsApp message');
    }

    return data;
  }

  // The Cloud API expects the recipient number in E.164 format without the leading '+'.
  private normalizePhoneNumber(phone: string): string {
    return phone.replace(/[^\d]/g, '');
  }
}
