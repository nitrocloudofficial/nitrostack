import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { InvoicesModule } from './modules/invoices/invoices.module.js';
import { RiskModule } from './modules/risk/risk.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { SystemHealthCheck } from './health/system.health.js';
import { AuditService } from './services/audit.service.js';
import { JWTGuard } from './guards/jwt.guard.js';
import { ControllerGuard } from './guards/controller.guard.js';

/**
 * Root Application Module
 * 
 * This is the main module that bootstraps the MCP server.
 * It registers all feature modules and health checks.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'Aegispay',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'AegisPay',
  description: 'Compliance-gated payment rail for AI agents',
  imports: [
    ConfigModule.forRoot(),
    InvoicesModule,
    RiskModule,
    PaymentsModule,
    AuditModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
    // Services
    AuditService,
    // Guards
    JWTGuard,
    ControllerGuard,
    // Dummy OAUTH_CONFIG: the SDK's own app-decorator.js unconditionally
    // imports oauth-module.js to check whether OAuth is configured. That
    // import alone triggers @Injectable()'s auto-registration of OAuthModule
    // into the global DI container — we never call OAuthModule.forRoot()
    // ourselves, so instantiateAll() then fails trying to resolve its
    // OAUTH_CONFIG dependency at every boot. This project doesn't use OAuth
    // (JWTGuard/ControllerGuard only); this dummy value satisfies that
    // otherwise-unconfigurable SDK-internal dependency so it can construct
    // harmlessly (never started, never used) instead of erroring.
    { provide: 'OAUTH_CONFIG', useValue: null },
  ]
})
export class AppModule { }

