import { ToolDecorator as Tool, ExecutionContext, z, Injectable, UseMiddleware } from '@nitrostack/core';
import { ErrorHandlingMiddleware } from '../../middleware/error-handling.middleware.js';
import { ChangeDetectionService } from '../../services/change-detection.service.js';
import { DependencyService } from '../../services/dependency.service.js';
import { ValidationService } from '../../services/validation.service.js';
import { ConflictService } from '../../services/conflict.service.js';
import { ProvenanceService } from '../../services/provenance.service.js';
import { RiskService } from '../../services/risk.service.js';
import { RemediationService } from '../../services/remediation.service.js';
import { AuditService } from '../../services/audit.service.js';
import { DriftService } from '../../services/drift.service.js';
import { ReportService } from '../../services/report.service.js';
import { BatchService } from '../../services/batch.service.js';
import type {
  ConflictResult,
  InvestigationReport,
  ProposedUpdate,
  RiskAssessment,
} from '../../types/index.js';

// ---------------------------------------------------------------------------
// KnowledgeTools — MCP tool controller (Phases 4–7)
// ---------------------------------------------------------------------------
// Exposes the Phase 4 change/dependency tools and Phase 5 validation/conflict
// tools. Later phases extend this controller with additional capabilities.
// ---------------------------------------------------------------------------

@Injectable({
  deps: [
    ChangeDetectionService,
    DependencyService,
    ValidationService,
    ConflictService,
    ProvenanceService,
    RiskService,
    RemediationService,
    AuditService,
    DriftService,
    ReportService,
    BatchService,
  ],
})
export class KnowledgeTools {
  constructor(
    private readonly changeDetection: ChangeDetectionService,
    private readonly dependencyService: DependencyService,
    private readonly validationService: ValidationService,
    private readonly conflictService: ConflictService,
    private readonly provenanceService: ProvenanceService,
    private readonly riskService: RiskService,
    private readonly remediationService: RemediationService,
    private readonly auditService: AuditService,
    private readonly driftService: DriftService,
    private readonly reportService: ReportService,
    private readonly batchService: BatchService,
  ) {}

  // ── Tool 1: detect_source_changes ───────────────────────────────────────

