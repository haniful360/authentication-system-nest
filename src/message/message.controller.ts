import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { MessageService } from './message.service';
import { JwtGuard } from '@/lib/guards/jwt/jwt.guard';
import { CurrentUser } from '@/lib/decorators/user.decorator';

@Controller('message')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post('create')
  @UseGuards(JwtGuard)
  createMessage(
    @Body()
    body: {
      conversationId: string;
      senderId: string;
      message: string;
    },
    @CurrentUser() user: { sub: string; email: string },
  ) {
    return this.messageService.sendMessage(body, user.sub);
  }

  @Get('get-messages')
  @UseGuards(JwtGuard)
  getMessages(
    @Query('conversationId') conversationId: string,
    @CurrentUser() user: { sub: string; email: string },
  ) {
    return this.messageService.getMessages(conversationId, user.sub);
  }

  @Get('get-conversation-participants')
  @UseGuards(JwtGuard)
  getConversation(@Query('conversationId') conversationId: string) {
    return this.messageService.getConversationParticipants(conversationId);
  }
}
