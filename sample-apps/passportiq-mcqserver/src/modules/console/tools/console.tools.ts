/**
 * ConsoleTools — the automation layer, exposed as MCP tools.
 *
 * The autopilot runs on a timer with no human involved. That is the point, but it
 * also means an MCP client has no way to see it, question it, or take the wheel.
 * These four tools close that loop, so the same autonomy is inspectable and
 * controllable from a conversation:
 *
 *   autopilot_status      what is the machine doing right now, and why
 *   autopilot_control     arm / disarm / force a sweep
 *   get_officer_queue     the prioritised work queue, as the officer sees it
 *   get_console_activity  the raw event stream the console renders
 *
 * NOTHING HERE CAN DECIDE
 * ----------------------
 * `autopilot_control` can start investigations. It cannot approve, reject or
 * request clarification — those live only behind `officer_decide` and its guard.
 * An LLM holding these tools can therefore make the system work harder, but not
 * make it commit to an outcome.
 */
// NOTE: core exports `Tool` as the Tool CLASS; the DECORATOR is `ToolDecorator`.
// Every tool file in this project aliases it the same way.
import {
  Injectable,
  ToolDecorator as Tool,
  Cache,
  RateLimit,
  type ExecutionContext,
} from '@nitrostack/core';
import { z } from 'zod';
import { AutopilotStatusSchema, AutopilotSweepSummarySchema } from '../../../contracts/index.js';
import { AutopilotService } from '../services/autopilot.service.js';
import { ConsoleEventHubService } from '../services/console-event-hub.service.js';
import { ConsoleStateService } from '../services/console-state.service.js';

const QueueRowSchema = z.object({
  applicationId: z.string(),
  applicantName: z.string(),
  applicationType: z.string(),
  status: z.string(),
  riskScore: z.number().nullable(),
  riskBand: z.enum(['low', 'medium', 'high', 'unknown']),
  stagesCompleted: z.number(),
  stagesTotal: z.number(),
  pipelineComplete: z.boolean(),
  clusterSize: z.number(),
  signalCount: z.number(),
  decision: z.string().nullable(),
  agentRuns: z.number(),
  headline: z.string(),
});

@Injectable({ deps: [AutopilotService, ConsoleStateService, ConsoleEventHubService] })
export class ConsoleTools {
  constructor(
    private readonly autopilot: AutopilotService,
    private readonly state: ConsoleStateService,
    private readonly hub: ConsoleEventHubService
  ) {}

  @Tool({
    name: 'autopilot_status',
    description:
      'Report what the autonomous autopilot is doing right now: whether it is armed, which ' +
      'application it is currently investigating, how many it has swept, how many it escalated ' +
      'to a human, and when the next sweep runs. Use this to answer "is the system working on ' +
      'anything?" without triggering work. The autopilot investigates on its own schedule and ' +
      'always stops at the officer handoff — it never records a decision.',
    inputSchema: z.object({}),
    outputSchema: z.object({
      status: AutopilotStatusSchema,
      lastSweep: AutopilotSweepSummarySchema.nullable(),
      narrative: z.string(),
    }),
  })
  async autopilotStatus(): Promise<{
    status: ReturnType<AutopilotService['getStatus']>;
    lastSweep: ReturnType<AutopilotService['getLastSweep']>;
    narrative: string;
  }> {
    const status = this.autopilot.getStatus();
    const lastSweep = this.autopilot.getLastSweep();

    return {
      status,
      lastSweep,
      narrative:
        `Autopilot is ${status.enabled ? status.mode : 'disabled'}. ${status.detail} ` +
        `Lifetime: ${status.sweepsCompleted} sweep(s), ${status.applicationsInvestigated} ` +
        `application(s) investigated, ${status.escalations} escalated for human review, ` +
        `${status.ringsDetected} linked cluster(s) tracked.`,
    };
  }

