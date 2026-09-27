/**
 * AgentPlannerService — decides the next action, one turn at a time.
 *
 * ---------------------------------------------------------------------------
 * THE CONTRACT THIS SERVICE HONOURS
 * ---------------------------------------------------------------------------
 * `plan()` is called once per turn and returns exactly one action. It is never
 * given the whole sequence to produce, and it cannot see the future — only the
 * observation built from what the agent has already learned. That restriction is
 * what makes the trajectory emergent rather than scripted.
 *
 * ---------------------------------------------------------------------------
 * LLM PROPOSES, POLICY DISPOSES
 * ---------------------------------------------------------------------------
 * When a model is configured it gets first refusal on the decision. But its
 * output is treated as a PROPOSAL and passed through `validateProposal()` before
 * anything executes. If it names a tool that does not exist, skips a
 * prerequisite, repeats completed work, or omits a required argument, the
 * proposal is discarded and the deterministic planner decides instead — and the
 * REASON is recorded on the step, so the trace shows the override rather than
 * hiding it.
 *
 * This is not defensive boilerplate. An LLM that can be talked into an arbitrary
 * action is a security problem when the actions touch identity documents. The
 * enumerated allow-list plus this validation gate is the containment boundary,
 * and it holds whether the model is cooperative, confused, or adversarially
 * prompted through document text.
 *
 * The one thing no proposal can ever unlock: `officer_decide`. It is not in the
 * action enum, so there is no string the model can emit that reaches it.
 */
import { Injectable } from '@nitrostack/core';
import type { AgentGoal } from '../../../contracts/index.js';
import { LlmService } from '../../verification/services/llm.service.js';
import {
  AGENT_MAX_STEPS,
  nextAction,
  validateProposal,
  type AgentObservation,
  type PolicyDecision,
} from '../agent-policy.js';

/** A planned turn, plus how it was arrived at. */
export interface PlannedTurn extends PolicyDecision {
  plannedBy: 'llm' | 'policy';
  /** Set when an LLM proposal was rejected — recorded into the trace. */
  overrideReason?: string;
}

interface LlmProposal {
  thought?: unknown;
  action?: unknown;
  actionInput?: unknown;
  confidence?: unknown;
}

const PLANNER_SYSTEM_PROMPT = `You are the planning core of PassportIQ, an AI copilot that assists Indian passport verification officers. You investigate one application at a time by choosing ONE tool call per turn.

You may choose ONLY from these actions:
  document_validate            - check the required-document checklist and expiry
  ocr_extract                  - read fields off ONE document (needs documentId)
  check_identity_consistency   - compare name/DOB across the read documents
  check_address_consistency    - compare address across the read documents
  detect_duplicate_signals     - search the whole queue for reused identifiers
  build_risk_graph             - map the connected cluster around this applicant
  visual_similarity_flag       - advisory photograph comparison (needs compareToApplicationId)
  evaluate_rules               - apply the cited government rulebook
  score_risk                   - compute the weighted 0-100 risk score
  explain_risk                 - produce the officer-readable explanation
  handoff_to_officer           - TERMINAL: stop and hand the case to a human

Hard rules:
- You CANNOT approve, reject or decide an application. That authority is a human officer's and no action you can name reaches it.
- Do not repeat a completed action unless it is ocr_extract or visual_similarity_flag on a NEW target.
- Respect prerequisites: read documents before comparing them; detect duplicates before building the graph; evaluate rules before scoring; score before explaining.
- Choose visual_similarity_flag ONLY when the findings name a specific counterpart that shares a document image.
- If your confidence is low, gather more evidence instead of concluding.
- Prefer handoff_to_officer once you have enough to be useful. Being fast matters less than being reviewable.

Reply with STRICT JSON only:
{"thought":"first-person reasoning for THIS turn","action":"<one action above>","actionInput":{...},"confidence":0.0}`;

@Injectable({ deps: [LlmService] })
export class AgentPlannerService {
  constructor(private readonly llm: LlmService) {}

  /** 'llm' when a model will be consulted this run, else 'policy'. */
  plannerKind(): 'llm' | 'policy' {
    return this.llm.isEnabled() ? 'llm' : 'policy';
  }

  modelId(): string | null {
    return this.llm.getModel();
  }

