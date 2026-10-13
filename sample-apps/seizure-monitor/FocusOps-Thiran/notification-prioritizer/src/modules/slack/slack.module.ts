import { Module } from '@nitrostack/core';
import { SlackTools } from './slack.tools.js';

@Module({
  name: 'slack',
  description: 'Slack integration module',
  controllers: [SlackTools]
})
export class SlackModule {}
