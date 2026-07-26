import {
  ExecutionContext,
  Injectable,
  PromptDecorator as Prompt,
} from '@nitrostack/core';
import {
  DataLoaderService,
  KnowledgeInputError,
} from '../../services/data-loader.service.js';

/** MCP prompt templates that guide a client through the established tool flow. */
@Injectable({ deps: [DataLoaderService] })
export class KnowledgePrompts {
  constructor(private readonly dataLoader: DataLoaderService) {}

  // ── Prompt 1: investigate_policy_change ─────────────────────────────────

  @Prompt({
    name: 'investigate_policy_change',
    description: 'Investigate the impact of a policy change on enterprise knowledge',
    arguments: [
      {
        name: 'policy',
        description: 'The policy or source that changed (by name or ID)',
        required: false,
      },
    ],
  })
  async investigatePolicyChange(
    args: { policy?: string },
    _ctx: ExecutionContext,
  ) {
    const policy = args.policy?.trim();
    const source = policy ? this.resolveSource(policy) : undefined;
    const scope = source
      ? `Focus on authoritative source ID \`${source.id}\`. First call detect_source_changes with source_id set to \`${source.id}\`.`
      : 'Start by identifying every changed authoritative source.';

    return [
      {
        role: 'user' as const,
        content: `${scope}\n\nInvestigate its impact using the knowledge-integrity MCP tools. First call detect_source_changes. For each changed fact, call find_affected_knowledge and detect_knowledge_conflicts. For every confirmed conflict, call assess_knowledge_risk and trace_knowledge_provenance. Summarize the evidence, prioritizing CRITICAL and HIGH risks. Only call propose_knowledge_update after presenting the proposed change for review; do not call approve_knowledge_update unless the user explicitly approves it.`,
      },
    ];
  }

  // ── Prompt 2: knowledge_health_check ────────────────────────────────────

  @Prompt({
    name: 'knowledge_health_check',
    description: 'Run a full health check on enterprise knowledge consistency',
    arguments: [],
  })
  async knowledgeHealthCheck(_args: Record<string, never>, _ctx: ExecutionContext) {
    return [
      {
        role: 'user' as const,
        content: 'Run a comprehensive enterprise knowledge health check. Call detect_source_changes with no source_id. For every changed fact, use find_affected_knowledge and detect_knowledge_conflicts, then assess_knowledge_risk for each confirmed conflict. Trace provenance for the highest-risk claims. Report the number of changed facts, affected documents, conflicts by status, risk levels, and recommended remediations. Do not apply any update without explicit user approval.',
      },
    ];
  }

  // ── Prompt 3: compliance_audit_report ────────────────────────────────────

  @Prompt({
    name: 'compliance_audit_report',
    description:
      'Generate a structured compliance audit report showing all knowledge inconsistencies, remediations completed, and outstanding issues — suitable for regulators and auditors',
    arguments: [
      {
        name: 'department',
        description:
          'Scope the report to a specific department (e.g. "Finance", "Legal & Compliance"). If omitted, covers all departments.',
        required: false,
      },
      {
        name: 'risk_level',
        description:
          'Minimum risk level to include in the report: LOW, MEDIUM, HIGH, or CRITICAL. Defaults to MEDIUM.',
        required: false,
      },
    ],
  })
  async complianceAuditReport(
    args: { department?: string; risk_level?: string },
    _ctx: ExecutionContext,
  ) {
    const dept = args.department?.trim();
    const risk = args.risk_level?.trim()?.toUpperCase() || 'MEDIUM';

    const validRiskLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    if (!validRiskLevels.includes(risk)) {
      throw new KnowledgeInputError(
        `Invalid risk_level "${args.risk_level}". Must be one of: ${validRiskLevels.join(', ')}`,
      );
    }

    const departmentFilter = dept
      ? `Filter all results to the "${dept}" department only.`
      : 'Cover all departments in the organization.';

    return [
      {
        role: 'user' as const,
        content: `Generate a compliance audit report. ${departmentFilter} Include only conflicts at risk level ${risk} or above.\n\nFollow these steps:\n1. Call detect_source_changes to identify all policy changes.\n2. For each changed fact, call find_affected_knowledge and detect_knowledge_conflicts.\n3. For every conflict, call assess_knowledge_risk and filter to ${risk} or above.\n4. Call get_audit_log to retrieve completed remediations.\n5. Read the knowledge://pending-updates resource to check outstanding proposals.\n\nPresent the report in this structure:\n- **Executive Summary**: Total policies checked, changes detected, conflicts found, remediations completed vs outstanding.\n- **Outstanding Conflicts**: Sorted by risk level (highest first), with document name, department, claim text, authoritative value, and risk score.\n- **Completed Remediations**: From audit log — what was fixed, when, and by whom.\n- **Recommended Actions**: Prioritized list of what to fix next, with estimated impact.\n\nThis report may be shared with external auditors. Use precise language and include all evidence.`,
      },
    ];
  }

