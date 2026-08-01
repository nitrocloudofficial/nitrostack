import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { CalculatorModule } from './modules/calculator/calculator.module.js';
import { DiscoveryModule } from './modules/discovery/discovery.module.js';
import { ReferenceModule } from './modules/reference/reference.module.js';
import { FilesystemModule } from './modules/filesystem/filesystem.module.js';
import { IntakeModule } from './modules/intake/intake.module.js';
import { TriageModule } from './modules/triage/triage.module.js';
import { BookingModule } from './modules/booking/booking.module.js';
import { MatchingModule } from './modules/matching/matching.module.js';
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
    name: 'medtriage-mcp',
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
    DiscoveryModule,
    ReferenceModule,
    FilesystemModule,
    IntakeModule,
    TriageModule,
    BookingModule,
    MatchingModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}

