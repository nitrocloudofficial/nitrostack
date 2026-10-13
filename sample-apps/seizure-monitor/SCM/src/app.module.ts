import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { SystemHealthCheck } from './health/system.health.js';
import { IngestionModule } from './modules/ingestion/ingestion.module.js';
import { MasterDataModule } from './modules/master-data/master-data.module.js';
import { OrchestratorModule } from './modules/orchestrator/orchestrator.module.js';
import { AnalyticsModule } from './modules/analytics/analytics.module.js';
import { ApInvoiceModule } from './modules/ap-invoice/ap-invoice.module.js';
import { ComplianceModule } from './modules/compliance/compliance.module.js';
import { CommunicationModule } from './modules/communication/communication.module.js';

/**
 * ALE SCM — MCP Server Root Module
 *
 * Boot order (by import sequence):
 *  - AnalyticsModule    Shared DB + WAL mode + migrations + audit log + analytics tools
 *  - IngestionModule    classify_document, extract_document_data, ingest_document
 *  - MasterDataModule   validate_against_master_data, recommend_hs_code
 *  - OrchestratorModule execute_workflow, match_invoice_to_po, exceptions, workflow status
 *  - ApInvoiceModule    AP invoice automation (duplicate detect, 3-way match, FX, approval routing)
 *  - CommunicationModule  send_alert, ingest_email_inbox, SLA escalation, daily digest, route_task upgrade
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'ale-scm-server',
    version: '1.0.0',
  },
  logging: {
    level: 'info',
  },
})
@Module({
  name: 'app',
  description: 'ALE SCM MCP root module',
  imports: [
    ConfigModule.forRoot(),
    AnalyticsModule,      // boots first: DB connection + all migrations
    IngestionModule,
    MasterDataModule,
    CommunicationModule,  // queue-backed alerting + worker; before Orchestrator
    OrchestratorModule,
    ApInvoiceModule,
    ComplianceModule,
  ],
  providers: [SystemHealthCheck],
})
export class AppModule {}
