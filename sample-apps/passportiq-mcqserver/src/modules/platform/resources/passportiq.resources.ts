/**
 * MCP resources — the read-only reference material.
 *
 * ---------------------------------------------------------------------------
 * RESOURCE vs TOOL, AND WHY THIS DISTINCTION IS NOT COSMETIC
 * ---------------------------------------------------------------------------
 * A TOOL is an action the model chooses to take. A RESOURCE is context the client
 * can load before deciding anything. Putting the rulebook behind a tool call
 * would mean the model has to spend a turn asking "what are the rules?" before it
 * can reason about them; exposing it as a resource means the client can attach it
 * up front.
 *
 * The four resources below are exactly the things an officer or a model needs to
 * READ, never to change:
 *
 *   passportiq://applications   the applicant pool with computed risk state
 *   passportiq://rulebook       every rule, with its statutory citation
 *   passportiq://audit-trail    the decision log
 *   passportiq://agent/runs     the agent's reasoning traces
 *
 * ---------------------------------------------------------------------------
 * WHY THE RULEBOOK RESOURCE MATTERS MOST
 * ---------------------------------------------------------------------------
 * It makes the system's policy inspectable WITHOUT running it. An officer can ask
 * "what would you check, and under what authority?" and get all 15 rules with
 * citations, before any application is touched. A fraud-detection system whose
 * criteria can only be discovered by feeding it cases is not auditable, and a
 * government deployment would be right to reject it.
 *
 * Resource handlers receive `(uri, context)` and may return a plain object —
 * builders.buildResource() wraps a non-string return as `{ type: 'json' }`.
 */
import { Injectable, ResourceDecorator } from '@nitrostack/core';
import { ApplicationService } from '../../pipeline/services/application.service.js';
import { AuditLogService } from '../../pipeline/services/audit-log.service.js';
import { GraphService } from '../../pipeline/services/graph.service.js';
import { PipelineStateService } from '../../pipeline/services/pipeline-state.service.js';
import { AgentMemoryService } from '../../agent/services/agent-memory.service.js';
import { RuleService } from '../../verification/services/rule.service.js';
import { DocumentService } from '../../verification/services/document.service.js';

@Injectable({
  deps: [
    ApplicationService,
    PipelineStateService,
    GraphService,
    AuditLogService,
    RuleService,
    DocumentService,
    AgentMemoryService,
  ],
})
export class PassportIqResources {
  constructor(
    private readonly applications: ApplicationService,
    private readonly state: PipelineStateService,
    private readonly graph: GraphService,
    private readonly audit: AuditLogService,
    private readonly rules: RuleService,
    private readonly documents: DocumentService,
    private readonly agentMemory: AgentMemoryService
  ) {}

