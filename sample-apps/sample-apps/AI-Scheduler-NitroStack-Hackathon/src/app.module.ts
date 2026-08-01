import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { AssistantModule } from './modules/assistant/assistant.module.js';
import { SystemHealthCheck } from './health/system.health.js';

@McpApp({
  module: AppModule,
  server: {
    name: 'ai-assistant-server',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'AI personal assistant MCP server',
  imports: [
    ConfigModule.forRoot(),
    AssistantModule
  ],
  providers: [
    SystemHealthCheck
  ]
})
export class AppModule {}

