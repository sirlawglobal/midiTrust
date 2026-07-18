import { IsString, IsNotEmpty, IsOptional, IsEmail, IsDateString, IsEnum, Matches } from 'class-validator';

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  // Basic Nigerian phone number validation for WhatsApp/SMS compatibility
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Phone number must be a valid E.164 format' })
  phone: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsDateString()
  @IsOptional()
  dob?: Date;

  @IsEnum(['MALE', 'FEMALE', 'OTHER'])
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  address?: string;
}
