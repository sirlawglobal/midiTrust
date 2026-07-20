import { Controller, Get, Param, Post, UseGuards, NotFoundException, Res } from '@nestjs/common';
import type { Response } from 'express';
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

  @Get()
  @ApiOperation({ summary: 'Get all receipts' })
  @Permissions(PermissionEnum.RECEIPTS_READ)
  async getAllReceipts() {
    return this.receiptsService.findAll();
  }

  @Get('id/:id')
  @ApiOperation({ summary: 'Get a receipt by MongoDB ID' })
  @Permissions(PermissionEnum.RECEIPTS_READ)
  async getReceiptById(@Param('id') id: string) {
    const receipt = await this.receiptsService.findById(id);
    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }
    return receipt;
  }

  @Get('id/:id/pdf')
  @ApiOperation({ summary: 'Stream the archived receipt PDF (bypasses Cloudinary raw-file delivery restrictions)' })
  @Permissions(PermissionEnum.RECEIPTS_READ)
  async streamReceiptPdf(@Param('id') id: string, @Res() res: Response) {
    try {
      const { buffer, filename } = await this.receiptsService.getReceiptPdfBuffer(id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.send(buffer);
    } catch (error: any) {
      throw new NotFoundException(error.message || 'Receipt PDF not found');
    }
  }

  @Get(':receiptNumber')
  @ApiOperation({ summary: 'Get a receipt by its receipt number' })
  @Permissions(PermissionEnum.RECEIPTS_READ)
  async getReceipt(@Param('receiptNumber') receiptNumber: string) {
    const receipt = await this.receiptsService.findByReceiptNumber(receiptNumber.trim());
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

  @Post('id/:id/resend')
  @ApiOperation({ summary: 'Resend receipt notification by MongoDB ID (email/SMS)' })
  @Permissions(PermissionEnum.RECEIPTS_RESEND)
  async resendReceiptById(@Param('id') id: string) {
    return this.receiptsService.resendReceipt(id);
  }
}
