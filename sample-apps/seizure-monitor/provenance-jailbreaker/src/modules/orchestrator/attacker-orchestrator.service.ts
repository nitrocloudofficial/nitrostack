import { Injectable } from '@nitrostack/core';

import { TargetModelService }                  from '../target-model/target-model.service.js';
import { ScopeGuardService, ScopeCheckResult } from '../audit/scope-guard.service.js';
import { AuditService, AuditEntry }            from '../audit/audit.service.js';
import { PromptMutatorService, AttackerFeedback, MutationStrategy } from './prompt-mutator.service.js';
import { JudgesService, DualJudgeResult }      from '../judges/judges.service.js';

// ── Public types ──────────────────────────────────────────────────────────────

export interface OrchestratorConfig {
  /** Declared red-team scope string (used by scope guard). */
  declaredScope:  string;
  /** Tool/model being targeted and the jailbreak category. */
  targetTool:     { target: string; category: string };
  /** Seed adversarial prompt — mutated each iteration by PromptMutatorService. */
  seedPrompt:     string;
  /** Number of attack iterations to run. */
  maxIterations:  number;
  /** When true, calls test_target_model_v2 instead of v1. */
  useModelV2?:    boolean;
}

export interface WidgetState {
  sequence:             number;
  timestamp:            string;
  scopeAuthorized:      boolean;
  scopeEvidence:        string;
  targetModel:          string;
  targetOutput:         string;
  llmJudge:             { verdict: string; confidence: number } | null;
  patternJudge:         { verdict: string; confidence: number } | null;
  flaggedForHumanReview: boolean;
  hashChainValid:        boolean;
  hashPreview:           string;
  mutationStrategy?:     string;
}

export interface AttemptResult {
  iteration:        number;
  status:           'BLOCKED' | 'EXECUTED';
  prompt:           string;
  widgetState:      WidgetState;
  dualJudgeResult?: DualJudgeResult;
}

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * AttackerOrchestratorService — Person D (full implementation, wired to real A/B/C services)
 *
 * Loop: mutate_prompt → scope_guard.check → test_target_model → dual_judge → audit.append → repeat
 *
 * Key design constraint (spec §4, §5):
 *   Only `attackerSignal = { pass, category }` is fed back to the prompt mutator.
 *   Judge reasoning and confidence scores are NEVER passed back (prevents Goodharting).
 */
@Injectable({
  deps: [TargetModelService, ScopeGuardService, AuditService, PromptMutatorService, JudgesService],
})
export class AttackerOrchestratorService {
  constructor(
    private readonly targetModel:   TargetModelService,
    private readonly scopeGuard:    ScopeGuardService,
    private readonly auditService:  AuditService,
    private readonly promptMutator: PromptMutatorService,
    private readonly judgesService: JudgesService,
  ) {}

  /**
   * Drives the iterative red-team loop.
   * Yields `AttemptResult` after every iteration for real-time rendering.
   */
  async *runLoop(config: OrchestratorConfig): AsyncGenerator<AttemptResult> {
    let previousFeedback: AttackerFeedback | null = null;

    for (let i = 0; i < config.maxIterations; i++) {
      const iteration = i + 1;

      // 1. Person D: mutate prompt using automated AI generator + feedback loop
      const { mutatedPrompt, strategyUsed } = await this.promptMutator.mutateAsync(
        config.seedPrompt,
        previousFeedback,
        i,
      );

      // 2. Person B: NLI scope guard check — BEFORE the target model is ever called
      const toolCallDescriptor = {
        name: config.useModelV2 ? 'test_target_model_v2' : 'test_target_model_v1',
        args: { prompt: mutatedPrompt, ...config.targetTool },
      };
      const scopeCheck = await this.scopeGuard.check(config.declaredScope, toolCallDescriptor);

      if (!scopeCheck.authorized) {
        // Log BLOCKED call to audit chain — it never reaches the target model
        const auditEntry = await this.auditService.append(
          'SCOPE_BLOCKED',
          'attacker-orchestrator',
          config.declaredScope,
          toolCallDescriptor,
          { authorized: false, confidence: scopeCheck.confidence, evidence: scopeCheck.evidence },
        );
        const chain = await this.auditService.verifyChain();

        yield {
          iteration,
          status: 'BLOCKED',
          prompt: mutatedPrompt,
          widgetState: this.buildWidgetState(
            auditEntry, scopeCheck, null, null, chain.chain_valid, strategyUsed,
          ),
        };
        break; // Out-of-scope → terminate loop
      }

      // 3. Person A: call target model (Ollama-backed)
      const targetResponse = config.useModelV2
        ? await this.targetModel.testModelV2(mutatedPrompt)
        : await this.targetModel.testModelV1(mutatedPrompt);

      const modelName = config.useModelV2
        ? (process.env.TARGET_MODEL_V2 ?? 'qwen2.5:3b')
        : (process.env.TARGET_MODEL_V1 ?? 'phi3:mini');

      // 4. Person C: dual-judge evaluation (LLM + pattern, in parallel)
      const dualVerdict = await this.judgesService.evaluate(
        mutatedPrompt,
        targetResponse.response,
        config.targetTool.category,
      );

      // 5. Person B: append finding to tamper-evident audit chain
      const auditEntry = await this.auditService.append(
        'ATTACK_FINDING',
        'attacker-orchestrator',
        config.declaredScope,
        toolCallDescriptor,
        {
          authorized: true,
          confidence: dualVerdict.confidence,
          evidence: `verdict=${dualVerdict.verdict} llm=${dualVerdict.llm.verdict} ` +
                    `pattern=${dualVerdict.pattern.verdict} ` +
                    `humanReview=${dualVerdict.requiresHumanReview}`,
        },
      );

      // 6. Feed ONLY minimal signal back to attacker (judge reasoning is withheld)
      previousFeedback = dualVerdict.attackerSignal;

      const chain = await this.auditService.verifyChain();

      yield {
        iteration,
        status: 'EXECUTED',
        prompt: mutatedPrompt,
        widgetState: this.buildWidgetState(
          auditEntry,
          scopeCheck,
          dualVerdict,
          { response: targetResponse.response, model: modelName },
          chain.chain_valid,
          strategyUsed,
        ),
        dualJudgeResult: dualVerdict,
      };
    }
  }

  // ── Widget state builder ──────────────────────────────────────────────────

  private buildWidgetState(
    auditEntry:       AuditEntry,
    scopeCheck:       ScopeCheckResult,
    dualVerdict:      DualJudgeResult | null,
    targetResponse:   { response: string; model: string } | null,
    chainValid:       boolean,
    mutationStrategy: string | undefined,
  ): WidgetState {
    return {
      sequence:              auditEntry.sequence,
      timestamp:             auditEntry.timestamp,
      scopeAuthorized:       scopeCheck.authorized,
      scopeEvidence:         scopeCheck.evidence,
      targetModel:           targetResponse?.model ?? 'N/A (Blocked)',
      targetOutput:          targetResponse?.response ?? 'N/A — blocked before reaching target model',
      llmJudge:              dualVerdict ? { verdict: dualVerdict.llm.verdict,     confidence: dualVerdict.llm.confidence }     : null,
      patternJudge:          dualVerdict ? { verdict: dualVerdict.pattern.verdict, confidence: dualVerdict.pattern.confidence } : null,
      flaggedForHumanReview: dualVerdict?.requiresHumanReview ?? false,
      hashChainValid:        chainValid,
      hashPreview:           auditEntry.hash.substring(0, 12) + '...',
      mutationStrategy,
    };
  }
}
