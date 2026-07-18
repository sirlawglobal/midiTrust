import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsPhoneNumber, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'nurse.joy@meditrust-hospital.com' })
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'SecurePass123!', minLength: 8 })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Joy' })
  @IsNotEmpty()
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Adebayo' })
  @IsNotEmpty()
  @IsString()
  lastName!: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsNotEmpty()
  @IsString()
  phone!: string;

  @ApiProperty({ example: '66e1b8b8f2a1b2c3d4e5f6a7', description: 'ObjectId of the Role' })
  @IsNotEmpty()
  @IsString()
  roleId!: string;

  @ApiPropertyOptional({ example: 'PHARMACY' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
