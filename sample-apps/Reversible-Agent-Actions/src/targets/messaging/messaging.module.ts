import { Module } from '@nitrostack/core';
import { MessagingTools } from './messaging.tools.js';

/** See CrmModule for why registration doesn't happen in this module's constructor. */
@Module({
  name: 'messaging',
  description: 'Messaging target server — channels, messages, invites',
  controllers: [MessagingTools],
  providers: [MessagingTools],
})
export class MessagingModule {}
