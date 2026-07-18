import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InvoicesRepository } from './invoices.repository';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceItemsDto } from './dto/update-invoice-items.dto';
import { Invoice } from './schemas/invoice.schema';
import { InvoiceStatus } from '../../common/enums/invoice-status.enum';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly TAX_RATE = 0.075; // 7.5% VAT

  constructor(
    private readonly invoicesRepository: InvoicesRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createInvoice(createInvoiceDto: CreateInvoiceDto, issuedBy: string): Promise<Invoice> {
    if (!createInvoiceDto.items || createInvoiceDto.items.length === 0) {
      throw new BadRequestException('Invoice must contain at least one item');
    }

    // Calculate totals securely
    let subTotal = 0;
    const items = createInvoiceDto.items.map(item => {
      const totalAmount = item.quantity * item.unitPrice;
      subTotal += totalAmount;
      return { ...item, totalAmount };
    });

    const taxTotal = subTotal * this.TAX_RATE;
    const grandTotal = subTotal + taxTotal;

    // Generate Invoice Number: INV-YYYY-XXXXXX
    const currentYear = new Date().getFullYear();
    const countThisYear = await this.invoicesRepository.countByYear(currentYear);
    const sequentialNumber = (countThisYear + 1).toString().padStart(6, '0');
    const invoiceNumber = `INV-${currentYear}-${sequentialNumber}`;

    const newInvoice = await this.invoicesRepository.create({
      invoiceNumber,
      patientId: createInvoiceDto.patientId as any,
      issuedBy: issuedBy as any,
      items,
      subTotal,
      taxTotal,
      grandTotal,
      status: InvoiceStatus.PENDING_PAYMENT,
      dueDate: createInvoiceDto.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
    });

    this.logger.log(`Invoice generated: ${invoiceNumber} for Patient ${createInvoiceDto.patientId}`);
    
    // Emit event for Phase 4 (Virtual Account Generation)
    this.eventEmitter.emit('invoice.created', newInvoice);

    return newInvoice;
  }

  async findAllInvoices(paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    
    return this.invoicesRepository.findPaginated({}, {
      page,
      limit,
      sort: { createdAt: -1 },
      populate: ['patientId', 'issuedBy'],
    });
  }

  async findInvoiceById(id: string): Promise<Invoice> {
    const invoice = await this.invoicesRepository.findById(id);
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }
    // Populate after finding to keep base repo simple
    await invoice.populate(['patientId', 'issuedBy']);
    return invoice;
  }

  async updateInvoiceItems(id: string, updateInvoiceItemsDto: UpdateInvoiceItemsDto): Promise<Invoice> {
    const invoice = await this.findInvoiceById(id);

    if (invoice.status !== InvoiceStatus.DRAFT && invoice.status !== InvoiceStatus.PENDING_PAYMENT) {
      throw new BadRequestException(`Cannot update items for an invoice in ${invoice.status} status.`);
    }

    if (!updateInvoiceItemsDto.items || updateInvoiceItemsDto.items.length === 0) {
      throw new BadRequestException('Invoice must contain at least one item');
    }

    // Recalculate totals
    let subTotal = 0;
    const items = updateInvoiceItemsDto.items.map(item => {
      const totalAmount = item.quantity * item.unitPrice;
      subTotal += totalAmount;
      return { ...item, totalAmount };
    });

    const taxTotal = subTotal * this.TAX_RATE;
    const grandTotal = subTotal + taxTotal;

    const updated = await this.invoicesRepository.updateById(id, {
      items,
      subTotal,
      taxTotal,
      grandTotal,
    });

    this.logger.log(`Invoice items updated: ${invoice.invoiceNumber}`);
    
    // Populate before returning
    const populatedInvoice = await this.invoicesRepository.findById(id);
    if (populatedInvoice) {
        await populatedInvoice.populate(['patientId', 'issuedBy']);
        return populatedInvoice;
    }
    return updated as Invoice;
  }

  async cancelInvoice(id: string): Promise<Invoice> {
    const invoice = await this.findInvoiceById(id);
    
    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Cannot cancel a paid invoice');
    }

    const updated = await this.invoicesRepository.updateById(id, {
      status: InvoiceStatus.CANCELLED,
    });

    this.logger.log(`Invoice ${invoice.invoiceNumber} cancelled`);
    return updated as Invoice;
  }
}
