import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MonnifyClientService {
  private readonly logger = new Logger(MonnifyClientService.name);
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(private readonly configService: ConfigService) { }

  private get apiKey(): string {
    return this.configService.get<string>('monnify.apiKey') || '';
  }

  private get secretKey(): string {
    return this.configService.get<string>('monnify.secretKey') || '';
  }

  private get contractCode(): string {
    return this.configService.get<string>('monnify.contractCode') || '';
  }

  private get baseUrl(): string {
    let url = this.configService.get<string>('monnify.baseUrl') || '';
    // Strip trailing slash if present
    if (url.endsWith('/')) url = url.slice(0, -1);
    // Strip accidental /api/v1 suffix if a user pasted it
    if (url.endsWith('/api/v1')) url = url.slice(0, -7);
    return url;
  }

  async authenticate(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const authString = Buffer.from(`${this.apiKey}:${this.secretKey}`).toString('base64');

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authString}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Monnify Auth failed: ${response.statusText}`);
      }

      const data: any = await response.json();
      if (data.requestSuccessful) {
        this.accessToken = data.responseBody.accessToken;
        // token usually expires in 1 hour (3600 seconds)
        this.tokenExpiresAt = Date.now() + (data.responseBody.expiresIn * 1000) - 5000; // 5s buffer
        return this.accessToken as string;
      }
      throw new Error(data.responseMessage || 'Authentication failed');
    } catch (error) {
      this.logger.error('Failed to authenticate with Monnify', error);
      throw new InternalServerErrorException('Payment gateway authentication failed');
    }
  }

  async reserveVirtualAccount(payload: {
    accountReference: string;
    accountName: string;
    customerEmail: string;
    customerName: string;
    customerBvn?: string;
  }): Promise<any> {
    const token = await this.authenticate();

    try {
      const response = await fetch(`${this.baseUrl}/api/v2/bank-transfer/reserved-accounts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountReference: payload.accountReference,
          accountName: payload.accountName,
          currencyCode: 'NGN',
          contractCode: this.contractCode,
          customerEmail: payload.customerEmail,
          customerName: payload.customerName,
          ...(payload.customerBvn && { customerBvn: payload.customerBvn }),
          getAllAvailableBanks: true,
        }),
      });

      const data: any = await response.json();
      if (!response.ok || !data.requestSuccessful) {
        this.logger.error(`Monnify VA Creation Error Response: ${JSON.stringify(data)}`);
        throw new Error(data.responseMessage || 'Failed to reserve virtual account');
      }

      return data.responseBody;
    } catch (error: any) {
      this.logger.error(`Failed to reserve virtual account: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Could not generate virtual account from payment gateway');
    }
  }

  async verifyTransaction(transactionReference: string): Promise<any> {
    const token = await this.authenticate();
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v2/merchant/transactions/query?transactionReference=${encodeURIComponent(transactionReference)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );
      const data: any = await response.json();
      if (!response.ok || !data.requestSuccessful) {
        throw new Error(data.responseMessage || 'Transaction verification failed');
      }
      return data.responseBody;
    } catch (error) {
      this.logger.error('Failed to verify transaction', error);
      throw new InternalServerErrorException('Could not verify transaction with payment gateway');
    }
  }
}
