import { Module } from '@nitrostack/core';
import { AiService } from './ai.service.js';

@Module({
  name: 'ai',
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
