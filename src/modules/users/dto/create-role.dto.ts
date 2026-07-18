import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'RECEPTIONIST', description: 'Unique role code/name' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({ example: 'Front desk patient reception and billing officer' })
  @IsNotEmpty()
  @IsString()
  description!: string;

  @ApiProperty({ example: ['invoices:create', 'patients:create', 'patients:read'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  permissions!: string[];

  @ApiProperty({ default: false, required: false })
  @IsOptional()
  @IsBoolean()
  isSystemRole?: boolean = false;
}