  @Tool({
    name: 'autopilot_control',
    description:
      'Arm, disarm, or immediately trigger the autonomous autopilot. action="sweep" runs one ' +
      'sweep now and waits for it, returning what the agent concluded; action="start" arms the ' +
      'recurring schedule; action="stop" disarms it. The autopilot only investigates — it ' +
      'cannot approve, reject or request clarification, so this tool cannot change any ' +
      "application's outcome.",
    // A sweep is expensive (up to 36 chained tool calls). Rate limiting stops an
    // enthusiastic client from queueing sweeps faster than they complete.
    inputSchema: z.object({
      action: z
        .enum(['start', 'stop', 'sweep'])
        .describe('start = arm the schedule, stop = disarm, sweep = run one sweep now'),
      reason: z.string().max(300).optional().describe('Recorded in the status detail line.'),
    }),
    outputSchema: z.object({
      action: z.string(),
      status: AutopilotStatusSchema,
      sweep: AutopilotSweepSummarySchema.nullable(),
      message: z.string(),
    }),
  })
  // `window` is a duration STRING ('1m'/'1h'), not a number of seconds — core
  // parses it. Passing 60 fails to compile, which is the good outcome; passing
  // '60' would parse to something unintended.
  @RateLimit({ requests: 10, window: '1m' })
  async autopilotControl(
    input: { action: 'start' | 'stop' | 'sweep'; reason?: string },
    _ctx: ExecutionContext
  ): Promise<{
    action: string;
    status: ReturnType<AutopilotService['getStatus']>;
    sweep: ReturnType<AutopilotService['getLastSweep']>;
    message: string;
  }> {
    if (input.action === 'start') {
      const status = this.autopilot.start();
      return {
        action: 'start',
        status,
        sweep: null,
        message: status.enabled
          ? `Autopilot armed — sweeping every ${status.intervalSeconds}s.`
          : 'Autopilot is disabled by configuration (PASSPORTIQ_AUTOPILOT). Nothing was armed.',
      };
    }

    if (input.action === 'stop') {
      const status = this.autopilot.stop(
        input.reason ?? 'Disarmed by an MCP client via autopilot_control.'
      );
      return {
        action: 'stop',
        status,
        sweep: null,
        message: 'Autopilot disarmed. On-demand agent_investigate still works.',
      };
    }

    const sweep = await this.autopilot.sweep();
    const status = this.autopilot.getStatus();

    return {
      action: 'sweep',
      status,
      sweep,
      message:
        sweep === null
          ? 'No sweep ran: either one is already in progress, or every application has already ' +
            'been investigated or decided.'
          : `Sweep ${sweep.sweepId} investigated ${sweep.applicationsInvestigated} application(s) ` +
            `in ${sweep.durationMs}ms and escalated ${sweep.escalated.length} to an officer. ` +
            `No decision was recorded — that remains with the human.`,
    };
  }

  @Tool({
    name: 'get_officer_queue',
    description:
      "The officer's prioritised work queue: every application ordered by how urgently a human " +
      'is needed (undecided first, then highest risk, then largest linked cluster, then least ' +
      'progressed). Each row carries a one-line reason for its position, so this answers "what ' +
      'should I look at next, and why?" in one call. Read-only.',
    inputSchema: z.object({
      limit: z.number().int().positive().max(50).optional(),
      onlyPending: z.boolean().optional().describe('Exclude applications already decided.'),
    }),
    outputSchema: z.object({
      queue: z.array(QueueRowSchema),
      totals: z.record(z.number()),
      rings: z.array(
        z.object({
          applicationIds: z.array(z.string()),
          size: z.number(),
          sharedSignalKinds: z.array(z.string()),
          headline: z.string(),
        })
      ),
      generatedAt: z.string(),
    }),
  })
  // The queue is a pure projection of in-memory state; a 5s cache absorbs the
  // console's polling without ever showing data older than one sweep step.
  @Cache({ ttl: 5 })
  async getOfficerQueue(input: { limit?: number; onlyPending?: boolean }): Promise<{
    queue: unknown[];
    totals: Record<string, number>;
    rings: unknown[];
    generatedAt: string;
  }> {
    const overview = this.state.getOverview();
    const filtered = input.onlyPending
      ? overview.queue.filter((row) => row.decision === null)
      : overview.queue;

    return {
      queue: filtered.slice(0, input.limit ?? filtered.length).map((row) => ({
        applicationId: row.applicationId,
        applicantName: row.applicantName,
        applicationType: row.applicationType,
        status: row.status,
        riskScore: row.riskScore,
        riskBand: row.riskBand,
        stagesCompleted: row.stagesCompleted,
        stagesTotal: row.stagesTotal,
        pipelineComplete: row.pipelineComplete,
        clusterSize: row.clusterSize,
        signalCount: row.signalCount,
        decision: row.decision,
        agentRuns: row.agentRuns,
        headline: row.headline,
      })),
      totals: overview.totals as unknown as Record<string, number>,
      rings: overview.rings,
      generatedAt: overview.generatedAt,
    };
  }

  @Tool({
    name: 'get_console_activity',
    description:
      'The live activity feed: every pipeline stage completion, agent step, autopilot sweep and ' +
      'officer decision, in order, with a monotonic id so a caller can poll for only what is ' +
      'new. This is the audit-grade record of everything the machine did, including work no ' +
      'human triggered. Read-only.',
    inputSchema: z.object({
      since: z.number().int().min(0).optional().describe('Return only events with a higher id.'),
      limit: z.number().int().positive().max(500).optional(),
      applicationId: z.string().optional(),
    }),
    outputSchema: z.object({
      events: z.array(
        z.object({
          id: z.number(),
          event: z.string(),
          applicationId: z.string().nullable(),
          at: z.string(),
          payload: z.unknown(),
        })
      ),
      latestId: z.number(),
      liveSubscribers: z.number(),
    }),
  })
  async getConsoleActivity(input: {
    since?: number;
    limit?: number;
    applicationId?: string;
  }): Promise<{ events: unknown[]; latestId: number; liveSubscribers: number }> {
    return {
      events: this.hub.getEvents(input.since ?? 0, input.limit ?? 100, input.applicationId),
      latestId: this.hub.getLatestId(),
      liveSubscribers: this.hub.subscriberCount(),
    };
  }
}
