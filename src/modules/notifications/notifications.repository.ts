import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationKind } from './schemas/notification.schema';
import { BaseRepository } from '../../infrastructure/database/base.repository';

@Injectable()
export class NotificationsRepository extends BaseRepository<Notification> {
  constructor(@InjectModel(Notification.name) private readonly notificationModel: Model<Notification>) {
    super(notificationModel);
  }

  async findByRelatedEntity(entityId: string, entityType: string): Promise<Notification[]> {
    return this.notificationModel.find({
      relatedEntityId: new Types.ObjectId(entityId),
      relatedEntityType: entityType,
    }).exec();
  }

  async markAsSent(id: string, providerResponse: any): Promise<Notification | null> {
    return this.notificationModel.findByIdAndUpdate(
      id,
      { status: 'SENT', providerResponse },
      { new: true }
    ).exec();
  }

  async markAsFailed(id: string, errorMessage: string, incrementRetry: boolean = true): Promise<Notification | null> {
    const update: any = { status: 'FAILED', errorMessage };
    if (incrementRetry) {
      update.$inc = { retryCount: 1 };
    }
    return this.notificationModel.findByIdAndUpdate(id, update, { new: true }).exec();
  }

  async countUnreadInApp(): Promise<number> {
    return this.notificationModel.countDocuments({ kind: NotificationKind.IN_APP, isRead: false }).exec();
  }

  async markAllInAppAsRead(): Promise<number> {
    const result = await this.notificationModel
      .updateMany({ kind: NotificationKind.IN_APP, isRead: false }, { isRead: true })
      .exec();
    return result.modifiedCount || 0;
  }
}
