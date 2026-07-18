import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { MonnifyClientService } from './monnify-client.service';
import { PaymentsRepository } from './payments.repository';
import { VirtualAccountsRepository } from '../billing/virtual-accounts.repository';
import { InvoicesRepository } from '../billing/invoices.repository';
import { PatientsService } from '../patients/patients.service';
import { PaymentStatus, PaymentMethod } from './schemas/payment.schema';
import { InvoiceStatus } from '../../common/enums/invoice-status.enum';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly monnifyClient: MonnifyClientService,
    private readonly paymentsRepository: PaymentsRepository,
    private readonly virtualAccountsRepository: VirtualAccountsRepository,
    private readonly invoicesRepository: InvoicesRepository,
    private readonly patientsService: PatientsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {}

  @OnEvent('invoice.created')
  async handleInvoiceCreated(invoice: any) {
    try {
      this.logger.log(`Processing virtual account for invoice ${invoice.invoiceNumber}`);

      const patient = await this.patientsService.findOne(invoice.patientId.toString());
      if (!patient) {
        throw new Error('Patient not found for invoice');
      }

      // We use invoiceNumber as accountReference to link it back easily
      const accountReference = `VA-${invoice.invoiceNumber}`;

      const monnifyResponse = await this.monnifyClient.reserveVirtualAccount({
        accountReference,
        accountName: `MediTrust - ${patient.firstName} ${patient.lastName}`,
        customerEmail: patient.email || 'billing@meditrust.com',
        customerName: `${patient.firstName} ${patient.lastName}`,
        customerBvn: (patient as any).bvn, // optional but recommended for compliance
      });

      // Monnify returns an array of accounts when getAllAvailableBanks=true
      // e.g. monnifyResponse.accounts = [{ accountNumber, accountName, bankName, bankCode }]
      const accounts: { accountNumber: string; accountName: string; bankName: string; bankCode: string }[] =
        monnifyResponse.accounts || [];

      // Use the first account as the primary one for display
      const primaryAccount = accounts[0] || {
        accountNumber: monnifyResponse.accountNumber || '',
        accountName: monnifyResponse.accountName || '',
        bankName: monnifyResponse.bankName || '',
        bankCode: '',
      };

      // Save the generated virtual account
      const virtualAccount = await this.virtualAccountsRepository.create({
        invoiceId: invoice._id,
        patientId: patient._id,
        accountNumber: primaryAccount.accountNumber,
        accountName: primaryAccount.accountName,
        bankName: primaryAccount.bankName,
        accounts,
        reference: accountReference,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // default 24h
      });

      // Update invoice to link virtual account
      await this.invoicesRepository.updateById(invoice._id.toString(), {
        virtualAccountId: virtualAccount._id as any,
      });

      this.logger.log(
        `Successfully generated ${accounts.length} Virtual Account(s) for invoice ${invoice.invoiceNumber}. ` +
          `Primary: ${primaryAccount.accountNumber} (${primaryAccount.bankName})`,
      );

      // Emit event so the frontend can receive the generated accounts in real-time
      this.eventEmitter.emit('virtual_account.created', {
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        virtualAccount: { accounts },
      });
    } catch (error) {
      this.logger.error(`Failed to generate virtual account for invoice ${invoice.invoiceNumber}`, error);
      // In production, we might want to schedule a retry or emit an alert
    }
  }

  async processMonnifyWebhook(rawBody: Buffer, signature: string): Promise<any> {
    const webhookSecret = this.configService.get<string>('monnify.webhookSecret');

    // Verify HMAC-SHA512 Signature
    const hash = crypto.createHmac('sha512', webhookSecret as string).update(rawBody).digest('hex');

    if (hash !== signature) {
      this.logger.warn(`Webhook signature mismatch. Expected ${hash}, got ${signature}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    // Monnify wraps all transaction data inside an "eventData" object
    const payload = JSON.parse(rawBody.toString('utf-8'));
    const eventData = payload.eventData;

    if (!eventData) {
      throw new BadRequestException('Malformed webhook payload: missing eventData');
    }

    this.logger.log(
      `Received verified webhook: eventType=${payload.eventType}, transactionReference=${eventData.transactionReference}`,
    );

    // Idempotency check: see if payment already exists
    const existingPayment = await this.paymentsRepository.findByPaymentReference(eventData.transactionReference);
    if (existingPayment) {
      this.logger.log(`Transaction ${eventData.transactionReference} already processed. Skipping.`);
      return { status: 'success' };
    }

    // Find the virtual account by the product reference in eventData
    const virtualAccount = await this.virtualAccountsRepository.findByReference(eventData.product?.reference);
    if (!virtualAccount) {
      this.logger.error(`Virtual account not found for reference ${eventData.product?.reference}`);
      throw new NotFoundException('Virtual account not found');
    }

    const invoice = await this.invoicesRepository.findById(virtualAccount.invoiceId.toString());
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Server-side verification: call Monnify to confirm the payment status
    // This prevents trusting a tampered or replayed webhook payload
    const verifiedTransaction = await this.monnifyClient.verifyTransaction(eventData.transactionReference);
    const confirmedStatus: string = verifiedTransaction.paymentStatus;
    const confirmedAmountPaid: number = verifiedTransaction.amountPaid;

    this.logger.log(
      `Server-side verification: txRef=${eventData.transactionReference}, status=${confirmedStatus}, amountPaid=${confirmedAmountPaid}`,
    );

    // Determine payment status from the verified transaction (not the webhook payload)
    let status = PaymentStatus.PENDING;
    if (confirmedStatus === 'PAID') {
      if (confirmedAmountPaid >= invoice.grandTotal) {
        status = confirmedAmountPaid > invoice.grandTotal ? PaymentStatus.OVERPAID : PaymentStatus.PAID;
      } else {
        status = PaymentStatus.PARTIAL;
      }
    } else if (confirmedStatus === 'FAILED') {
      status = PaymentStatus.FAILED;
    }

    // paymentSourceInformation is an array of sender bank details (for ACCOUNT_TRANSFER)
    const paymentSource = eventData.paymentSourceInformation?.[0];

    const payment = await this.paymentsRepository.create({
      paymentReference: eventData.transactionReference,
      invoiceId: invoice._id,
      patientId: virtualAccount.patientId,
      accountReference: virtualAccount.reference,
      amountPaid: confirmedAmountPaid,
      fee: verifiedTransaction.settlementAmount
        ? confirmedAmountPaid - verifiedTransaction.settlementAmount
        : 0,
      netAmount: verifiedTransaction.settlementAmount || confirmedAmountPaid,
      currency: eventData.currencyCode || 'NGN',
      paymentMethod:
        eventData.paymentMethod === 'ACCOUNT_TRANSFER' ? PaymentMethod.ACCOUNT_TRANSFER : PaymentMethod.CARD,
      status,
      paidOn: eventData.paidOn ? new Date(eventData.paidOn) : new Date(),
      // Payer info lives inside paymentSourceInformation array (ACCOUNT_TRANSFER only)
      payerBankName: paymentSource?.bankCode,
      payerAccountNumber: paymentSource?.accountNumber,
      payerAccountName: paymentSource?.accountName,
      rawWebhookPayload: payload,
      processedAt: new Date(),
    });

    // If fully paid or overpaid, update invoice status
    if (status === PaymentStatus.PAID || status === PaymentStatus.OVERPAID) {
      await this.invoicesRepository.updateById(invoice._id.toString(), {
        status: InvoiceStatus.PAID,
        amountPaid: confirmedAmountPaid,
        paidAt: new Date(),
      });

      this.eventEmitter.emit('payment.completed', payment);
    }

    return { status: 'success' };
  }
}
