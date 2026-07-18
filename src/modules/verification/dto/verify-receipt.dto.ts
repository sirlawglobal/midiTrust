import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyReceiptDto {
  @ApiProperty({ description: 'The cryptographic JWT token from the receipt QR code' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
