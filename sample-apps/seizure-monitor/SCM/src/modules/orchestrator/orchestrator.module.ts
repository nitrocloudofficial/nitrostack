import { Module } from '@nitrostack/core';
import { AnalyticsModule } from '../analytics/analytics.module.js';
import { MasterDataModule } from '../master-data/master-data.module.js';
import { IngestionModule } from '../ingestion/ingestion.module.js';
import { ApInvoiceModule } from '../ap-invoice/ap-invoice.module.js';
import { ComplianceModule } from '../compliance/compliance.module.js';
import { CommunicationModule } from '../communication/communication.module.js';
import { OrchestratorTools } from './orchestrator.tools.js';
import { ValidationService } from './validation.service.js';
import { ExceptionService } from './exception.service.js';
import { WorkflowEngine } from './workflow.engine.js';
import { WorkflowContextStore } from './workflow-context.store.js';
import { SopLoaderService } from './sop-loader.service.js';
import { InvoiceRepository } from './invoice.repository.js';

@Module({
  name: 'orchestrator',
  imports: [AnalyticsModule, MasterDataModule, IngestionModule, ApInvoiceModule, ComplianceModule, CommunicationModule],
  providers: [
    SopLoaderService,       // reads sop_rules.yaml on boot
    WorkflowContextStore,   // in-memory run tracker
    WorkflowEngine,         // YAML-driven step executor
    ValidationService,      // invoice ↔ PO field comparison
    ExceptionService,       // SQLite-backed exception log
    InvoiceRepository,      // persists invoices + line items to SQLite
  ],
  controllers: [OrchestratorTools], // MCP tool endpoints
  exports: [ValidationService, InvoiceRepository, ExceptionService],
})
export class OrchestratorModule {}
