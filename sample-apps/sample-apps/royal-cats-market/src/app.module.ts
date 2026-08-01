import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { OauthModule } from './modules/oauth/oauth.module.js';
import { SocialModule } from './modules/social/social.module.js';
import { GmailModule } from './modules/gmail/gmail.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module
 * 
 * This is the main module that bootstraps the MCP server.
 * It registers all feature modules and health checks.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'royal-cats-market',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Root application module',
  imports: [
    ConfigModule.forRoot(),
    OauthModule,
    SocialModule,
    GmailModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}

