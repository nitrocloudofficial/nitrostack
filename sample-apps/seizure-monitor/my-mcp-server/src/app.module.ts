import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { GuardianModule } from './modules/guardian/guardian.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * BidWiserAI — root application module.
 *
 * A behavioural guard for retail investors. The server surfaces context, patterns and history;
 * it never recommends a trade. See IDEA.md for the locked scope and the compliance boundary.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'bidwiserai',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'BidWiserAI root module',
  imports: [
    ConfigModule.forRoot(),
    GuardianModule
  ],
  providers: [
    SystemHealthCheck
  ]
})
export class AppModule {}