  /**
   * The applicant pool.
   *
   * Includes each application's CURRENT pipeline state (which stages have run,
   * the score if one exists) rather than only its static fields, because "what do
   * we know about this file right now" is the actual question a client is asking
   * when it loads this. Documents are summarised, not dumped: the full document
   * records are available through get_application, and inlining them here would
   * make the resource large enough that clients truncate it.
   */
  @ResourceDecorator({
    uri: 'passportiq://applications',
    name: 'Applicant pool',
    title: 'PassportIQ — applicant pool',
    description:
      'Every application in the queue with its applicant details, document count, cluster size ' +
      'and current verification state (stages completed, risk score if scored). This is the ' +
      'read model behind the dashboard.',
    mimeType: 'application/json',
    annotations: { audience: ['user', 'assistant'] },
  })
  async listApplications(): Promise<Record<string, unknown>> {
    const applications = this.applications.getAll().map((application) => {
      const id = application.applicationId;
      const linked = this.graph.getLinkedApplicationIds(id);

      return {
        applicationId: id,
        applicantName: application.fullName,
        applicationType: application.applicationType,
        status: application.status,
        submittedAt: application.submittedAt,
        dateOfBirth: application.dateOfBirth,
        passportNumber: application.passport.number,
        address: application.address,
        contact: application.contact ?? null,
        documentCount: application.documents.length,
        documentTypes: application.documents.map((d) => d.type),
        seedProfile: application.seedProfile,
        clusterSize: linked.length + 1,
        linkedApplicationIds: linked,
        verification: {
          completedStages: this.state.getCompletedStages(id),
          missingStages: this.state.getMissingStages(id),
          isComplete: this.state.isPipelineComplete(id),
          riskScore: this.state.getRiskScore(id),
        },
        decision: this.applications.getDecision(id) ?? null,
      };
    });

    return {
      total: applications.length,
      // Named counts rather than a bare list, so a client can render the header
      // stats without walking the array itself.
      summary: {
        pendingReview: applications.filter((a) => a.status === 'pending_review').length,
        highRisk: applications.filter((a) => (a.verification.riskScore ?? 0) >= 60).length,
        decided: applications.filter((a) => a.decision !== null).length,
        clustered: applications.filter((a) => a.clusterSize > 1).length,
      },
      applications,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * The rulebook — every rule with its citation, and the document checklist per
   * application type.
   *
   * Deliberately static: it reflects no application and requires no pipeline run,
   * which is what makes it usable as pre-loaded context and as the answer to "on
   * what authority?" during a review.
   */
  @ResourceDecorator({
    uri: 'passportiq://rulebook',
    name: 'Verification rulebook',
    title: 'PassportIQ — verification rulebook and document checklists',
    description:
      'Every rule the system applies, each with its rule id, severity, statutory citation and ' +
      'the pipeline stage whose output it reads — plus the required-document checklist for each ' +
      'application type. Load this to see WHAT is checked and under WHAT authority, without ' +
      'running anything.',
    mimeType: 'application/json',
    annotations: { audience: ['user', 'assistant'] },
    metadata: { cacheable: true, cacheMaxAge: 3600 },
  })
  async rulebook(): Promise<Record<string, unknown>> {
    const rules = this.rules.listRules();

    return {
      version: '1.0.0',
      ruleCount: rules.length,
      rules,
      // Per application type, since the required set differs: a renewal needs the
      // old passport, a lost-replacement needs the FIR, a minor needs consent.
      documentChecklists: Object.fromEntries(
        (['fresh', 'renewal', 'lost_replacement', 'minor'] as const).map((applicationType) => [
          applicationType,
          this.documents.getRequiredDocuments(applicationType),
        ])
      ),
      severityMeaning: {
        high: 'Blocks approval on its own. Requires an explicit officer justification to clear.',
        medium: 'Requires clarification from the applicant before a decision.',
        low: 'Noted for the officer; does not block.',
      },
      note:
        'Citations are the governing instruments for Indian passport issuance (Passports Act ' +
        '1967, Passport Rules 1980 and the Passport Manual). This rulebook is a hackathon ' +
        'demonstration model — it is faithful in structure and intent but is not a substitute ' +
        'for the authoritative text.',
    };
  }

  /**
   * The decision log.
   *
   * Every officer decision, in order, with the officer identity and the risk score
   * the file carried at the time. This is the accountability record: it answers
   * "who cleared this, when, and knowing what?" — which is the question that
   * matters after a fraudulent passport surfaces.
   */
  @ResourceDecorator({
    uri: 'passportiq://audit-trail',
    name: 'Officer decision audit trail',
    title: 'PassportIQ — audit trail',
    description:
      'Chronological log of every officer decision: who decided, what they decided, when, the ' +
      'note they recorded, and the risk score the application carried at that moment. The ' +
      'accountability record for the human-in-the-loop gate.',
    mimeType: 'application/json',
    annotations: { audience: ['user', 'assistant'] },
  })
  async auditTrail(): Promise<Record<string, unknown>> {
    const trail = this.audit.getTrail();

    return {
      ...trail,
      generatedAt: new Date().toISOString(),
      note:
        'Every entry here was written by a human officer through officer_decide, which is ' +
        'guarded by PipelineCompleteGuard. The agent cannot write to this log — it has no path ' +
        'to officer_decide.',
    };
  }

  /**
   * The agent's reasoning traces.
   *
   * Exposed as a resource, not just a tool, because auditing autonomy is a
   * browsing activity: a reviewer wants to scan across runs looking for patterns
   * in how the machine reasons, not fetch one trace at a time by id.
   */
  @ResourceDecorator({
    uri: 'passportiq://agent/runs',
    name: 'Agent reasoning traces',
    title: 'PassportIQ — agent reasoning traces',
    description:
      'Every autonomous agent run with its full step-by-step trace: each thought, the action ' +
      'chosen, the arguments derived at runtime, what was observed back, confidence at that ' +
      'point, and whether the turn was planned by an LLM or the deterministic policy. Failed ' +
      'steps and overridden LLM proposals are included — this is an audit record, not a ' +
      'highlight reel.',
    mimeType: 'application/json',
    annotations: { audience: ['user', 'assistant'] },
  })
  async agentRuns(): Promise<Record<string, unknown>> {
    const runs = this.agentMemory.getAllRuns();

    return {
      ...this.agentMemory.getStats(),
      runs: runs.map((run) => ({
        runId: run.runId,
        applicationId: run.applicationId,
        goal: run.goal,
        planner: run.planner,
        model: run.model,
        stopReason: run.stopReason,
        riskScore: run.riskScore,
        recommendation: run.handoff?.recommendation ?? null,
        requiresSeniorReview: run.handoff?.requiresSeniorReview ?? null,
        stepCount: run.steps.length,
        // The action sequence alone is the clearest evidence that trajectories
        // diverge: compare a clean file's list against a ring subject's.
        actionSequence: run.steps.map((s) => s.action),
        steps: run.steps,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
        totalDurationMs: run.totalDurationMs,
      })),
      generatedAt: new Date().toISOString(),
    };
  }
}
