import { Module } from '@nitrostack/core';
import { DatabaseService } from '../../shared/database.service.js';
import { MigrationService } from '../../shared/migration.service.js';
import { AuditLogService } from '../../shared/audit-log.service.js';
import { AnalyticsService } from './analytics.service.js';
import { AnalyticsTools } from './analytics.tools.js';

@Module({
  name: 'analytics',
  imports: [],
  providers: [
    DatabaseService,   // singleton DB connection with WAL mode
    MigrationService,  // runs all DDL migrations on startup
    AuditLogService,   // append-only audit writer
    AnalyticsService,  // pure SQL analytics queries
  ],
  controllers: [AnalyticsTools], // MCP tool endpoints
  exports: [
    DatabaseService,   // shared across modules that import AnalyticsModule
    MigrationService,
    AuditLogService,
  ],
})
export class AnalyticsModule {}
