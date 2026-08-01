import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { CalculatorModule } from './modules/calculator/calculator.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { ReviewsModule } from './modules/reviews/reviews.module.js';
import { TrustEngineModule } from './modules/trustengine/trustengine.module.js';
import { ReputationModule } from './modules/reputation/reputation.module.js';
import { CommunityModule } from './modules/community/community.module.js';
import { AIModule } from './modules/ai/ai.module.js';
import { BusinessModule } from './modules/business/business.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module
 * 
 * This is the main module that bootstraps the Vouch MCP server.
 * It registers all feature modules and health checks.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'vouch-server',
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
    CalculatorModule,
    AuthModule,
    ReviewsModule,
    TrustEngineModule,
    ReputationModule,
    CommunityModule,
    AIModule,
    BusinessModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}

