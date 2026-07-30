import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { ReportModule } from './modules/report/report.module.js';
import { InvestigationModule } from './modules/investigation/investigation.module.js';
import { RemediationModule } from './modules/remediation/remediation.module.js';
import { TriageModule } from './modules/triage/triage.module.js';
import { WebscanModule } from './modules/webscan/webscan.module.js';
import { MitigationModule } from './modules/mitigation/mitigation.module.js';
import { DnscheckModule } from './modules/dnscheck/dnscheck.module.js';
import { FindingsModule } from './modules/findings/findings.module.js';
import { TopVulnerabilitiesModule } from './modules/top-vulnerabilities/top-vulnerabilities.module.js';
import { SystemHealthCheck } from './health/system.health.js';
import { MongoHealthCheck } from './health/mongo.health.js';

/**
 * Root Application Module
 *
 * WARDEN is a threat-intelligence MCP server that assumes every website it
 * reads is trying to trick it. It ranks vulnerabilities by exploitation
 * evidence rather than CVSS severity alone, quarantines suspected
 * prompt-injection content before it ever reaches the model, and records
 * every decision to an auditable investigation trace.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'warden',
    version: '0.2.0'
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
    ReportModule,
    InvestigationModule,
    RemediationModule,
    TriageModule,
    WebscanModule,
    MitigationModule,
    DnscheckModule,
    FindingsModule,
    TopVulnerabilitiesModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
    MongoHealthCheck,
  ]
})
export class AppModule {}