  /**
   * Choose this turn's action.
   *
   * Always returns something executable: on any LLM failure path — disabled, no
   * response, unparseable JSON, or a rejected proposal — it falls through to the
   * deterministic planner. The loop therefore cannot stall on planner trouble,
   * which matters because a stalled agent in a demo is indistinguishable from a
   * broken product.
   */
  async plan(
    obs: AgentObservation,
    goal: AgentGoal,
    stepsTaken: number
  ): Promise<PlannedTurn> {
    const fallback = (overrideReason?: string): PlannedTurn => {
      const decision = nextAction(obs, goal, stepsTaken);
      return overrideReason
        ? { ...decision, plannedBy: 'policy', overrideReason }
        : { ...decision, plannedBy: 'policy' };
    };

    if (!this.llm.isEnabled()) return fallback();

    const proposal = await this.llm.completeJson<LlmProposal>({
      system: PLANNER_SYSTEM_PROMPT,
      prompt: this.buildTurnPrompt(obs, goal, stepsTaken),
      json: true,
      temperature: 0.2,
      maxOutputTokens: 600,
    });

    if (!proposal || typeof proposal.action !== 'string') {
      return fallback();
    }

    const actionInput = this.coerceInput(proposal.actionInput, obs.applicationId);
    const verdict = validateProposal(proposal.action, actionInput, obs);

    if (!verdict.ok) {
      // The model's suggestion was unusable. Record why, then decide properly.
      return fallback(`LLM proposed '${proposal.action}' — rejected: ${verdict.reason}`);
    }

    const thought =
      typeof proposal.thought === 'string' && proposal.thought.trim().length > 0
        ? proposal.thought.trim()
        : `Chose ${proposal.action} based on the findings so far.`;

    const confidence =
      typeof proposal.confidence === 'number' && Number.isFinite(proposal.confidence)
        ? Math.max(0, Math.min(1, proposal.confidence))
        : 0.6;

    return {
      action: proposal.action as PlannedTurn['action'],
      actionInput,
      thought,
      confidence,
      plannedBy: 'llm',
    };
  }

  /**
   * Force applicationId onto whatever the model returned.
   *
   * The agent is investigating ONE application. Letting a model choose the
   * applicationId argument would let a prompt-injected document redirect the
   * investigation onto a different citizen's file, so the id is overwritten from
   * the observation rather than trusted from the proposal.
   */
  private coerceInput(raw: unknown, applicationId: string): Record<string, unknown> {
    const base =
      raw && typeof raw === 'object' && !Array.isArray(raw)
        ? { ...(raw as Record<string, unknown>) }
        : {};
    base['applicationId'] = applicationId;
    return base;
  }

  /**
   * The turn prompt.
   *
   * Deliberately a compact FACT SHEET rather than a dump of raw tool output. Two
   * reasons: raw JSON burns the context window on field names the planner does
   * not need, and — more importantly — document text reaches this prompt only as
   * already-parsed booleans and counts, which shrinks the surface for prompt
   * injection carried inside a scanned document.
   */
  private buildTurnPrompt(obs: AgentObservation, goal: AgentGoal, stepsTaken: number): string {
    const lines: string[] = [
      `GOAL: ${goal}`,
      `TURN: ${stepsTaken + 1} of at most ${AGENT_MAX_STEPS}`,
      '',
      `APPLICATION: ${obs.applicationId} — ${obs.applicantName} (${obs.applicationType})`,
      `STAGES DONE: ${obs.completedStages.length > 0 ? obs.completedStages.join(', ') : 'none yet'}`,
      `DOCUMENTS READ: ${obs.ocrDone.length} | UNREAD: ${
        obs.ocrPending.length > 0 ? obs.ocrPending.join(', ') : 'none'
      }`,
    ];

    if (obs.documentsComplete !== null) {
      lines.push(
        `CHECKLIST: ${obs.documentsComplete ? 'complete' : `INCOMPLETE — missing ${obs.missingDocuments.join(', ')}`}`
      );
    }
    if (obs.identityConsistent !== null) {
      lines.push(`IDENTITY FIELDS: ${obs.identityConsistent ? 'consistent' : 'MISMATCH FOUND'}`);
    }
    if (obs.addressConsistent !== null) {
      lines.push(`ADDRESS FIELDS: ${obs.addressConsistent ? 'consistent' : 'MISMATCH FOUND'}`);
    }
    if (obs.completedStages.includes('detect_duplicate_signals')) {
      lines.push(
        `IDENTIFIER REUSE: ${obs.duplicateSignalCount} signal(s), ${obs.highSeveritySignalCount} high severity, ` +
          `linked to [${obs.linkedApplicationIds.join(', ') || 'nobody'}]`
      );
      lines.push(
        `PHOTO-REUSE COUNTERPARTS: [${obs.photoMatchCandidates.join(', ') || 'none'}]` +
          (obs.visualComparisonsDone.length > 0
            ? ` (already compared: ${obs.visualComparisonsDone.join(', ')})`
            : '')
      );
    }
    if (obs.completedStages.includes('build_risk_graph')) {
      lines.push(
        `CLUSTER: ${obs.clusterSize} application(s)` +
          (obs.isCoordinatedPattern ? ' — pattern looks COORDINATED' : ' — no coordination pattern')
      );
    }
    if (obs.completedStages.includes('evaluate_rules')) {
      lines.push(
        `RULES: ${obs.violationCount} violation(s), ${obs.highSeverityViolations} high severity`
      );
    }
    if (obs.riskScore !== null) {
      lines.push(
        `SCORE: ${obs.riskScore}/100 (${obs.riskBand}) at confidence ${obs.scoreConfidence?.toFixed(2) ?? '?'}`
      );
    }
    if (obs.failedActions.length > 0) {
      lines.push(`FAILED THIS RUN (do not retry blindly): ${obs.failedActions.join(', ')}`);
    }

    lines.push('', 'What is the single most valuable next action? Reply with JSON only.');
    return lines.join('\n');
  }
}
