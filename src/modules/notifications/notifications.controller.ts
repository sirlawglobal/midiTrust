import { Controller, Get, Post, Patch, Delete, Param, Query, UseGuards, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionEnum } from '../../common/enums/permission.enum';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly notificationsService: NotificationsService,
    @InjectQueue('notification-dispatch-queue') private readonly notificationQueue: Queue,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List in-app staff notifications (paginated, filterable)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'isRead', required: false, type: Boolean })
  @ApiQuery({ name: 'type', required: false, enum: ['INFO', 'SUCCESS', 'WARNING', 'ERROR'] })
  @Permissions(PermissionEnum.DASHBOARD_READ)
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isRead') isRead?: string,
    @Query('type') type?: string,
  ) {
    return this.notificationsService.findInApp({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      isRead: isRead === undefined ? undefined : isRead === 'true',
      type,
    });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get the count of unread in-app notifications (for the bell badge)' })
  @Permissions(PermissionEnum.DASHBOARD_READ)
  async unreadCount() {
    return this.notificationsService.getUnreadCount();
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all in-app notifications as read' })
  @Permissions(PermissionEnum.DASHBOARD_READ)
  async markAllAsRead() {
    return this.notificationsService.markAllAsRead();
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a single in-app notification as read' })
  @Permissions(PermissionEnum.DASHBOARD_READ)
  async markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an in-app notification' })
  @Permissions(PermissionEnum.DASHBOARD_READ)
  async deleteNotification(@Param('id') id: string) {
    return this.notificationsService.deleteNotification(id);
  }

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
