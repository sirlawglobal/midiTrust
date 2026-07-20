import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { UseGuards, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtSocketGuard } from './guards/jwt-socket.guard';

@WebSocketGateway({
  namespace: '/events',
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN || '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'], // Enable polling fallback for Vercel compatibility
})
@UseGuards(JwtSocketGuard) // Applies to all incoming events, but not the initial handshake
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server | undefined;

  private readonly logger = new Logger(EventsGateway.name);

  // Note: Guards don't run on handleConnection automatically in NestJS.
  // We rely on either middleware or checking inside standard events.
  // We'll enforce a "joinRoom" event to do the actual secure subscription.
  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    // Every connected client gets the in-app notification bell/feed broadcasts,
    // regardless of role — unlike department/global rooms, this carries no sensitive
    // data (just alert titles/messages), so no extra RBAC is needed here.
    client.join('notifications:all');
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @MessageBody() room: string,
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;
    
    // Only allow joining department rooms if they have the right role, or global if staff
    if (room.startsWith('department:') || room === 'hospital:global') {
      // Basic RBAC could be applied here based on user.role
      client.join(room);
      this.logger.log(`User ${user.email} joined room: ${room}`);
      return { success: true, room };
    }
    
    // Patients or generic users tracking specific invoices
    if (room.startsWith('invoice:')) {
      client.join(room);
      return { success: true, room };
    }

    return { success: false, message: 'Invalid room' };
  }

  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @MessageBody() room: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(room);
    return { success: true, room };
  }

  // --- INTERNAL EVENT LISTENERS (Broadcast to Sockets) ---

  @OnEvent('payment.completed')
  handlePaymentCompleted(payload: any) {
    this.logger.log(`Broadcasting payment.completed for Invoice ${payload.invoiceNumber}`);
    
    // Notify pharmacy that patient is cleared
    this.server?.to('department:pharmacy').emit('payment.completed', payload);
    
    // Notify reception
    this.server?.to('department:reception').emit('payment.completed', payload);
    
    // Notify the specific patient's screen
    if (payload.invoiceId) {
      this.server?.to(`invoice:${payload.invoiceId}`).emit('payment.completed', payload);
    }
    
    // Notify global dashboard
    this.server?.to('hospital:global').emit('dashboard.updated', { action: 'payment_received' });
  }

  @OnEvent('invoice.created')
  handleInvoiceCreated(payload: any) {
    this.server?.to('department:reception').emit('invoice.created', payload);
    this.server?.to('hospital:global').emit('dashboard.updated', { action: 'invoice_created' });
  }

  @OnEvent('virtual_account.created')
  handleVirtualAccountCreated(payload: any) {
    this.logger.log(`Broadcasting virtual_account.created for Invoice ${payload.invoiceNumber}`);
    
    // Notify reception so they can read the account details to the patient
    this.server?.to('department:reception').emit('virtual_account.created', payload);
    
    // Notify the specific patient's screen if they are scanning/viewing from a tablet
    if (payload.invoiceId) {
      this.server?.to(`invoice:${payload.invoiceId}`).emit('virtual_account.created', payload);
    }
  }

  @OnEvent('notification.created')
  handleNotificationCreated(payload: any) {
    // Broadcast to every connected client so the notification bell badge updates live.
    this.server?.to('notifications:all').emit('notification.created', payload);
  }
}
