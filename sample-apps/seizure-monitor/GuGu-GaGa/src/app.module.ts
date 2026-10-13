/**
 * CREED-Lite — Root Application Module
 *
 * Registers all controllers, services, guards, interceptors, and
 * infrastructure providers.  Uses NitroStack DI and ConfigModule.
 */

import { McpApp, Module } from '@nitrostack/core';
import { OracleTools } from './oracle/oracle.tools.js';
import { CausalTools } from './causal/causal.tools.js';
import { FraudTools } from './fraud/fraud.tools.js';
import { LegalTools } from './legal/legal.tools.js';
import { OracleService } from './oracle/oracle.service.js';
import { CausalGraphService } from './causal/causal.service.js';
import { FraudSafetyService } from './fraud/fraud.service.js';
import { FraudSafetyGuard } from './fraud/fraud.guard.js';
import { AuditInterceptor } from './common/audit.interceptor.js';
import { CREEDExceptionFilter } from './common/creed-exception.filter.js';
import { ServerHealthCheck } from './common/server-health.js';

/**
 * Root Application Module
 *
 * Registers all CREED-Lite tool controllers and service providers.
 * DI resolves dependencies automatically — services are singletons.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'creed-lite',
    version: '2.0.0',
  },
  logging: {
    level: 'info',
  },
})
@Module({
  name: 'creed-lite',
  description: 'CREED-Lite: Causal Recourse Engine for Equitable Decision-Making — Production v2.0',
  controllers: [OracleTools, CausalTools, FraudTools, LegalTools],
  providers: [
    // Core services (order matters for DI resolution)
    OracleService,
    CausalGraphService,
    FraudSafetyService,
    // Guards
    FraudSafetyGuard,
    // Interceptors & Filters
    AuditInterceptor,
    CREEDExceptionFilter,
    // Health
    ServerHealthCheck,
  ],
})
export class AppModule {}
