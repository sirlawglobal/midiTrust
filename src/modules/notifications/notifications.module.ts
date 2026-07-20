import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';
import { NotificationProcessor } from './notification.processor';
import { NotificationsController } from './notifications.controller';
import { MailerModule } from '../../infrastructure/mailer/mailer.module';
import { WhatsAppClientService } from '../../infrastructure/messaging/whatsapp-client.service';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { PatientsModule } from '../patients/patients.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }]),
    BullModule.registerQueue({
      name: 'notification-dispatch-queue',
    }),
    MailerModule,
    PatientsModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsRepository,
    NotificationsService,
    NotificationProcessor,
    WhatsAppClientService,
    StorageService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
