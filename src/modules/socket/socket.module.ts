import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { EventsGateway } from './events.gateway';
import { JwtSocketGuard } from './guards/jwt-socket.guard';

@Module({
  imports: [
    JwtModule.register({}),
    ConfigModule,
  ],
  providers: [EventsGateway, JwtSocketGuard],
  exports: [EventsGateway],
})
export class SocketModule {}
