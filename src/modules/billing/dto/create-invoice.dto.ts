import { IsString, IsNotEmpty, IsArray, ValidateNested, IsNumber, Min, IsDateString, IsOptional, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInvoiceItemDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class CreateInvoiceDto {
  @IsMongoId()
  @IsNotEmpty()
  patientId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items: CreateInvoiceItemDto[];

  @IsDateString()
  @IsOptional()
  dueDate?: Date;
}
