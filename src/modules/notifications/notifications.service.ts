import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Types } from 'mongoose';
import { NotificationsRepository } from './notifications.repository';
import { NotificationChannel } from './schemas/notification.schema';
import { Receipt } from '../receipts/schemas/receipt.schema';
import { PatientsService } from '../patients/patients.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly patientsService: PatientsService,
    @InjectQueue('notification-dispatch-queue') private readonly notificationQueue: Queue,
  ) {}

  @OnEvent('receipt.generated')
  async handleReceiptGenerated(receipt: Receipt) {
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
}
