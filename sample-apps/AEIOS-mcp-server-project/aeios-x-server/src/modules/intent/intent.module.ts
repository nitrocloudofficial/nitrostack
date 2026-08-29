import { Module } from '@nitrostack/core';
import { IntentTools } from './intent.tools.js';

@Module({
  name: 'intent',
  description: 'Intent detection engine - analyzes queries to route to specialist agents',
  controllers: [IntentTools],
})
export class IntentModule {}
