/**
 * AgentMemoryService — the agent's episodic memory and the audit record of its
 * autonomy.
 *
 * Two jobs that sound similar and are not:
 *
 *   1. WITHIN a run, the loop needs to know what it already tried, so it does not
 *      re-read the same document forever. That is served by the live step list.
 *
 *   2. AFTER a run, an officer needs to inspect the machine's reasoning. An
 *      autonomous system that acts on a citizen's passport application and keeps
 *      no reviewable record of WHY is not acceptable regardless of accuracy, so
 *      every step — including the failed ones and the ones where an LLM proposal
 *      was overridden — is retained verbatim.
 *
 * In-memory by design: PassportIQ seeds from a fixture file and holds all state
 * in process (see ApplicationService). A database would add deployment surface
 * without changing the demonstrated behaviour. `MAX_RETAINED_RUNS` bounds growth
 * so a long-lived NitroCloud instance cannot leak.
 */
import { Injectable } from '@nitrostack/core';
import type { AgentRun, AgentStep } from '../../../contracts/index.js';

/** Oldest runs are evicted past this. Generous enough to survive a full demo. */
export const MAX_RETAINED_RUNS = 200;

@Injectable()
export class AgentMemoryService {
  /** Completed runs, newest last. */
  private readonly runs: AgentRun[] = [];

  /** Runs still in progress, keyed by runId, so the UI can stream a live trace. */
  private readonly active = new Map<
    string,
    { applicationId: string; goal: string; startedAt: string; steps: AgentStep[] }
  >();

  private sequence = 0;

  /**
   * Mint a run id.
   *
   * Monotonic counter plus timestamp rather than a random uuid: run ids are read
   * aloud during a demo and compared by eye in the trace panel, and `AGT-7` is
   * legible where a uuid is not. The timestamp keeps them unique across restarts.
   */
  nextRunId(): string {
    this.sequence += 1;
    return `AGT-${Date.now().toString(36)}-${this.sequence}`;
  }

  beginRun(runId: string, applicationId: string, goal: string): void {
    this.active.set(runId, {
      applicationId,
      goal,
      startedAt: new Date().toISOString(),
      steps: [],
    });
  }

  /** Append a step to a live run. Safe to call for an unknown id (no-op). */
  appendStep(runId: string, step: AgentStep): void {
    this.active.get(runId)?.steps.push(step);
  }

  /** The steps taken so far on a live run — what the planner observes against. */
  getLiveSteps(runId: string): AgentStep[] {
    return this.active.get(runId)?.steps ?? [];
  }

  finishRun(run: AgentRun): AgentRun {
    this.active.delete(run.runId);
    this.runs.push(run);

    while (this.runs.length > MAX_RETAINED_RUNS) this.runs.shift();

    return run;
  }

  getRun(runId: string): AgentRun | undefined {
    return this.runs.find((r) => r.runId === runId);
  }

  /** Every completed run for one application, oldest first. */
  getRunsFor(applicationId: string): AgentRun[] {
    return this.runs.filter((r) => r.applicationId === applicationId);
  }

  /**
   * The most recent completed run for an application.
   *
   * This is what the Agent Console renders by default, and what
   * agent_recommend_decision reads rather than re-investigating: an officer
   * clicking "why?" should see the reasoning that actually produced the
   * recommendation in front of them, not a fresh run that might differ.
   */
  getLatestRunFor(applicationId: string): AgentRun | undefined {
    for (let i = this.runs.length - 1; i >= 0; i -= 1) {
      const run = this.runs[i];
      if (run && run.applicationId === applicationId) return run;
    }
    return undefined;
  }

  getAllRuns(): AgentRun[] {
    return [...this.runs];
  }

  activeRunCount(): number {
    return this.active.size;
  }

  /** Aggregate view for the health check and the dashboard header. */
  getStats(): {
    totalRuns: number;
    activeRuns: number;
    totalSteps: number;
    escalated: number;
    handedOff: number;
    llmPlanned: number;
  } {
    return {
      totalRuns: this.runs.length,
      activeRuns: this.active.size,
      totalSteps: this.runs.reduce((sum, r) => sum + r.steps.length, 0),
      escalated: this.runs.filter((r) => r.handoff?.requiresSeniorReview === true).length,
      handedOff: this.runs.filter((r) => r.handoff !== null).length,
      llmPlanned: this.runs.filter((r) => r.planner === 'llm').length,
    };
  }

  clear(): void {
    this.runs.length = 0;
    this.active.clear();
  }
}