  /**
   * Detect which authoritative facts have changed between the previous and
   * current version of a source.  This is the starting point of a knowledge
   * integrity investigation.
   *
   * When `source_id` is provided only that source is inspected; otherwise
   * every source is checked.
   */
  @Tool({
    name: 'detect_source_changes',
    description:
      'Detect which authoritative facts have changed between the previous and current version of a source. This is the starting point of a knowledge integrity investigation.',
    inputSchema: z.object({
      source_id: z
        .string()
        .min(1)
        .max(100)
        .optional()
        .describe(
          'Specific source ID to check (e.g. "discount-policy"). If omitted, checks ALL sources.',
        ),
    }),
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
    },
    invocation: {
      invoking: 'Comparing authoritative source versions…',
      invoked: 'Source change detection complete.',
    },
  })
  @UseMiddleware(ErrorHandlingMiddleware)
  async detectSourceChanges(
    input: { source_id?: string },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Running detect_source_changes', {
      source_id: input.source_id ?? '(all)',
    });

    const result = this.changeDetection.detectChanges(input.source_id);

    return {
      total_sources_checked: result.total_sources_checked,
      sources_with_changes: result.sources_with_changes,
      changes: result.changes,
    };
  }

  // ── Tool 2: find_affected_knowledge ─────────────────────────────────────

  /**
   * Traverse the knowledge dependency graph to find every document and claim
   * that depends on a specific authoritative fact.
   */
  @Tool({
    name: 'find_affected_knowledge',
    description:
      'Traverse the knowledge dependency graph to find all documents and claims that depend on a specific authoritative fact. Returns both direct and indirect dependencies.',
    inputSchema: z.object({
      source_id: z
        .string()
        .min(1)
        .max(100)
        .describe('The authoritative source ID (e.g. "discount-policy")'),
      fact_key: z
        .string()
        .min(1)
        .max(100)
        .describe('The specific fact key within the source (e.g. "maximum_discount")'),
    }),
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
    },
    invocation: {
      invoking: 'Traversing knowledge dependency graph…',
      invoked: 'Dependency traversal complete.',
    },
  })
  @UseMiddleware(ErrorHandlingMiddleware)
  async findAffectedKnowledge(
    input: { source_id: string; fact_key: string },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Running find_affected_knowledge', {
      source_id: input.source_id,
      fact_key: input.fact_key,
    });

    const result = this.dependencyService.findAffectedKnowledge(
      input.source_id,
      input.fact_key,
    );

    return result;
  }

  // ── Tool 3: validate_claim ───────────────────────────────────────────────

  @Tool({
    name: 'validate_claim',
    description:
      'Validate whether a specific claim in a document is still consistent with its authoritative source. Returns VALID, CONFLICT, or AMBIGUOUS.',
    inputSchema: z.object({
      document_id: z.string().min(1).max(100).describe('The document containing the claim'),
      claim_id: z.string().min(1).max(100).describe('The specific claim ID to validate'),
    }),
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
    },
    invocation: {
      invoking: 'Validating claim against authoritative knowledge…',
      invoked: 'Claim validation complete.',
    },
  })
  @UseMiddleware(ErrorHandlingMiddleware)
  async validateClaim(
    input: { document_id: string; claim_id: string },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Running validate_claim', input);
    return this.validationService.validateClaim(input.document_id, input.claim_id);
  }

  // ── Tool 4: detect_knowledge_conflicts ──────────────────────────────────

  @Tool({
    name: 'detect_knowledge_conflicts',
    description:
      'Find all knowledge contradictions across enterprise documents for a given authoritative fact. Compares every claim that depends on the fact and reports conflicts.',
    inputSchema: z.object({
      source_id: z.string().min(1).max(100).describe('The authoritative source ID'),
      fact_key: z.string().min(1).max(100).describe('The specific fact key to check conflicts for'),
    }),
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
    },
    invocation: {
      invoking: 'Checking connected claims for conflicts…',
      invoked: 'Knowledge conflict detection complete.',
    },
  })
  @UseMiddleware(ErrorHandlingMiddleware)
  async detectKnowledgeConflicts(
    input: { source_id: string; fact_key: string },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Running detect_knowledge_conflicts', input);
    return this.conflictService.detectConflicts(input.source_id, input.fact_key);
  }

  // ── Tool 5: trace_knowledge_provenance ──────────────────────────────────

  @Tool({
    name: 'trace_knowledge_provenance',
    description:
      'Trace the origin of a specific claim. Shows which authoritative source it depends on, the version history of that source, and whether the claim is based on current or outdated information.',
    inputSchema: z.object({
      document_id: z.string().min(1).max(100).describe('The document containing the claim'),
      claim_id: z.string().min(1).max(100).describe('The specific claim to trace'),
    }),
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
    },
    invocation: {
      invoking: 'Tracing claim provenance across source versions…',
      invoked: 'Knowledge provenance trace complete.',
    },
  })
  @UseMiddleware(ErrorHandlingMiddleware)
  async traceKnowledgeProvenance(
    input: { document_id: string; claim_id: string },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Running trace_knowledge_provenance', input);
    return this.provenanceService.traceClaim(input.document_id, input.claim_id);
  }

  // ── Tool 6: assess_knowledge_risk ───────────────────────────────────────

  @Tool({
    name: 'assess_knowledge_risk',
    description:
      'Assess the risk level of a knowledge conflict. Uses deterministic scoring based on customer-facing impact, financial impact, compliance impact, and document criticality. The server calculates the score — the LLM should explain it.',
    inputSchema: z.object({
      document_id: z.string().min(1).max(100).describe('The document with the conflict'),
      claim_id: z.string().min(1).max(100).describe('The conflicting claim'),
    }),
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
    },
    invocation: {
      invoking: 'Calculating deterministic knowledge risk…',
      invoked: 'Knowledge risk assessment complete.',
    },
  })
  @UseMiddleware(ErrorHandlingMiddleware)
  async assessKnowledgeRisk(
    input: { document_id: string; claim_id: string },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Running assess_knowledge_risk', input);
    return this.riskService.assessRisk(input.document_id, input.claim_id);
  }

  // ── Tool 7: propose_knowledge_update ────────────────────────────────────

  @Tool({
    name: 'propose_knowledge_update',
    description:
      'Generate a remediation proposal to fix a knowledge conflict. Creates a pending update with status AWAITING_APPROVAL. The update is NOT applied until explicitly approved via approve_knowledge_update.',
    inputSchema: z.object({
      document_id: z.string().min(1).max(100).describe('The document to update'),
      claim_id: z.string().min(1).max(100).describe('The conflicting claim to fix'),
      suggested_text: z.string().min(1).max(5000).optional().describe('Optional custom replacement text'),
    }),
    annotations: {
      readOnlyHint: false,
      openWorldHint: false,
    },
    invocation: {
      invoking: 'Preparing a knowledge update proposal…',
      invoked: 'Knowledge update proposal created and awaiting approval.',
    },
  })
  @UseMiddleware(ErrorHandlingMiddleware)
  async proposeKnowledgeUpdate(
    input: { document_id: string; claim_id: string; suggested_text?: string },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Running propose_knowledge_update', {
      document_id: input.document_id,
      claim_id: input.claim_id,
    });
    const proposal = this.remediationService.proposeUpdate(
      input.document_id,
      input.claim_id,
      input.suggested_text,
    );
    return { proposal_id: proposal.id, ...proposal };
  }

  // ── Tool 8: approve_knowledge_update ────────────────────────────────────

  @Tool({
    name: 'approve_knowledge_update',
    description:
      'Approve and apply a pending knowledge update. This is the ONLY tool that modifies the knowledge base. Requires a valid proposal_id from propose_knowledge_update. Records the change in the audit log.',
    inputSchema: z.object({
      proposal_id: z.string().min(1).max(100).describe('The proposal ID to approve'),
      reason: z.string().max(500).optional().describe('Optional reason for approval'),
    }),
    annotations: {
      readOnlyHint: false,
      openWorldHint: false,
    },
    invocation: {
      invoking: 'Applying approved knowledge update…',
      invoked: 'Knowledge update applied and audited.',
    },
  })
  @UseMiddleware(ErrorHandlingMiddleware)
  async approveKnowledgeUpdate(
    input: { proposal_id: string; reason?: string },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Running approve_knowledge_update', {
      proposal_id: input.proposal_id,
    });
    return this.remediationService.approveUpdate(input.proposal_id, input.reason);
  }

  // ── Tool 9: reject_knowledge_update ──────────────────────────────────────

  /**
   * Reject a pending knowledge update proposal. The proposal is marked as
   * REJECTED and recorded in the audit log. Rejected proposals cannot be
   * approved or rejected again.
   */
  @Tool({
    name: 'reject_knowledge_update',
    description:
      'Reject a pending knowledge update proposal. Marks the proposal as REJECTED and records the decision in the audit log. Rejected proposals cannot be approved later.',
    inputSchema: z.object({
      proposal_id: z.string().min(1).max(100).describe('The proposal ID to reject'),
      reason: z
        .string()
        .max(500)
        .optional()
        .describe('Optional reason for rejection'),
    }),
    annotations: {
      readOnlyHint: false,
      openWorldHint: false,
    },
    invocation: {
      invoking: 'Rejecting knowledge update proposal…',
      invoked: 'Knowledge update proposal rejected.',
    },
  })
  @UseMiddleware(ErrorHandlingMiddleware)
  async rejectKnowledgeUpdate(
    input: { proposal_id: string; reason?: string },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Running reject_knowledge_update', {
      proposal_id: input.proposal_id,
    });
    return this.remediationService.rejectUpdate(
      input.proposal_id,
      input.reason,
    );
  }

  // ── Tool 10: get_audit_log ─────────────────────────────────────────────────

  @Tool({
    name: 'get_audit_log',
    description:
      'Retrieve the history of all approved changes and remediation decisions. Shows complete remediation history.',
    inputSchema: z.object({
      document_id: z.string().min(1).max(100).optional().describe('Optional document filter'),
      limit: z.number().int().min(0).max(500).optional().describe('Optional maximum number of entries, default 50'),
    }),
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
    },
    invocation: {
      invoking: 'Retrieving knowledge audit history…',
      invoked: 'Knowledge audit history retrieved.',
    },
  })
  @UseMiddleware(ErrorHandlingMiddleware)
  async getAuditLog(
    input: { document_id?: string; limit?: number },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Running get_audit_log', input);
    return this.auditService.getLog({
      documentId: input.document_id,
      limit: input.limit,
    });
  }

  // ── Tool 11: investigate_knowledge_change (Phase 8) ───────────────────

  @Tool({
    name: 'investigate_knowledge_change',
    description:
      'Run a read-only knowledge integrity investigation. Detects all source changes, traces dependencies, validates claims, finds conflicts, and assesses risk. Returns a comprehensive report. This tool is read-only — it never modifies the knowledge base. To propose fixes, call propose_knowledge_update for individual conflicts.',
    inputSchema: z.object({
      source_id: z
        .string()
        .min(1)
        .max(100)
        .optional()
        .describe(
          'Optional: investigate a specific source. If omitted, investigates ALL changed sources.',
        ),
    }),
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
    },
    invocation: {
      invoking: 'Running complete knowledge integrity investigation…',
      invoked: 'Knowledge integrity investigation complete.',
    },
  })
  @UseMiddleware(ErrorHandlingMiddleware)
  async investigateKnowledgeChange(
    input: { source_id?: string },
    ctx: ExecutionContext,
  ): Promise<InvestigationReport> {
    ctx.logger.info('Running investigate_knowledge_change', {
      source_id: input.source_id ?? '(all changed sources)',
    });

    const changeResult = this.changeDetection.detectChanges(input.source_id);
    const affectedDocumentIds = new Set<string>();
    const conflicts: ConflictResult[] = [];
    const riskAssessments: RiskAssessment[] = [];

    for (const change of changeResult.changes) {
      try {
        const affected = this.dependencyService.findAffectedKnowledge(
          change.source_id,
          change.fact_key,
        );
        for (const document of affected.affected) {
          affectedDocumentIds.add(document.document_id);
        }
      } catch {
        // Skip facts with no dependencies
      }

      try {
        const conflictReport = this.conflictService.detectConflicts(
          change.source_id,
          change.fact_key,
        );
        const confirmedConflicts = conflictReport.results.filter(
          (result) => result.status === 'CONFLICT',
        );
        conflicts.push(...confirmedConflicts);

        for (const conflict of confirmedConflicts) {
          try {
            const risk = this.riskService.assessRisk(
              conflict.document_id,
              conflict.claim_id,
            );
            riskAssessments.push(risk);
          } catch {
            // Skip risk assessment failures for edge cases
          }
        }
      } catch {
        // Skip facts with no dependencies or conflict detection errors
      }
    }

    return {
      investigation_summary: {
        sources_checked: changeResult.total_sources_checked,
        changes_detected: changeResult.changes.length,
        documents_affected: affectedDocumentIds.size,
        conflicts_found: conflicts.length,
        critical_risks: riskAssessments.filter(
          (assessment) => assessment.risk_level === 'CRITICAL',
        ).length,
        remediations_proposed: 0,
      },
      changes: changeResult.changes,
      conflicts,
      risk_assessments: riskAssessments,
      proposed_remediations: [],
    };
  }

  // ── Tool 12: batch_approve_updates ──────────────────────────────────────

  /**
   * Approve multiple pending proposals in a single call, with an optional
   * risk ceiling that automatically skips proposals above the threshold.
   */
  @Tool({
    name: 'batch_approve_updates',
    description:
      'Approve multiple pending knowledge update proposals in a single call. Supports a risk_ceiling to automatically skip proposals above a given risk level (e.g. set risk_ceiling to "MEDIUM" to only approve LOW and MEDIUM risk proposals). Proposals that are stale, already applied, or above the risk ceiling are skipped — the tool continues with the remaining proposals.',
    inputSchema: z.object({
      proposal_ids: z
        .array(z.string().min(1).max(100))
        .min(1)
        .max(50)
        .describe('Array of proposal IDs to approve (1–50)'),
      risk_ceiling: z
        .enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
        .optional()
        .describe(
          'Maximum risk level to approve. Proposals above this level are skipped. If omitted, all risk levels are approved.',
        ),
      reason: z
        .string()
        .max(500)
        .optional()
        .describe('Optional reason applied to all approvals'),
    }),
    annotations: {
      readOnlyHint: false,
      openWorldHint: false,
    },
    invocation: {
      invoking: 'Batch approving knowledge updates…',
      invoked: 'Batch approval complete.',
    },
  })
  @UseMiddleware(ErrorHandlingMiddleware)
  async batchApproveUpdates(
    input: { proposal_ids: string[]; risk_ceiling?: string; reason?: string },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Running batch_approve_updates', {
      count: input.proposal_ids.length,
      risk_ceiling: input.risk_ceiling ?? '(none)',
    });
    return this.batchService.batchApprove(
      input.proposal_ids,
      input.risk_ceiling,
      input.reason,
    );
  }

  // ── Tool 13: generate_compliance_report ─────────────────────────────────

  /**
   * Generate a structured compliance report aggregating change detection,
   * conflict analysis, risk scoring, and audit history into a single
   * deliverable suitable for regulators and auditors.
   */
  @Tool({
    name: 'generate_compliance_report',
    description:
      'Generate a structured compliance report aggregating all knowledge conflicts, risk assessments, remediation history, and per-department health metrics. The report includes a knowledge health percentage, outstanding conflicts sorted by risk, completed remediations from the audit log, and a department breakdown. Suitable for compliance officers and auditors.',
    inputSchema: z.object({
      department: z
        .string()
        .min(1)
        .max(100)
        .optional()
        .describe('Scope the report to a specific department (e.g. "Sales", "Finance")'),
      min_risk_level: z
        .enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
        .optional()
        .describe('Minimum risk level to include in the report. Defaults to MEDIUM.'),
      include_remediated: z
        .boolean()
        .optional()
        .describe('Whether to include already-remediated items from the audit log. Defaults to true.'),
    }),
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
    },
    invocation: {
      invoking: 'Generating compliance report…',
      invoked: 'Compliance report generated.',
    },
  })
  @UseMiddleware(ErrorHandlingMiddleware)
  async generateComplianceReport(
    input: {
      department?: string;
      min_risk_level?: string;
      include_remediated?: boolean;
    },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Running generate_compliance_report', {
      department: input.department ?? '(all)',
      min_risk_level: input.min_risk_level ?? 'MEDIUM',
    });
    return this.reportService.generateComplianceReport({
      department: input.department,
      minRiskLevel: input.min_risk_level,
      includeRemediated: input.include_remediated,
    });
  }

  // ── Tool 14: get_knowledge_drift_summary ────────────────────────────────

  /**
   * Compute overall knowledge staleness metrics in a single call —
   * answers "How stale is our knowledge base?" with per-source breakdown.
   */
  @Tool({
    name: 'get_knowledge_drift_summary',
    description:
      'Compute a single-call knowledge drift summary: staleness score (0–100, higher = more stale), total facts changed, conflict breakdown, most affected department, and highest-risk document. Includes a per-source drift breakdown. Use this as a quick health dashboard before deciding which tools to call for deeper investigation.',
    inputSchema: z.object({
      source_id: z
        .string()
        .min(1)
        .max(100)
        .optional()
        .describe(
          'Optional: scope to a specific source. If omitted, computes drift across ALL sources.',
        ),
    }),
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
    },
    invocation: {
      invoking: 'Computing knowledge drift metrics…',
      invoked: 'Knowledge drift summary complete.',
    },
  })
  @UseMiddleware(ErrorHandlingMiddleware)
  async getKnowledgeDriftSummary(
    input: { source_id?: string },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Running get_knowledge_drift_summary', {
      source_id: input.source_id ?? '(all)',
    });
    return this.driftService.getDriftSummary(input.source_id);
  }
}
