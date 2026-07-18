import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { BillingService } from './billing.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceItemsDto } from './dto/update-invoice-items.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionEnum } from '../../common/enums/permission.enum';
import { MongoIdValidationPipe } from '../../common/pipes/mongo-id-validation.pipe';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { IActiveUser } from '../../common/interfaces/active-user.interface';

@ApiTags('Billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('billing/invoices')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new invoice' })
  @ApiResponse({ status: 201, description: 'Invoice successfully created.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @Permissions(PermissionEnum.INVOICES_CREATE)
  createInvoice(
    @Body() createInvoiceDto: CreateInvoiceDto,
    @CurrentUser() user: IActiveUser,
  ) {
    return this.billingService.createInvoice(createInvoiceDto, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all invoices' })
  @ApiResponse({ status: 200, description: 'List of invoices.' })
  @Permissions(PermissionEnum.INVOICES_READ)
  findAll(@Query() paginationDto: PaginationDto) {
    return this.billingService.findAllInvoices(paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve an invoice by ID' })
  @ApiResponse({ status: 200, description: 'The invoice details.' })
  @ApiResponse({ status: 404, description: 'Invoice not found.' })
  @Permissions(PermissionEnum.INVOICES_READ)
  findOne(@Param('id', MongoIdValidationPipe) id: string) {
    return this.billingService.findInvoiceById(id);
  }

  @Patch(':id/items')
  @ApiOperation({ summary: 'Update invoice items' })
  @ApiResponse({ status: 200, description: 'Invoice items successfully updated.' })
  @ApiResponse({ status: 400, description: 'Invalid input data or invoice cannot be updated.' })
  @ApiResponse({ status: 404, description: 'Invoice not found.' })
  @Permissions(PermissionEnum.INVOICES_UPDATE)
  updateItems(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() updateInvoiceItemsDto: UpdateInvoiceItemsDto,
  ) {
    return this.billingService.updateInvoiceItems(id, updateInvoiceItemsDto);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel an invoice by ID' })
  @ApiResponse({ status: 200, description: 'Invoice successfully cancelled.' })
  @ApiResponse({ status: 400, description: 'Cannot cancel a paid invoice.' })
  @ApiResponse({ status: 404, description: 'Invoice not found.' })
  @Permissions(PermissionEnum.INVOICES_CANCEL)
  cancel(@Param('id', MongoIdValidationPipe) id: string) {
    return this.billingService.cancelInvoice(id);
  }
}
