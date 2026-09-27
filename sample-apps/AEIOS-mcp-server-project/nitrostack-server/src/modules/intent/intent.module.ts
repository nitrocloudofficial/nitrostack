import { Module } from '@nitrostack/core';
import { IntentTools } from './intent.tools.js';
import { IntentService } from './intent.service.js';

@Module({
  name: 'intent',
  description: 'Intent detection engine — analyzes queries to route to specialist agents',
  controllers: [IntentTools],
  providers: [IntentService],
  exports: [IntentService],
})
export class IntentModule {}
