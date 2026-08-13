import { Module } from '@nestjs/common';
import { MessageService } from './message.service';
import { MessageController } from './message.controller';
import { JwtService } from '@nestjs/jwt';
import { ChatGateway } from './message.gataway';

@Module({
  controllers: [MessageController],
  providers: [MessageService, JwtService, ChatGateway],
  exports: [MessageService, ChatGateway],
})
export class MessageModule {}
