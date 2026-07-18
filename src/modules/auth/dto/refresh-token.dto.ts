import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'The long-lived refresh token provided at login' })
  @IsNotEmpty()
  @IsString()
  refreshToken!: string;
}
