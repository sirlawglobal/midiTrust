import { Controller, Post, Param, UseGuards, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionEnum } from '../../common/enums/permission.enum';
import { NotificationsRepository } from './notifications.repository';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    @InjectQueue('notification-dispatch-queue') private readonly notificationQueue: Queue,
  ) {}

  @Post(':id/resend')
  @ApiOperation({ summary: 'Manually resend a failed notification' })
  @Permissions(PermissionEnum.RECEIPTS_RESEND)
  async resendNotification(@Param('id') id: string) {
    const notification = await this.notificationsRepository.findById(id);
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.status === 'SENT') {
      throw new BadRequestException('Notification has already been successfully sent');
    }

    // Set back to retrying and queue
    notification.status = 'RETRYING';
    await notification.save();

    await this.notificationQueue.add('dispatch', {
      notificationId: notification._id,
    });

    return { message: 'Notification queued for resend', notificationId: notification._id };
  }
}
