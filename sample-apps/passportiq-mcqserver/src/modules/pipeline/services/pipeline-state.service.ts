/**
 * PipelineStateService — which stages have completed, per application.
 *
 * This is the state PipelineCompleteGuard reads to enforce "no auto-decisions":
 * officer_decide cannot run until every required stage has reported completion
 * for that specific applicationId.
 *
 * Populated from two directions on purpose:
 *
 *   1. `recordStage()` — called synchronously by PipelineEventsService whenever a
 *      Backend B tool completes.
 *   2. `@OnEvent(pipeline.stage_completed)` in PipelineNotificationService, which
 *      forwards here — this is how Backend A's tools land, since they emit via
 *      ctx.emit and never touch this class directly.
 *
 * Both paths converge on the same idempotent Set, so a stage arriving twice (once
 * synchronously, once via the bus) is recorded once. Belt-and-braces is
 * deliberate: `emitEvent` is fire-and-forget, so a stage recorded ONLY through
 * the bus is technically racing the next tool call.
 */
import { Injectable } from '@nitrostack/core';
import { REQUIRED_STAGES_BEFORE_DECISION } from '../../../contracts/index.js';

export interface StageRecord {
  stage: string;
  completedAt: string;
}

export interface PipelineProgress {
  applicationId: string;
  completedStages: string[];
  missingStages: string[];
  isComplete: boolean;
  /** 0..100, share of required stages done — drives Frontend A's progress bar. */
  percentComplete: number;
}

@Injectable()
export class PipelineStateService {
  /** applicationId -> stage -> completion timestamp */
  private readonly stages = new Map<string, Map<string, string>>();

  /** Latest result payload per stage, so late-joining widgets can catch up. */
  private readonly results = new Map<string, Map<string, unknown>>();

  /** Idempotent. Recording the same stage twice keeps the FIRST timestamp. */
  recordStage(applicationId: string, stage: string, result?: unknown): void {
    const forApplication = this.stages.get(applicationId) ?? new Map<string, string>();
    if (!forApplication.has(stage)) {
      forApplication.set(stage, new Date().toISOString());
    }
    this.stages.set(applicationId, forApplication);

    if (result !== undefined) {
      const resultsForApplication = this.results.get(applicationId) ?? new Map<string, unknown>();
      resultsForApplication.set(stage, result);
      this.results.set(applicationId, resultsForApplication);
    }
  }

  /** Stages completed for an application, in pipeline order. */
  getCompletedStages(applicationId: string): string[] {
    const forApplication = this.stages.get(applicationId);
    if (!forApplication) return [];
    return [...forApplication.keys()].sort(comparePipelineOrder);
  }

  getStageRecords(applicationId: string): StageRecord[] {
    const forApplication = this.stages.get(applicationId);
    if (!forApplication) return [];
    return [...forApplication.entries()]
      .map(([stage, completedAt]) => ({ stage, completedAt }))
      .sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  }

  /** The payload a stage reported, or undefined if it has not run. */
  getStageResult(applicationId: string, stage: string): unknown {
    return this.results.get(applicationId)?.get(stage);
  }

  hasStage(applicationId: string, stage: string): boolean {
    return this.stages.get(applicationId)?.has(stage) ?? false;
  }

  /** Required stages that have NOT completed yet, in pipeline order. */
  getMissingStages(applicationId: string): string[] {
    const completed = new Set(this.getCompletedStages(applicationId));
    return REQUIRED_STAGES_BEFORE_DECISION.filter((stage) => !completed.has(stage));
  }

  /** True when every required stage has completed — the guard's core question. */
  isPipelineComplete(applicationId: string): boolean {
    return this.getMissingStages(applicationId).length === 0;
  }

  getProgress(applicationId: string): PipelineProgress {
    const completedStages = this.getCompletedStages(applicationId);
    const missingStages = this.getMissingStages(applicationId);
    const total = REQUIRED_STAGES_BEFORE_DECISION.length;
    const done = total - missingStages.length;

    return {
      applicationId,
      completedStages,
      missingStages,
      isComplete: missingStages.length === 0,
      percentComplete: total === 0 ? 100 : Math.round((done / total) * 100),
    };
  }

  /**
   * Best-effort read of the risk score already computed for this application.
   *
   * Reads whatever score_risk put in its event payload rather than calling into
   * Backend A, so the audit trail can snapshot the score the officer actually saw
   * without Backend B depending on Backend A's service surface. Returns null if
   * score_risk has not run or shaped its payload differently.
   */
  getRiskScore(applicationId: string): number | null {
    const result = this.getStageResult(applicationId, 'score_risk');
    if (!result || typeof result !== 'object') return null;

    const score = (result as Record<string, unknown>)['score'];
    if (typeof score !== 'number' || Number.isNaN(score)) return null;

    return Math.min(100, Math.max(0, score));
  }

  /** Applications that have reported at least one stage. */
  getTrackedApplicationIds(): string[] {
    return [...this.stages.keys()];
  }

  /** Clear one application's progress — used when re-running the pipeline. */
  reset(applicationId: string): void {
    this.stages.delete(applicationId);
    this.results.delete(applicationId);
  }

  /** Test-only: wipe all tracked progress. */
  resetAll(): void {
    this.stages.clear();
    this.results.clear();
  }
}

/** Sort stage names by their position in the declared pipeline; unknowns last. */
function comparePipelineOrder(a: string, b: string): number {
  const order = (stage: string) => {
    const index = REQUIRED_STAGES_BEFORE_DECISION.indexOf(
      stage as (typeof REQUIRED_STAGES_BEFORE_DECISION)[number]
    );
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };
  return order(a) - order(b) || a.localeCompare(b);
}
