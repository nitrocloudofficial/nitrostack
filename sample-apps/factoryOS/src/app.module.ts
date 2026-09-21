import { McpApp, Module, ConfigModule, OAuthModule } from '@nitrostack/core';
import { SupervisorModule } from './modules/supervisor/supervisor.module.js';
import { MaintenanceModule } from './modules/maintenance/maintenance.module.js';
import { InventoryModule } from './modules/inventory/inventory.module.js';
import { ProcurementModule } from './modules/procurement/procurement.module.js';
import { ProductionModule } from './modules/production/production.module.js';
import { SafetyModule } from './modules/safety/safety.module.js';
import { SystemHealthCheck } from './health/system.health.js';
import { StateService } from './services/state.service.js';
import { AutonomyLedgerService } from './services/autonomy-ledger.service.js';

/**
 * FactoryOS Root Application Module
 * 
 * Bootstraps the Agentic AI Smart Manufacturing MCP Server.
 * Registers all 6 specialized AI modules and health checks:
 * 1. Supervisor Module (Master Orchestration)
 * 2. Maintenance Module (Diagnostics, Health, Tech Assignment, Business Impact)
 * 3. Inventory Module (Stock, Shortages, Replenishment)
 * 4. Procurement Module (Supplier Discovery, Negotiation, PO Generation)
 * 5. Production Module (Scheduling, Line Rerouting)
 * 6. Safety Module (Hazard Assessment, OSHA Incident Reporting)
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'factoryos-smart-manufacturing-server',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'FactoryOS Agentic AI Smart Manufacturing MCP Server with OAuth 2.1 authentication',
  imports: [
    ConfigModule.forRoot(),

    // Enable OAuth 2.1 authentication
    OAuthModule.forRoot({
      required: process.env.OAUTH_REQUIRED === 'true',
      resourceUri: process.env.RESOURCE_URI || 'https://mcplocal',
      authorizationServers: [
        process.env.AUTH_SERVER_URL || 'https://dev-5dt0utuk31h13tjm.us.auth0.com',
      ],
      scopesSupported: [
        'read',        // Read access to resources
        'write',       // Write/modify resources
        'admin',       // Administrative operations
      ],
      tokenIntrospectionEndpoint: process.env.INTROSPECTION_ENDPOINT,
      tokenIntrospectionClientId: process.env.INTROSPECTION_CLIENT_ID,
      tokenIntrospectionClientSecret: process.env.INTROSPECTION_CLIENT_SECRET,
      audience: process.env.TOKEN_AUDIENCE,
      issuer: process.env.TOKEN_ISSUER,
      customValidation: async () => true,
    }),

    SupervisorModule,
    MaintenanceModule,
    InventoryModule,
    ProcurementModule,
    ProductionModule,
    SafetyModule
  ],
  providers: [
    SystemHealthCheck,
    StateService,
    AutonomyLedgerService,
  ]
})
export class AppModule { }
