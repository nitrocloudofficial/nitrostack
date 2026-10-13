import { Module } from '@nitrostack/core';
import { SlackService } from './slack.service.js';
import { SlackTools } from './slack.tools.js';
import { ConfigModule } from '../config/config.module.js';

@Module({
  name: 'slackmodule',
  imports: [ConfigModule],
  controllers: [SlackTools],
  providers: [SlackService],
  exports: [SlackService],
})
export class SlackModule {}

