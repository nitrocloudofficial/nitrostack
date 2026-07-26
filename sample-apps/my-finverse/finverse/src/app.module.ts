import { McpApp, Module, ConfigModule, OAuthModule } from '@nitrostack/core';
import { AccountAggregatorModule } from './modules/account-aggregator/aa.module.js';
import { UnderwritingModule } from './modules/underwriting/underwriting.module.js';
import { FraudModule } from './modules/fraud/fraud.module.js';
import { RepaymentModule } from './modules/repayment/repayment.module.js';
import { SuccessionModule } from './modules/succession/succession.module.js';
import { PlannerModule } from './modules/planner/planner.module.js';
import { SystemHealthCheck } from './health/system.health.js';

@McpApp({
  module: AppModule,
  server: {
    name: "finverse",
    version: "1.0.0"
  },
  logging: {
    level: "info"
  }
})
@Module({
  name: 'app',
  description: 'FinVerse — AI-powered financial orchestration platform for gig workers, lenders and micro-merchants.',
  imports: [
    ConfigModule.forRoot(),
    OAuthModule.forRoot({
      required: process.env.OAUTH_REQUIRED === 'true',
      resourceUri: process.env.RESOURCE_URI || 'https://mcplocal',
      authorizationServers: [
        process.env.AUTH_SERVER_URL || 'https://dev-finverse.us.auth0.com',
      ],
      scopesSupported: ['read', 'write', 'admin'],
    }),
    AccountAggregatorModule,
    UnderwritingModule,
    FraudModule,
    RepaymentModule,
    SuccessionModule,
    PlannerModule
  ],
  providers: [
    SystemHealthCheck
  ]
})
export class AppModule { }
