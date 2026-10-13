import { Module } from '@nitrostack/core';
import { MailTools } from './mail.tools.js';

@Module({
  name: 'mail',
  description: 'Enterprise Mail & Notification MCP Module for executive briefings, IT dispatch, customer advisories, and summaries.',
  controllers: [MailTools]
})
export class MailModule {}
