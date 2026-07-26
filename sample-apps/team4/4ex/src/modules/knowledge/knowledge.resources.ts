import {
  ExecutionContext,
  Injectable,
  ResourceDecorator as Resource,
} from '@nitrostack/core';
import { DataLoaderService } from '../../services/data-loader.service.js';
import { AuditService } from '../../services/audit.service.js';
import { ChangeDetectionService } from '../../services/change-detection.service.js';
import { ConflictService } from '../../services/conflict.service.js';

/** Read-only MCP resources for browsing the enterprise knowledge base. */
@Injectable({
  deps: [DataLoaderService, AuditService, ChangeDetectionService, ConflictService],
})
export class KnowledgeResources {
  constructor(
    private readonly dataLoader: DataLoaderService,
    private readonly auditService: AuditService,
    private readonly changeDetection: ChangeDetectionService,
    private readonly conflictService: ConflictService,
  ) {}

  // ── Resource 1: Authoritative Sources ──────────────────────────────────

  @Resource({
    uri: 'knowledge://sources',
    name: 'Authoritative Sources',
    description: 'Current authoritative enterprise sources and their facts',
    mimeType: 'application/json',
    annotations: { audience: ['assistant', 'user'] },
  })
  async getAuthoritativeSources(_uri: string, _ctx: ExecutionContext) {
    return this.dataLoader.getAuthoritativeSources();
  }

  // ── Resource 2: Enterprise Documents ───────────────────────────────────

  @Resource({
    uri: 'knowledge://documents',
    name: 'Enterprise Documents',
    description: 'All enterprise documents with their claims and dependencies',
    mimeType: 'application/json',
    annotations: { audience: ['assistant', 'user'] },
  })
  async getDocuments(_uri: string, _ctx: ExecutionContext) {
    return this.dataLoader.getDocuments();
  }

  // ── Resource 3: Pending Updates ────────────────────────────────────────

  @Resource({
    uri: 'knowledge://pending-updates',
    name: 'Pending Updates',
    description: 'Knowledge update proposals awaiting approval',
    mimeType: 'application/json',
    annotations: { audience: ['assistant', 'user'] },
  })
  async getPendingUpdates(_uri: string, _ctx: ExecutionContext) {
    return this.dataLoader
      .getPendingUpdates()
      .filter((update) => update.status === 'AWAITING_APPROVAL');
  }

  // ── Resource 4: Audit Log ──────────────────────────────────────────────

  @Resource({
    uri: 'knowledge://audit-log',
    name: 'Audit Log',
    description: 'History of all approved, rejected, and applied knowledge changes',
    mimeType: 'application/json',
    annotations: { audience: ['assistant', 'user'] },
  })
  async getAuditLog(_uri: string, _ctx: ExecutionContext) {
    return this.auditService.getLog({ limit: 100 });
  }

  // ── Resource 5: Dependency Graph ───────────────────────────────────────

  @Resource({
    uri: 'knowledge://dependency-graph',
    name: 'Knowledge Dependency Graph',
    description:
      'The complete dependency graph mapping authoritative facts to dependent document claims. Use this to understand the topology before deciding which tools to call.',
    mimeType: 'application/json',
    annotations: { audience: ['assistant'] },
  })
  async getDependencyGraph(_uri: string, _ctx: ExecutionContext) {
    const dependencies = this.dataLoader.getDependencies();
    const sources = this.dataLoader.getAuthoritativeSources();
    const documents = this.dataLoader.getDocuments();

    // Build a structured graph grouped by source → fact → dependent documents
    const sourceMap = new Map(sources.map((s) => [s.id, s]));
    const docMap = new Map(documents.map((d) => [d.id, d]));

    // Group dependencies by source_id
    const graphBySource: Record<
      string,
      {
        source_id: string;
        source_title: string;
        facts: Record<
          string,
          {
            fact_key: string;
            current_value: string;
            dependent_claims: {
              document_id: string;
              document_title: string;
              claim_id: string;
              dependency_type: string;
            }[];
          }
        >;
      }
    > = {};

    for (const dep of dependencies) {
      if (!graphBySource[dep.source_id]) {
        const source = sourceMap.get(dep.source_id);
        graphBySource[dep.source_id] = {
          source_id: dep.source_id,
          source_title: source?.title ?? dep.source_id,
          facts: {},
        };
      }

      const sourceEntry = graphBySource[dep.source_id];
      if (!sourceEntry.facts[dep.fact_key]) {
        const source = sourceMap.get(dep.source_id);
        sourceEntry.facts[dep.fact_key] = {
          fact_key: dep.fact_key,
          current_value: source?.facts[dep.fact_key] ?? 'unknown',
          dependent_claims: [],
        };
      }

      const doc = docMap.get(dep.dependent_document_id);
      sourceEntry.facts[dep.fact_key].dependent_claims.push({
        document_id: dep.dependent_document_id,
        document_title: doc?.title ?? dep.dependent_document_id,
        claim_id: dep.dependent_claim_id,
        dependency_type: dep.dependency_type,
      });
    }

    return {
      total_sources: sources.length,
      total_dependencies: dependencies.length,
      total_documents: documents.length,
      graph: Object.values(graphBySource).map((entry) => ({
        ...entry,
        facts: Object.values(entry.facts),
      })),
    };
  }

