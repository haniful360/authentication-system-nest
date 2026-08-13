import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { MessageService } from './message.service';
import { UnauthorizedException } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { Server, Socket } from 'socket.io';

interface AuthenticatedSocket extends Socket {
  data: {
    userId?: string;
  };
}

@WebSocketGateway({ origin: '*' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly chatService: MessageService) {}

  @WebSocketServer() server: Server | undefined;

  connectedUsers = new Map<string, Set<string>>();

  handleConnection(client: AuthenticatedSocket) {
    try {
      let bearerToken: string | undefined =
        client.handshake.headers.authorization;

      if (!bearerToken) {
        bearerToken = client.handshake.auth?.token as string | undefined;
      }

      if (!bearerToken) {
        bearerToken = client.handshake.query.token as string | undefined;
      }

      if (!bearerToken) {
        throw new UnauthorizedException('Token not provided');
      }

      const token = bearerToken.startsWith('Bearer ')
        ? bearerToken.split(' ')[1]
        : bearerToken;

      if (!token) throw new UnauthorizedException('Token not provided');

      const secret = (process.env.JWT_SECRET as string) || 'jsjlaiajf';
      const user = jwt.verify(token, secret) as { sub?: string };
      const userId = user.sub;

      if (!userId) throw new UnauthorizedException('Invalid token');

      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId)!.add(client.id);

      client.data.userId = userId;
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.data.userId;

    if (userId) {
      const clientUserSet = this.connectedUsers.get(userId);
      if (clientUserSet) {
        clientUserSet.delete(client.id);
        if (clientUserSet.size === 0) {
          this.connectedUsers.delete(userId);
        }
      }
    }
  }

  // Direct message
  @SubscribeMessage('join-conversation')
  async joinConversation(
    client: AuthenticatedSocket,
    payload: { conversationId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) throw new UnauthorizedException();

    await client.join(payload.conversationId);
  }

  @SubscribeMessage('send-message')
  async sendMessage(
    client: AuthenticatedSocket,
    payload: { conversationId: string; message: string },
  ) {
    const userId = client.data.userId;
    if (!userId) throw new UnauthorizedException();

    const message = await this.chatService.sendMessage(payload, userId);

    this.server.to(payload.conversationId).emit('receive-message', message);
  }

  // Group message
  @SubscribeMessage('join-group')
  async joinGroup(
    client: AuthenticatedSocket,
    payload: { conversation: string },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    await client.join(payload.conversation);
  }

  @SubscribeMessage('send-group-message')
  async sendGroupMessage(
    client: AuthenticatedSocket,
    payload: {
      conversationId: string;
      message: string;
    },
  ) {
    const userId = client.data.userId;

    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const message = await this.chatService.sendMessage(payload, userId);

    this.server
      .to(payload.conversationId)
      .emit('receive-group-message', message);
  }
}
