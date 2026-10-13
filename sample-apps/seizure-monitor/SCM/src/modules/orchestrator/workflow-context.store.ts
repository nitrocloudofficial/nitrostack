import { Injectable } from '@nitrostack/core';
import { randomUUID } from 'crypto';

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkflowStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface StepResult {
  step:      string;
  tool:      string;
  status:    'success' | 'skipped' | 'error' | 'flagged';
  output?:   unknown;
  error?:    string;
  startedAt: string;
  endedAt:   string;
}

export interface WorkflowRun {
  workflowId:  string;
  workflowType: string;
  status:      WorkflowStatus;
  currentStep: string;
  steps:       StepResult[];
  startedAt:   string;
  endedAt?:    string;
  finalOutput?: unknown;
}

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * Tracks in-memory state for all workflow runs in the current process.
 * Intentionally NOT persisted to disk — lightweight, restarts clean.
 * For persistence across restarts, swap the Map for a SQLite table.
 */
@Injectable()
export class WorkflowContextStore {
  private readonly runs = new Map<string, WorkflowRun>();

  /** Create a new run and return its ID. */
  create(workflowType: string): WorkflowRun {
    const run: WorkflowRun = {
      workflowId:   `wf_${randomUUID().slice(0, 8)}`,
      workflowType,
      status:       'pending',
      currentStep:  'init',
      steps:        [],
      startedAt:    new Date().toISOString(),
    };
    this.runs.set(run.workflowId, run);
    return run;
  }

  get(workflowId: string): WorkflowRun | undefined {
    return this.runs.get(workflowId);
  }

  listAll(): WorkflowRun[] {
    return [...this.runs.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  /** Mark the run as in_progress and set the current step. */
  startStep(workflowId: string, stepName: string): void {
    const run = this.requireRun(workflowId);
    run.status      = 'in_progress';
    run.currentStep = stepName;
  }

  /** Record a completed step result. */
  recordStep(workflowId: string, result: StepResult): void {
    this.requireRun(workflowId).steps.push(result);
  }

  /** Finalise the run (completed or failed). */
  finish(workflowId: string, status: 'completed' | 'failed', finalOutput: unknown): void {
    const run       = this.requireRun(workflowId);
    run.status      = status;
    run.currentStep = status;
    run.endedAt     = new Date().toISOString();
    run.finalOutput = finalOutput;
  }

  private requireRun(workflowId: string): WorkflowRun {
    const run = this.runs.get(workflowId);
    if (!run) throw new Error(`WorkflowRun "${workflowId}" not found`);
    return run;
  }
}