  // ── Resource 6: Health Metrics ─────────────────────────────────────────

  @Resource({
    uri: 'knowledge://health-metrics',
    name: 'Knowledge Health Metrics',
    description:
      'Real-time health metrics computed on-read: staleness score, conflict counts by department, remediation velocity. Use this for dashboard data and to inform tool selection.',
    mimeType: 'application/json',
    annotations: { audience: ['assistant', 'user'] },
  })
  async getHealthMetrics(_uri: string, _ctx: ExecutionContext) {
    // Detect all changes
    const changeResult = this.changeDetection.detectChanges();

    // Track validation results across all changed facts
    let totalClaimsChecked = 0;
    let validCount = 0;
    let conflictCount = 0;
    let ambiguousCount = 0;
    const departmentsAffected = new Set<string>();
    const conflictingClaimIds = new Set<string>();

    for (const change of changeResult.changes) {
      try {
        const conflictReport = this.conflictService.detectConflicts(
          change.source_id,
          change.fact_key,
        );
        totalClaimsChecked += conflictReport.total_claims_checked;
        validCount += conflictReport.valid;
        conflictCount += conflictReport.conflicts;
        ambiguousCount += conflictReport.ambiguous;

        // Track affected departments and conflicting claims
        for (const result of conflictReport.results) {
          if (result.status === 'CONFLICT') {
            const doc = this.dataLoader.getDocumentById(result.document_id);
            if (doc) {
              departmentsAffected.add(doc.department);
            }
            conflictingClaimIds.add(`${result.document_id}:${result.claim_id}`);
          }
        }
      } catch {
        // Skip facts with no dependencies
      }
    }

    // Remediation velocity — scope applied count to currently-detected conflicts
    const pendingUpdates = this.dataLoader.getPendingUpdates();
    const auditLog = this.auditService.getLog({ limit: 500 });
    const appliedCount = auditLog.filter(
      (e) =>
        e.action === 'UPDATE_APPLIED' &&
        conflictingClaimIds.has(`${e.document_id}:${e.claim_id}`),
    ).length;
    const awaitingCount = pendingUpdates.filter(
      (u) => u.status === 'AWAITING_APPROVAL',
    ).length;

    // Calculate health percentage (valid / total checked, or 100% if nothing checked)
    const healthPercentage =
      totalClaimsChecked > 0
        ? Math.round((validCount / totalClaimsChecked) * 100)
        : 100;

    // Staleness = inverse of health
    const stalenessScore = 100 - healthPercentage;

    return {
      computed_at: new Date().toISOString(),
      overall_health_percentage: healthPercentage,
      staleness_score: stalenessScore,
      total_sources: changeResult.total_sources_checked,
      sources_with_changes: changeResult.sources_with_changes,
      total_facts_changed: changeResult.changes.length,
      total_claims_checked: totalClaimsChecked,
      claims_by_status: {
        VALID: validCount,
        CONFLICT: conflictCount,
        AMBIGUOUS: ambiguousCount,
      },
      remediation_velocity: {
        applied: appliedCount,
        awaiting_approval: awaitingCount,
        outstanding_conflicts: Math.max(0, conflictCount - appliedCount - awaitingCount),
      },
      departments_affected: [...departmentsAffected].sort(),
    };
  }

  // ── Resource 7: Source Owners ──────────────────────────────────────────

  @Resource({
    uri: 'knowledge://source-owners',
    name: 'Source Ownership Directory',
    description:
      'Maps each authoritative source to its department, owner, and classification. Use this to route remediation tasks to the right people.',
    mimeType: 'application/json',
    annotations: { audience: ['assistant', 'user'] },
  })
  async getSourceOwners(_uri: string, _ctx: ExecutionContext) {
    const sources = this.dataLoader.getAuthoritativeSources();

    return sources.map((source) => ({
      source_id: source.id,
      title: source.title,
      department: source.department,
      owner: source.metadata.owner,
      classification: source.metadata.classification,
      version: source.version,
      effective_date: source.effective_date,
      last_updated: source.metadata.last_updated,
    }));
  }
}
