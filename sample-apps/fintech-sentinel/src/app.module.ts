import { McpApp, Module, OAuthModule } from '@nitrostack/core';
import { SystemHealthCheck } from './health/system.health.js';
import { Track1Service } from './tools/Track1MainTool.js';

@McpApp({
  module: AppModule,
  server: {
    name: 'fintech-sentinel-server',
    version: '1.0.0',
  },
  logging: {
    level: 'info',
  },
})
@Module({
  name: 'app',
  description: 'Root application module',
  imports: [
    OAuthModule.forRoot({
      required: process.env.OAUTH_REQUIRED === 'true',
      resourceUri: process.env.RESOURCE_URI || 'http://localhost:3000',
      authorizationServers: [
        process.env.AUTH_SERVER_URL || 'http://localhost:3000',
      ],
    }),
  ],
  providers: [
    SystemHealthCheck,
  ],
  controllers: [
    Track1Service,
  ]
})
export class AppModule {}