import { Module } from '@nitrostack/core';
import { ChatTools } from './chat.tools.js';
import { ChatResources } from './chat.resources.js';
import { ChatPrompts } from './chat.prompts.js';
import { ChatService } from './chat.service.js';
import { MemoryModule } from '../memory/memory.module.js';

@Module({
  name: 'chat',
  description: 'Chat module for sending messages with context injection and conversation retrieval',
  controllers: [ChatTools, ChatResources, ChatPrompts],
  providers: [ChatService],
  imports: [MemoryModule],
})
export class ChatModule {}
