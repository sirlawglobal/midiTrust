import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Types } from 'mongoose';
import { NotificationsRepository } from './notifications.repository';
import { NotificationChannel, NotificationKind, AlertType } from './schemas/notification.schema';
import { Receipt } from '../receipts/schemas/receipt.schema';
import { PatientsService } from '../patients/patients.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly patientsService: PatientsService,
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue('notification-dispatch-queue') private readonly notificationQueue: Queue,
  ) {}

  @OnEvent('receipt.generated')
  async handleReceiptGenerated(receipt: Receipt & { pdfBase64?: string }) {
    this.logger.log(`Queueing notifications for Receipt ${receipt.receiptNumber}`);

    try {
      const patient = await this.patientsService.findOne(receipt.patientId.toString());
      if (!patient) throw new Error('Patient not found');

      // 1. Queue Email Notification
      if (patient.email) {
        await this.queueNotification(
          patient.email,
          NotificationChannel.EMAIL,
          'PAYMENT_RECEIPT',
          {
            patientName: patient.firstName,
            receiptNumber: receipt.receiptNumber,
            receiptUrl: receipt.pdfUrl,
            pdfBase64: receipt.pdfBase64, // Pass raw PDF bytes to avoid Cloudinary download issues
          },
          receipt._id as Types.ObjectId,
          'Receipt'
        );
      }

      // 2. Queue SMS Notification
      if (patient.phone) {
        await this.queueNotification(
          patient.phone,
          NotificationChannel.SMS,
          'PAYMENT_RECEIPT',
          {
            patientName: patient.firstName,
            receiptNumber: receipt.receiptNumber,
            receiptUrl: receipt.pdfUrl,
          },
          receipt._id as Types.ObjectId,
          'Receipt'
        );

        // 3. Queue WhatsApp Notification
        await this.queueNotification(
          patient.phone,
          NotificationChannel.WHATSAPP,
          'PAYMENT_RECEIPT',
          {
            patientName: patient.firstName,
            receiptNumber: receipt.receiptNumber,
            receiptUrl: receipt.pdfUrl,
            pdfCloudinaryId: receipt.pdfCloudinaryId,
          },
          receipt._id as Types.ObjectId,
          'Receipt'
        );
      }

    } catch (error) {
      this.logger.error(`Failed to queue notifications for receipt ${receipt.receiptNumber}`, error);
    }
  }

  private async queueNotification(
    recipient: string,
    channel: NotificationChannel,
    templateName: string,
    contextData: Record<string, any>,
    relatedEntityId: Types.ObjectId,
    relatedEntityType: string
  ) {
    // Save to DB as PENDING
    const notification = await this.notificationsRepository.create({
      recipient,
      channel,
      templateName,
      contextData,
      relatedEntityId,
      relatedEntityType,
    });

    // Push to BullMQ
    await this.notificationQueue.add('dispatch', {
      notificationId: notification._id,
    });

    this.logger.log(`Queued ${channel} notification for ${recipient}`);
  }

  // ---------------------------------------------------------------------------
  // In-app staff notification feed (bell icon + /notifications page)
  // ---------------------------------------------------------------------------

  async createSystemAlert(title: string, message: string, type: AlertType = AlertType.INFO) {
    const notification = await this.notificationsRepository.create({
      kind: NotificationKind.IN_APP,
      title,
      message,
      type,
      isRead: false,
    } as any);

    // Let connected clients bump their notification bell in real time.
    this.eventEmitter.emit('notification.created', notification.toObject ? notification.toObject() : notification);

    return notification;
  }

  @OnEvent('invoice.created')
  async handleInvoiceCreatedAlert(invoice: any) {
    try {
      const amount = invoice.grandTotal ? `\u20a6${Number(invoice.grandTotal).toLocaleString()}` : '';
      await this.createSystemAlert(
        'New Invoice Created',
        `Invoice ${invoice.invoiceNumber} was generated${amount ? ` for ${amount}` : ''}.`,
        AlertType.INFO,
      );
    } catch (error) {
      this.logger.error('Failed to create system alert for invoice.created', error);
    }
  }

  @OnEvent('payment.completed')
  async handlePaymentCompletedAlert(payment: any) {
    try {
      const amount = payment.amountPaid ? `\u20a6${Number(payment.amountPaid).toLocaleString()}` : '';
      await this.createSystemAlert(
        'Payment Received',
        `A payment of ${amount || 'an unspecified amount'} was confirmed (Ref: ${payment.paymentReference || 'N/A'}).`,
        AlertType.SUCCESS,
      );
    } catch (error) {
      this.logger.error('Failed to create system alert for payment.completed', error);
    }
  }

  @OnEvent('virtual_account.created')
  async handleVirtualAccountCreatedAlert(payload: any) {
    try {
      await this.createSystemAlert(
        'Virtual Account Generated',
        `A payment account was generated for invoice ${payload.invoiceNumber || ''}.`,
        AlertType.INFO,
      );
    } catch (error) {
      this.logger.error('Failed to create system alert for virtual_account.created', error);
    }
  }

  async findInApp(filters: { page?: number; limit?: number; isRead?: boolean; type?: string }) {
    const { page = 1, limit = 20, isRead, type } = filters;
    const filter: Record<string, any> = { kind: NotificationKind.IN_APP };
    if (typeof isRead === 'boolean') filter.isRead = isRead;
    if (type) filter.type = type;

    return this.notificationsRepository.findPaginated(filter, {
      page,
      limit,
      sort: { createdAt: -1 },
    });
  }

  async getUnreadCount(): Promise<{ count: number }> {
    const count = await this.notificationsRepository.countUnreadInApp();
    return { count };
  }

  async markAsRead(id: string) {
    const notification = await this.notificationsRepository.updateById(id, { isRead: true });
    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }

  async markAllAsRead() {
    const modifiedCount = await this.notificationsRepository.markAllInAppAsRead();
    return { message: 'All notifications marked as read', modifiedCount };
  }

  async deleteNotification(id: string) {
    const deleted = await this.notificationsRepository.deleteById(id);
    if (!deleted) throw new NotFoundException('Notification not found');
    return { message: 'Notification deleted' };
  }
}
