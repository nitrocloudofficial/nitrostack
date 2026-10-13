import { Module, McpApp } from '@nitrostack/core';

// Engine & Services
import { IncrementalSVDEngine } from './engine/incremental-svd.engine.js';
import { MockCBSService } from './mock-cbs.service.js';
import { BankApiService } from './bank-api.service.js';

// Patterns
import { SingleFlightGate } from './patterns/single-flight.js';
import { IdempotencyEnforcer } from './patterns/idempotency.js';
import { QosShunting } from './patterns/qos-shunting.js';

// Agents
import { PrimeOrchestrator } from './agents/prime.orchestrator.js';
import { AtlasSreAgent } from './agents/atlas.sre.js';
import { CerberusSecurityAgent } from './agents/cerberus.security.js';
import { HermesComplianceAgent } from './agents/hermes.compliance.js';

// Health Checks
import { CbsHealthCheck } from './health/cbs.health.js';
import { AtlasHealthCheck } from './health/atlas.health.js';
import { CerberusHealthCheck } from './health/cerberus.health.js';
import { HermesHealthCheck } from './health/hermes.health.js';
import { PrimeHealthCheck } from './health/prime.health.js';
import { SvdHealthCheck } from './health/svd.health.js';

@Module({
  name: 'AppModule',
  providers: [
    MockCBSService,
    BankApiService,
    IncrementalSVDEngine,
    SingleFlightGate,
    IdempotencyEnforcer,
    QosShunting,
    PrimeOrchestrator,
    AtlasSreAgent,
    CerberusSecurityAgent,
    HermesComplianceAgent,
    CbsHealthCheck,
    AtlasHealthCheck,
    CerberusHealthCheck,
    HermesHealthCheck,
    PrimeHealthCheck,
    SvdHealthCheck,
    {
      provide: 'OAUTH_CONFIG',
      useValue: { required: false, resourceUri: 'http://localhost', authorizationServers: ['http://localhost'] }
    }
  ],
  controllers: [
    PrimeOrchestrator,
    AtlasSreAgent,
    CerberusSecurityAgent,
    HermesComplianceAgent
  ]
})
export class AppModule {}

@McpApp({
  module: AppModule,
  server: {
    name: 'Project Aegis MAS',
    version: '2.0.0'
  }
})
export class AegisApplication {}
