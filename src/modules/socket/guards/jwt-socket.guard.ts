import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtSocketGuard implements CanActivate {
  private readonly logger = new Logger(JwtSocketGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient<Socket>();
    
    // Check Authorization header or handshake query token
    const token = this.extractTokenFromSocket(client);

    if (!token) {
      this.logger.warn(`Rejected unauthenticated socket connection: ${client.id}`);
      throw new WsException('Unauthorized access');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });

      // Attach user to socket connection
      client.data.user = payload;
      return true;
    } catch (err) {
      this.logger.warn(`Invalid socket token from client ${client.id}: ${err.message}`);
      throw new WsException('Invalid token');
    }
  }

  private extractTokenFromSocket(client: Socket): string | undefined {
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }
    const queryToken = client.handshake.auth?.token || client.handshake.query?.token;
    return queryToken as string | undefined;
  }
}
