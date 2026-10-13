import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { MentorModule } from './modules/mentor/mentor.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module — CodePilot SRM
 *
 * AI-powered interview preparation MCP server.
 * Single module architecture: MentorModule handles all features.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'codepilot-srm',
    version: '2.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'CodePilot SRM — AI Interview Mentor',
  imports: [
    ConfigModule.forRoot(),
    MentorModule
  ],
  providers: [
    SystemHealthCheck,
  ]
})
export class AppModule {}
