import { Module } from '@nitrostack/core';
import { ContextTools } from './context.tools.js';

@Module({
  name: 'context',
  description: 'User context builder module',
  controllers: [ContextTools]
})
export class ContextModule {}
