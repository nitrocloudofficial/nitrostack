/**
 * CoreResources — System resources for Vitalis MCP gateway.
 * Exposes vitalis://safety-policy, vitalis://data-sources, vitalis://audit/recent, vitalis://metrics.
 */
import {
  ResourceDecorator as Resource,
  ExecutionContext,
  Injectable,
  ControllerDecorator as Controller,
} from '@nitrostack/core';
import { AuditStore } from '../../gateway/audit.store.js';
import { MetricsStore } from '../../gateway/metrics.store.js';
import { ApiKeyGuard } from '../../gateway/api-key.guard.js';
import { hasAdminScope } from '../../gateway/scope.guard.js';
import { withResourceAudit } from '../../gateway/resource-audit.js';

@Controller('core')
@Injectable({ deps: [AuditStore, MetricsStore, ApiKeyGuard] })
export class CoreResources {
  constructor(
    private readonly auditStore: AuditStore,
    private readonly metricsStore: MetricsStore,
    private readonly apiKeyGuard: ApiKeyGuard,
  ) {}

  @Resource({
    uri: 'vitalis://safety-policy',
    name: 'Clinical Safety Policy',
    description: 'Full text of safety guardrails, urgency tier definitions, and mandatory disclaimer policy.',
    mimeType: 'text/markdown',
  })
  async getSafetyPolicy(_uri: string, ctx: ExecutionContext) {
    return withResourceAudit('vitalis://safety-policy', ctx, () => `# Vitalis Clinical Intelligence — Safety & Compliance Policy

## 1. Safety Framework
Vitalis operates under a strict three-layer safety system:
- **Layer 1: Pre-Check (EmergencyDetectionGuard)** — Programmatically scans all input text for critical emergency red-flag terms before tool execution.
- **Layer 2: Compute (Deterministic Engines)** — Rule-based triage engines and verified lab reference ranges prevent AI hallucination of urgency or thresholds.
- **Layer 3: Post-Check (ClinicalSafetyInterceptor)** — Scans output for banned overreach phrases (e.g. "you are diagnosed with"), stamps urgency tiers, forces safety disclaimers, and prepends emergency banners.

## 2. Urgency Tier Definitions
- **emergency**: Red-flag symptom matched. Call emergency services (911/112/108) immediately.
- **urgent**: Requires evaluation by a clinician within 12-24 hours.
- **routine**: Evaluate within 3-5 days.
- **self_care**: Mild, self-limiting condition; home care guidance provided.
- **not_applicable**: Non-clinical/informational tools (research, FHIR lookup).

## 3. Disclaimers & Synthetic Data Notice
All clinical responses automatically include the standard disclaimer:
> "For informational purposes only. Not medical advice, diagnosis, or treatment."
All FHIR patient records are 100% synthetic (Synthea generator) and contain ZERO real PHI.
`);
  }

  @Resource({
    uri: 'vitalis://data-sources',
    name: 'Data Source Registry',
    description: 'Registry of external clinical intelligence data APIs, base URLs, rate limits, and terms.',
    mimeType: 'text/markdown',
  })
  async getDataSources(_uri: string, ctx: ExecutionContext) {
    return withResourceAudit('vitalis://data-sources', ctx, () => `# Vitalis External Data Source Registry

| API Name | Base URL | Auth Required | Rate Limit | Purpose |
|---|---|---|---|---|
| **NLM RxNorm** | \`https://rxnav.nlm.nih.gov/REST\` | None | <= 5 req/s | Drug name resolution & RxCUI mapping |
| **NLM RxClass** | \`https://rxnav.nlm.nih.gov/REST/rxclass\` | None | <= 5 req/s | Drug class hierarchy lookup |
| **NLM Clinical Tables** | \`https://clinicaltables.nlm.nih.gov/api\` | None | <= 3 req/s | ICD-10-CM code lookup |
| **openFDA** | \`https://api.fda.gov\` | Optional Key | 240 req/min (with key) | FDA Drug Labels, Adverse Events (FAERS), Recalls |
| **NCBI E-utilities** | \`https://eutils.ncbi.nlm.nih.gov/entrez/eutils\` | Optional Key | 3 req/s (10/s with key) | PubMed article search, XML abstracts, MeSH terms |
| **ClinicalTrials.gov v2** | \`https://clinicaltrials.gov/api/v2\` | None | <= 3 req/s | Human clinical trial protocol search & details |
| **HAPI FHIR R4** | \`https://hapi.fhir.org/baseR4\` | None | Public sandbox | Synthetic patient EHR data (Synthea) |
`);
  }

  @Resource({
    uri: 'vitalis://audit/recent',
    name: 'Recent Audit Log Entries',
    description: 'Last 50 structured audit log entries recorded by AuditLogInterceptor (Admin scope required).',
    mimeType: 'application/json',
  })
  async getRecentAuditLogs(_uri: string, ctx: ExecutionContext) {
    return withResourceAudit('vitalis://audit/recent', ctx, async () => {
      await this.apiKeyGuard.canActivate(ctx);
      const auth = ctx.auth;
      if (!hasAdminScope(auth as any)) {
        throw new Error(
          'SCOPE_DENIED: Accessing vitalis://audit/recent requires the configured admin identity and scope admin:audit.',
        );
      }

      const entries = this.auditStore.getRecentEntries();
      return JSON.stringify({ count: entries.length, entries }, null, 2);
    });
  }

  @Resource({
    uri: 'vitalis://metrics',
    name: 'Server Telemetry & Performance Metrics',
    description: 'Admin-only telemetry stats including request counts, percentile latency, cache/upstream errors, and memory usage.',
    mimeType: 'application/json',
  })
  async getMetrics(_uri: string, ctx: ExecutionContext) {
    return withResourceAudit('vitalis://metrics', ctx, async () => {
      await this.apiKeyGuard.canActivate(ctx);
      if (!hasAdminScope(ctx.auth as any)) {
        throw new Error(
          'SCOPE_DENIED: Accessing vitalis://metrics requires the configured admin identity and scope admin:audit.',
        );
      }

      const metrics = this.metricsStore.getMetrics();
      return JSON.stringify(metrics, null, 2);
    });
  }
}
