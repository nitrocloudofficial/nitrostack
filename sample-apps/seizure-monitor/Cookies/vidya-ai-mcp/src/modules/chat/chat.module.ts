import { Module } from '@nitrostack/core';
import { ChatTools } from './chat.tools.js';

@Module({
  name: 'chat',
  description: 'Chat with Vidya AI tutor with research context',
  controllers: [ChatTools]
})
export class ChatModule {}
