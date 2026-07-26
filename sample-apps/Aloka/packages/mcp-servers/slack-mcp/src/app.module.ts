import { McpApp, Module } from '@nitrostack/core';
import { SlackModule } from './modules/slack/slack.module.js';

@McpApp({
  module: AppModule,
  server: {
    name: 'slack-mcp',
    version: '1.0.0'
  },
  logging: {
    level: 'error'
  }
})
@Module({
  name: 'app',
  description: 'Root application module',
  imports: [
    SlackModule
  ]
})
export class AppModule {}
