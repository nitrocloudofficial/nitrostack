/**
 * Automation contract — the autopilot's public surface.
 *
 * The autopilot is the difference between "an agent you can call" and "an agent
 * that is already working". It sweeps the pending queue on its own schedule,
 * investigates what it finds, and publishes everything it does on the same event
 * bus the pipeline uses, so the officer console renders machine activity nobody
 * clicked a button to start.
 *
 * WHY THE EVENT NAMES LIVE HERE
 * -----------------------------
 * Three independent consumers subscribe to these strings: the console SSE hub,
 * the audit surface, and the acceptance tests. A literal typed in the emitter and
 * re-typed in each subscriber is a silent-failure generator — the subscriber that
 * misspells it never fires and reports no error. One exported constant per event
 * turns that typo into a compile error.
 */
import { z } from 'zod';

export const AUTOPILOT_SWEEP_STARTED_EVENT = 'autopilot.sweep_started' as const;
export const AUTOPILOT_APPLICATION_PICKED_EVENT = 'autopilot.application_picked' as const;
export const AUTOPILOT_SWEEP_FINISHED_EVENT = 'autopilot.sweep_finished' as const;
export const AUTOPILOT_STATE_CHANGED_EVENT = 'autopilot.state_changed' as const;

/** Every event the console streams, in one place, so the UI can label them all. */
export const CONSOLE_STREAM_EVENTS = [
  'pipeline.stage_completed',
  'application.decided',
  'agent.run_started',
  'agent.step',
  'agent.run_finished',
  AUTOPILOT_SWEEP_STARTED_EVENT,
  AUTOPILOT_APPLICATION_PICKED_EVENT,
  AUTOPILOT_SWEEP_FINISHED_EVENT,
  AUTOPILOT_STATE_CHANGED_EVENT,
] as const;
export type ConsoleStreamEvent = (typeof CONSOLE_STREAM_EVENTS)[number];

export const AutopilotModeSchema = z.enum(['idle', 'sweeping', 'stopped']);
export type AutopilotMode = z.infer<typeof AutopilotModeSchema>;

export const AutopilotStatusSchema = z.object({
  /** Whether the scheduler is armed at all — env can disable it entirely. */
  enabled: z.boolean(),
  mode: AutopilotModeSchema,
  intervalSeconds: z.number().int().positive(),
  sweepsCompleted: z.number().int().min(0),
  applicationsInvestigated: z.number().int().min(0),
  escalations: z.number().int().min(0),
  ringsDetected: z.number().int().min(0),
  lastSweepStartedAt: z.string().nullable(),
  lastSweepFinishedAt: z.string().nullable(),
  lastSweepDurationMs: z.number().min(0).nullable(),
  nextSweepEta: z.string().nullable(),
  currentApplicationId: z.string().nullable(),
  /**
   * Why the autopilot is in this mode, in one officer-readable sentence. A panel
   * that shows `mode: idle` with no reason invites the question this answers.
   */
  detail: z.string(),
});
export type AutopilotStatus = z.infer<typeof AutopilotStatusSchema>;

export const AutopilotSweepSummarySchema = z.object({
  sweepId: z.string(),
  startedAt: z.string(),
  finishedAt: z.string(),
  durationMs: z.number().min(0),
  applicationsInvestigated: z.number().int().min(0),
  escalated: z.array(z.string()),
  ringsDetected: z.number().int().min(0),
  topPriority: z
    .object({
      applicationId: z.string(),
      applicantName: z.string(),
      riskScore: z.number().nullable(),
      recommendation: z.string(),
      headline: z.string(),
    })
    .nullable(),
});
export type AutopilotSweepSummary = z.infer<typeof AutopilotSweepSummarySchema>;
