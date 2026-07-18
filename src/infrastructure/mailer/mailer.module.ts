import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BrevoClientService } from './brevo-client.service';

@Module({
  imports: [ConfigModule],
  providers: [BrevoClientService],
  exports: [BrevoClientService],
})
export class MailerModule {}
