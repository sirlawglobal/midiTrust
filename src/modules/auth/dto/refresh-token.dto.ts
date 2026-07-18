import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'The long-lived refresh token provided at login', example: 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3' })
  @IsNotEmpty()
  @IsString()
  refreshToken!: string;
}
