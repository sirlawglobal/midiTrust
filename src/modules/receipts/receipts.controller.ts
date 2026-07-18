import { Controller, Get, Param, Post, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ReceiptsService } from './receipts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionEnum } from '../../common/enums/permission.enum';

@ApiTags('Receipts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('receipts')
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Get(':receiptNumber')
  @ApiOperation({ summary: 'Get a receipt by its receipt number' })
  @Permissions(PermissionEnum.RECEIPTS_READ)
  async getReceipt(@Param('receiptNumber') receiptNumber: string) {
    const receipt = await this.receiptsService.findByReceiptNumber(receiptNumber);
    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }
    return receipt;
  }

  @Post(':id/resend')
  @ApiOperation({ summary: 'Resend receipt notification (email/SMS)' })
  @Permissions(PermissionEnum.RECEIPTS_RESEND)
  async resendReceipt(@Param('id') id: string) {
    return this.receiptsService.resendReceipt(id);
  }
}