  // ── Prompt 4: department_knowledge_review ────────────────────────────────

  @Prompt({
    name: 'department_knowledge_review',
    description:
      'Review the knowledge health of a specific department — find all conflicts, outdated documents, and pending fixes within that department',
    arguments: [
      {
        name: 'department',
        description:
          'The department to review (e.g. "Sales", "HR", "IT Security", "Finance"). Required.',
        required: true,
      },
    ],
  })
  async departmentKnowledgeReview(
    args: { department: string },
    _ctx: ExecutionContext,
  ) {
    const dept = args.department?.trim();
    if (!dept) {
      throw new KnowledgeInputError(
        'department is required for department_knowledge_review',
      );
    }

    // Verify the department exists in the data
    const documents = this.dataLoader.getDocuments();
    const deptDocs = documents.filter(
      (doc) => doc.department.toLowerCase() === dept.toLowerCase(),
    );
    if (deptDocs.length === 0) {
      const allDepts = [...new Set(documents.map((d) => d.department))].sort();
      throw new KnowledgeInputError(
        `No documents found for department "${dept}". Available departments: ${allDepts.join(', ')}`,
      );
    }

    const docList = deptDocs
      .map((d) => `  - ${d.id} ("${d.title}", criticality: ${d.criticality}, customer-facing: ${d.customer_facing})`)
      .join('\n');

    return [
      {
        role: 'user' as const,
        content: `Run a knowledge review scoped to the **${dept}** department.\n\nDocuments in this department:\n${docList}\n\nFollow these steps:\n1. Call detect_source_changes to find all policy changes.\n2. For each changed fact, call find_affected_knowledge to check if any of the ${dept} documents are affected.\n3. For every affected claim in a ${dept} document, call validate_claim to check its status.\n4. For any CONFLICT claim, call assess_knowledge_risk to score the risk.\n5. Read knowledge://pending-updates to check if fixes are already proposed.\n\nPresent results as:\n- **Department Summary**: ${deptDocs.length} documents, X with conflicts, Y clean.\n- **Conflicts Found**: Each conflict with document name, claim text, current vs authoritative value, and risk level.\n- **Clean Documents**: List documents with no issues.\n- **Recommended Priority**: Which conflicts to fix first and why.\n\nOnly call propose_knowledge_update after presenting findings. Do not approve without explicit user permission.`,
      },
    ];
  }

  // ── Prompt 5: remediation_planning ──────────────────────────────────────

  @Prompt({
    name: 'remediation_planning',
    description:
      'Create a prioritized remediation plan for all outstanding knowledge conflicts — what to fix first, estimated effort, and who owns each fix',
    arguments: [
      {
        name: 'source_id',
        description:
          'Scope the plan to conflicts from a specific policy source (e.g. "discount-policy"). If omitted, covers all sources.',
        required: false,
      },
      {
        name: 'auto_propose',
        description:
          'Set to "true" to automatically create proposals for MEDIUM and LOW risk conflicts. HIGH and CRITICAL always require manual review. Defaults to "false".',
        required: false,
      },
    ],
  })
  async remediationPlanning(
    args: { source_id?: string; auto_propose?: string },
    _ctx: ExecutionContext,
  ) {
    const sourceId = args.source_id?.trim();
    const autoPropose = args.auto_propose?.trim()?.toLowerCase() === 'true';

    if (sourceId) {
      // Validate the source exists
      this.resolveSourceById(sourceId);
    }

    const sourceFilter = sourceId
      ? `Scope the investigation to source_id "${sourceId}".`
      : 'Investigate all changed sources.';

    const autoProposeBehavior = autoPropose
      ? 'For MEDIUM and LOW risk conflicts, automatically call propose_knowledge_update to create proposals.'
      : 'Do NOT create any proposals automatically. Present findings only.';

    return [
      {
        role: 'user' as const,
        content: `Create a remediation plan for outstanding knowledge conflicts. ${sourceFilter}\n\nFollow these steps:\n1. Call detect_source_changes${sourceId ? ` with source_id "${sourceId}"` : ''} to find all changes.\n2. For each changed fact, call detect_knowledge_conflicts to find all conflicts.\n3. For each confirmed conflict, call assess_knowledge_risk to score the risk.\n4. Read knowledge://pending-updates to check what is already proposed.\n5. Call get_audit_log to see what has already been fixed.\n\nBuild a prioritized remediation plan with these tiers:\n- **Tier 1 — CRITICAL risks**: List each with document, claim, risk score, and department owner. These require immediate human review before any action.\n- **Tier 2 — HIGH risks**: List each with proposed fix text. Require explicit confirmation before calling propose_knowledge_update.\n- **Tier 3 — MEDIUM/LOW risks**: ${autoProposeBehavior}\n- **Already Handled**: List proposals that are already AWAITING_APPROVAL or have been APPLIED.\n\nFor each tier, report the count of affected documents and estimated remediation scope. Present as an actionable checklist the user can work through sequentially.`,
      },
    ];
  }

