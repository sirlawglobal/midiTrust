import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiProperty({ example: true, description: 'Whether the user account is active or deactivated' })
  @IsNotEmpty()
  @IsBoolean()
  isActive!: boolean;
}
