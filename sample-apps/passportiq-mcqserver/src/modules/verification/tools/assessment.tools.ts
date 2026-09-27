/**
 * Stages 8-10 — the assessment stages that turn findings into a judgement.
 *
 *   evaluate_rules  the cited government rulebook
 *   score_risk      the weighted 0-100 score
 *   explain_risk    the officer-facing case note + recommended action
 *
 * All three read EARLIER stage results out of PipelineStateService rather than
 * re-deriving anything. That read is the cross-role integration contract: the
 * duplicate signals and risk graph produced by the pipeline module are consumed
 * here, never recomputed, so the officer cannot be shown a score that disagrees
 * with the graph on their screen.
 *
 * ---------------------------------------------------------------------------
 * WHY NONE OF THESE CARRY @Cache
 * ---------------------------------------------------------------------------
 * A cache HIT on a NitroStack tool skips the handler entirely — which means
 * `ctx.emit('pipeline.stage_completed')` never fires, PipelineStateService never
 * records the stage, and PipelineCompleteGuard blocks the officer's decision
 * forever with no visible cause. `score_risk` memoises inside RiskService instead,
 * so the event emission stays unconditional. This is the single most expensive
 * mistake available in this file.
 */
import { Injectable, ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import {
  EvaluateRulesResultSchema,
  ExplainRiskResultSchema,
  ScoreRiskResultSchema,
  type EvaluateRulesResult,
  type ExplainRiskResult,
  type ScoreRiskResult,
} from '../../../contracts/index.js';
import { PipelineEventsService } from '../../pipeline/services/pipeline-events.service.js';
import { ExplanationService } from '../services/explanation.service.js';
import { RiskService } from '../services/risk.service.js';
import { RuleService } from '../services/rule.service.js';
import { parse } from './document.tools.js';

const ApplicationInputSchema = z.object({
  applicationId: z.string().min(1).describe('Passport application ID'),
});

/**
 * @Injectable({ deps: [...] }) — MANDATORY under ESM. See document.tools.ts;
 * order must match the constructor.
 */
@Injectable({ deps: [RuleService, RiskService, ExplanationService, PipelineEventsService] })
export class AssessmentTools {
  constructor(
    private readonly rules: RuleService,
    private readonly risk: RiskService,
    private readonly explanation: ExplanationService,
    private readonly events: PipelineEventsService
  ) {}

  @Tool({
    name: 'evaluate_rules',
    title: 'Evaluate the policy rulebook',
    description:
      'Apply the cited passport rulebook to everything the earlier stages established. Returns ' +
      'the rules that FIRED (each with a statutory citation, severity, source stage and ' +
      'evidence), the rules that were evaluated and passed, and — critically — the rules that ' +
      'were SKIPPED because an upstream stage had not reported. A skipped rule is unchecked, ' +
      'not passed: collapsing those two into one boolean is how an unverified application comes ' +
      'to look like a cleared one. Fully deterministic.',
    inputSchema: ApplicationInputSchema,
    outputSchema: EvaluateRulesResultSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
    invocation: {
      invoking: 'Applying the policy rulebook...',
      invoked: 'Rulebook evaluated',
    },
    examples: {
      request: { applicationId: 'PIQ-2026-2001' },
      response: {
        applicationId: 'PIQ-2026-2001',
        passed: false,
        violations: [
          {
            ruleId: 'DUP-010',
            rule: 'Identifiers reused across applications',
            severity: 'high',
            citation: 'Passport Act 1967, s.12(1)(b) — furnishing false information',
            sourceStage: 'detect_duplicate_signals',
            detail: 'High-severity reused identifiers link this application to 3 others.',
            evidence: ['reused phone number with PIQ-2026-2002'],
          },
        ],
        worstSeverity: 'high',
        skippedRuleIds: [],
      },
    },
  })
  async evaluateRules(rawInput: unknown, ctx: ExecutionContext): Promise<EvaluateRulesResult> {
    const input = parse(ApplicationInputSchema, rawInput, 'evaluate_rules');
    const result = this.rules.evaluate(input.applicationId);

    this.events.stageCompleted(ctx, input.applicationId, 'evaluate_rules', result);
    return result;
  }

  @Tool({
    name: 'score_risk',
    title: 'Score applicant risk',
    description:
      'Combine every stage result into a weighted 0-100 risk score with a band, a per-category ' +
      'breakdown, and a named factor for every point in the total — so the number is reviewable ' +
      'rather than asserted. Also returns `confidence`, which reports how much of the pipeline ' +
      'actually reported in: a low score at low confidence is an UNASSESSED application, not a ' +
      'safe one, and the officer UI must render that caveat. Deterministic arithmetic; no model ' +
      'is involved, because a government risk score that changes between two identical runs ' +
      'cannot be defended in an appeal.',
    inputSchema: ApplicationInputSchema,
    outputSchema: ScoreRiskResultSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
    invocation: {
      invoking: 'Scoring risk...',
      invoked: 'Risk score computed',
    },
    examples: {
      request: { applicationId: 'PIQ-2026-2001' },
      response: {
        applicationId: 'PIQ-2026-2001',
        score: 76,
        band: 'high',
        confidence: 0.98,
        categoryTotals: { duplicates: 30, graph: 26, photo: 14 },
        factors: [
          {
            factorId: 'graph:coordinated_pattern',
            category: 'graph',
            severity: 'high',
            points: 12,
            weight: 12,
            reason: 'Cluster shares 5 distinct identifier types at density 1',
            sourceStage: 'build_risk_graph',
          },
        ],
      },
    },
  })
  async scoreRisk(rawInput: unknown, ctx: ExecutionContext): Promise<ScoreRiskResult> {
    const input = parse(ApplicationInputSchema, rawInput, 'score_risk');
    const result = this.risk.score(input.applicationId);

    this.events.stageCompleted(ctx, input.applicationId, 'score_risk', result);
    return result;
  }

  @Tool({
    name: 'explain_risk',
    title: 'Explain the risk assessment',
    description:
      'Turn the score and its findings into an officer-readable case note, an ordered evidence ' +
      'list, a recommended action and — if clarification is the recommendation — the specific ' +
      'questions to put to the applicant. The recommendation is computed deterministically; a ' +
      'language model, when configured, only phrases it. `narrationMode` states which happened. ' +
      'The recommendation is never a decision: officer_decide is a separate guarded human tool ' +
      'and nothing in this stage can reach it.',
    inputSchema: ApplicationInputSchema,
    outputSchema: ExplainRiskResultSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
      openWorldHint: true,
    },
    invocation: {
      invoking: 'Writing the case note...',
      invoked: 'Case note ready',
    },
    examples: {
      request: { applicationId: 'PIQ-2026-2001' },
      response: {
        applicationId: 'PIQ-2026-2001',
        score: 76,
        band: 'high',
        applicantName: 'Vikram Nair',
        recommendedAction: 'escalate',
        recommendationRationale:
          'Findings implicate other applications — a cross-application pattern belongs with the ' +
          'fraud investigation unit before any single case is refused.',
        narrationMode: 'deterministic',
      },
    },
  })
  @Widget('risk-explanation')
  async explainRisk(rawInput: unknown, ctx: ExecutionContext): Promise<ExplainRiskResult> {
    const input = parse(ApplicationInputSchema, rawInput, 'explain_risk');
    const result = await this.explanation.explain(input.applicationId);

    this.events.stageCompleted(ctx, input.applicationId, 'explain_risk', result);
    return result;
  }
}
