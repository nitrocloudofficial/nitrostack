import { Module } from '@nitrostack/core';
import { KnowledgeTools } from './knowledge.tools.js';
import { KnowledgeResources } from './knowledge.resources.js';
import { KnowledgePrompts } from './knowledge.prompts.js';
import { DataLoaderService } from '../../services/data-loader.service.js';
import { DependencyService } from '../../services/dependency.service.js';
import { ChangeDetectionService } from '../../services/change-detection.service.js';
import { ValidationService } from '../../services/validation.service.js';
import { ConflictService } from '../../services/conflict.service.js';
import { ProvenanceService } from '../../services/provenance.service.js';
import { RiskService } from '../../services/risk.service.js';
import { AuditService } from '../../services/audit.service.js';
import { RemediationService } from '../../services/remediation.service.js';
import { DriftService } from '../../services/drift.service.js';
import { ReportService } from '../../services/report.service.js';
import { BatchService } from '../../services/batch.service.js';
import { ErrorHandlingMiddleware } from '../../middleware/error-handling.middleware.js';
import { PdfIngestionService } from '../../services/pdf-ingestion.service.js';

@Module({
  name: 'knowledge-integrity',
  description: 'Enterprise knowledge integrity — change detection, dependency traversal, conflict detection, risk scoring, remediation, and audit.',
  controllers: [KnowledgeTools, KnowledgeResources, KnowledgePrompts],
  providers: [
    PdfIngestionService,
    DataLoaderService,
    DependencyService,
    ChangeDetectionService,
    ValidationService,
    ConflictService,
    ProvenanceService,
    RiskService,
    AuditService,
    RemediationService,
    DriftService,
    ReportService,
    BatchService,
    ErrorHandlingMiddleware,
  ],
  exports: [
    DataLoaderService,
    DependencyService,
    ChangeDetectionService,
    ValidationService,
    ConflictService,
    ProvenanceService,
    RiskService,
    AuditService,
    RemediationService,
    DriftService,
    ReportService,
    BatchService,
    ErrorHandlingMiddleware,
  ],
})
export class KnowledgeIntegrityModule {}