  // ── Prompt 6: executive_knowledge_briefing ──────────────────────────────

  @Prompt({
    name: 'executive_knowledge_briefing',
    description:
      'Prepare a concise executive briefing on enterprise knowledge health — non-technical, focused on business impact and KPIs',
    arguments: [
      {
        name: 'time_period',
        description:
          'Context for the briefing (e.g. "since Q3 policy updates", "after the 2024 compliance review"). Informational only.',
        required: false,
      },
    ],
  })
  async executiveKnowledgeBriefing(
    args: { time_period?: string },
    _ctx: ExecutionContext,
  ) {
    const timePeriod = args.time_period?.trim();
    const timeContext = timePeriod
      ? `Frame the briefing in the context of: "${timePeriod}".`
      : '';

    return [
      {
        role: 'user' as const,
        content: `Prepare an executive briefing on enterprise knowledge health. ${timeContext}\n\nFollow these steps:\n1. Call detect_source_changes to count all policy changes.\n2. For each changed fact, call detect_knowledge_conflicts and assess_knowledge_risk for each confirmed conflict.\n3. Call get_audit_log to see recent remediation activity.\n4. Read knowledge://pending-updates for outstanding proposals.\n\nPresent a concise executive briefing with:\n- **Knowledge Health Score**: Calculate the percentage of validated claims that are VALID out of total claims checked. Present as "X% of enterprise knowledge is current."\n- **Top 3 Highest-Risk Issues**: For each, explain the business impact in plain language (e.g., "Sales teams are quoting 20% discounts when the maximum is now 10% — this could result in revenue loss").\n- **Remediation Velocity**: How many issues have been fixed (from audit log) vs. how many are still outstanding (from pending updates + unproposed conflicts).\n- **Department Exposure**: Which departments have the most outdated knowledge.\n\nKeep language non-technical. Use business impact framing. This is a read-only briefing — do NOT propose or approve any updates.`,
      },
    ];
  }

  // ── Prompt 7: rollback_assessment ───────────────────────────────────────

  @Prompt({
    name: 'rollback_assessment',
    description:
      'Assess the impact of rolling back recent knowledge changes — check if applied updates are still valid or if the authoritative source has changed again',
    arguments: [
      {
        name: 'document_id',
        description:
          'Scope the assessment to a specific document (e.g. "sales-playbook"). If omitted, assesses all recent changes.',
        required: false,
      },
    ],
  })
  async rollbackAssessment(
    args: { document_id?: string },
    _ctx: ExecutionContext,
  ) {
    const documentId = args.document_id?.trim();

    if (documentId) {
      // Validate the document exists
      const doc = this.dataLoader.getDocumentById(documentId);
      if (!doc) {
        throw new KnowledgeInputError(
          `Unknown document: "${documentId}"`,
        );
      }
    }

    const documentFilter = documentId
      ? `Scope the assessment to document "${documentId}" only.`
      : 'Assess all recently applied changes.';

    return [
      {
        role: 'user' as const,
        content: `Assess whether recent knowledge changes should be rolled back. ${documentFilter}\n\nFollow these steps:\n1. Call get_audit_log${documentId ? ` with document_id "${documentId}"` : ''} to retrieve all UPDATE_APPLIED entries.\n2. For each applied change, call validate_claim on the updated claim to check if it is still VALID against the current authoritative source.\n3. For any claim that is no longer VALID (the authoritative source may have changed again since the update was applied), call trace_knowledge_provenance to understand the version history.\n4. For any rollback candidates, call assess_knowledge_risk to understand the business impact of the current state.\n\nPresent the assessment as:\n- **Total Changes Reviewed**: How many updates from the audit log were assessed.\n- **Still Valid**: Changes where the claim still matches the current authoritative value — no rollback needed.\n- **Rollback Candidates**: Changes where the authoritative source has shifted again since the update, making the applied fix potentially incorrect. Include the version history and risk assessment.\n- **Recommended Actions**: For each rollback candidate, explain whether to revert, update again, or leave as-is, with reasoning.\n\nThis is a read-only assessment. Do NOT make any changes without explicit user approval.`,
      },
    ];
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private resolveSource(policy: string) {
    const normalized = policy.toLowerCase();
    const source = this.dataLoader.getAuthoritativeSources().find(
      (candidate) =>
        candidate.id.toLowerCase() === normalized ||
        candidate.title.toLowerCase() === normalized,
    );
    if (!source) {
      throw new KnowledgeInputError(
        `Unknown authoritative source: ${policy}`,
      );
    }
    return source;
  }

  private resolveSourceById(sourceId: string) {
    const source = this.dataLoader.getSourceById(sourceId);
    if (!source) {
      throw new KnowledgeInputError(
        `Unknown authoritative source ID: "${sourceId}"`,
      );
    }
    return source;
  }
}
