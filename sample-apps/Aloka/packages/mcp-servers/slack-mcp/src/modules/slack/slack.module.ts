import { Module } from '@nitrostack/core';
import { SlackTools } from './slack.tools.js';
import { SlackService } from './slack.service.js';

@Module({
  name: 'slack',
  description: 'Slack notifications MCP server',
  controllers: [SlackTools],
  providers: [SlackService]
})
export class SlackModule {}
