import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateInvoiceItemDto } from './create-invoice.dto';

export class UpdateInvoiceItemsDto {
  @ApiProperty({ type: [CreateInvoiceItemDto], description: 'List of items to replace the existing invoice items.' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items: CreateInvoiceItemDto[];
}
