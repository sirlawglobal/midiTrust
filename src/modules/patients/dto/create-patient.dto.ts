import { IsString, IsNotEmpty, IsOptional, IsEmail, IsDate, IsEnum, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreatePatientDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '+2348012345678', description: 'Valid E.164 phone number' })
  @IsString()
  @IsNotEmpty()
  // Basic Nigerian phone number validation for WhatsApp/SMS compatibility
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Phone number must be a valid E.164 format' })
  phone: string;

  @ApiPropertyOptional({ example: 'john.doe@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '1990-01-15' })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  dob?: Date;

  @ApiPropertyOptional({ enum: ['MALE', 'FEMALE', 'OTHER'], example: 'MALE' })
  @IsEnum(['MALE', 'FEMALE', 'OTHER'])
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional({ example: '12 Lagos Street, Ikeja' })
  @IsString()
  @IsOptional()
  address?: string;
}
