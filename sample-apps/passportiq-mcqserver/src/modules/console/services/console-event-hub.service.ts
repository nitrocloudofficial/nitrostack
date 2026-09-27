/**
 * ConsoleEventHubService — one fan-out point from the NitroStack event bus to
 * every browser watching the officer console.
 *
 * WHAT PROBLEM THIS SOLVES
 * -----------------------
 * DashboardGatewayService already buffers events per application so an MCP widget
 * can replay history when it mounts. A browser tab needs the opposite shape: one
 * ordered stream of everything, pushed the instant it happens, across every
 * application. Rather than teaching the gateway two jobs, this hub subscribes to
 * the same bus with @OnEvent and holds (a) a bounded global ring buffer for
 * late-joining tabs and (b) the set of open SSE writers.
 *
 * WHY @OnEvent AND NOT A CALL FROM THE EMITTERS
 * --------------------------------------------
 * The pipeline tools, the agent runner and the autopilot all emit through
 * ctx.emit / emitEvent already. Subscribing means none of them needs to know a
 * console exists — the HTTP layer is additive, and deleting this module cannot
 * break a single verification stage.
 *
 * REGISTRATION HAZARD (the one that bites)
 * ---------------------------------------
 * @OnEvent only writes metadata. Core scans *resolved* provider instances and
 * calls registerEventHandlers() on them, so a provider that is declared but never
 * instantiated silently subscribes to nothing. This class is listed in
 * ConsoleModule.providers, and core's instantiateAll() constructs every declared
 * provider at boot, which is what makes the subscription real.
 */
import { Injectable, OnEvent, defaultLogger } from '@nitrostack/core';
import {
  APPLICATION_DECIDED,
  CASE_CLOSED,
  CASE_OPENED,
  CASE_SLA_BREACHED,
  CASE_STAGE_CHANGED,
  AGENT_RUN_FINISHED_EVENT,
  AGENT_RUN_STARTED_EVENT,
  AGENT_STEP_EVENT,
  AUTOPILOT_APPLICATION_PICKED_EVENT,
  AUTOPILOT_STATE_CHANGED_EVENT,
  AUTOPILOT_SWEEP_FINISHED_EVENT,
  AUTOPILOT_SWEEP_STARTED_EVENT,
  PIPELINE_STAGE_COMPLETED,
} from '../../../contracts/index.js';

export interface ConsoleEvent {
  /** Monotonic cursor. A reconnecting tab asks for everything after its last id. */
  id: number;
  event: string;
  applicationId: string | null;
  payload: unknown;
  at: string;
}

/** A single open SSE response, reduced to the only capability the hub needs. */
export interface ConsoleSubscriber {
  send(chunk: string): void;
  close(): void;
}

/**
 * Ring-buffer size. A full 9-application autopilot sweep emits roughly 350
 * events; 1000 keeps three sweeps of scrollback without unbounded growth in a
 * long-running demo.
 */
const MAX_BUFFERED_EVENTS = 1000;

@Injectable()
export class ConsoleEventHubService {
  private readonly buffer: ConsoleEvent[] = [];
  private readonly subscribers = new Set<ConsoleSubscriber>();
  private nextId = 1;

  // ---------------------------------------------------------------------------
  // Bus subscriptions
  // ---------------------------------------------------------------------------

  @OnEvent(PIPELINE_STAGE_COMPLETED)
  async onStageCompleted(data: unknown): Promise<void> {
    this.publish(PIPELINE_STAGE_COMPLETED, data);
  }

  @OnEvent(APPLICATION_DECIDED)
  async onDecided(data: unknown): Promise<void> {
    this.publish(APPLICATION_DECIDED, data);
  }

  @OnEvent(AGENT_RUN_STARTED_EVENT)
  async onAgentRunStarted(data: unknown): Promise<void> {
    this.publish(AGENT_RUN_STARTED_EVENT, data);
  }

  @OnEvent(AGENT_STEP_EVENT)
  async onAgentStep(data: unknown): Promise<void> {
    this.publish(AGENT_STEP_EVENT, data);
  }

  @OnEvent(AGENT_RUN_FINISHED_EVENT)
  async onAgentRunFinished(data: unknown): Promise<void> {
    this.publish(AGENT_RUN_FINISHED_EVENT, data);
  }

  @OnEvent(AUTOPILOT_SWEEP_STARTED_EVENT)
  async onSweepStarted(data: unknown): Promise<void> {
    this.publish(AUTOPILOT_SWEEP_STARTED_EVENT, data);
  }

  @OnEvent(AUTOPILOT_APPLICATION_PICKED_EVENT)
  async onApplicationPicked(data: unknown): Promise<void> {
    this.publish(AUTOPILOT_APPLICATION_PICKED_EVENT, data);
  }

  @OnEvent(AUTOPILOT_SWEEP_FINISHED_EVENT)
  async onSweepFinished(data: unknown): Promise<void> {
    this.publish(AUTOPILOT_SWEEP_FINISHED_EVENT, data);
  }

  @OnEvent(AUTOPILOT_STATE_CHANGED_EVENT)
  async onStateChanged(data: unknown): Promise<void> {
    this.publish(AUTOPILOT_STATE_CHANGED_EVENT, data);
  }

  // ---- The lifecycle half of the bus ---------------------------------------
  //
  // These four are what make the console's activity stream read as a *process*
  // rather than a list of fraud checks: a case opening, every stage it moves
  // through with the rationale attached, an SLA blowing, and the case closing.
  // Without them the lifecycle board would only update on the next poll, and the
  // stream would never show the orchestrator working.

  @OnEvent(CASE_OPENED)
  async onCaseOpened(data: unknown): Promise<void> {
    this.publish(CASE_OPENED, data);
  }

  @OnEvent(CASE_STAGE_CHANGED)
  async onCaseStageChanged(data: unknown): Promise<void> {
    this.publish(CASE_STAGE_CHANGED, data);
  }

  @OnEvent(CASE_SLA_BREACHED)
  async onCaseSlaBreached(data: unknown): Promise<void> {
    this.publish(CASE_SLA_BREACHED, data);
  }

  @OnEvent(CASE_CLOSED)
  async onCaseClosed(data: unknown): Promise<void> {
    this.publish(CASE_CLOSED, data);
  }

  // ---------------------------------------------------------------------------
  // Fan-out
  // ---------------------------------------------------------------------------

  /** Buffer an event and push it to every open tab. Never throws upward. */
  publish(event: string, payload: unknown): ConsoleEvent {
    const entry: ConsoleEvent = {
      id: this.nextId++,
      event,
      applicationId: readApplicationId(payload),
      payload,
      at: new Date().toISOString(),
    };

    this.buffer.push(entry);
    if (this.buffer.length > MAX_BUFFERED_EVENTS) {
      this.buffer.splice(0, this.buffer.length - MAX_BUFFERED_EVENTS);
    }

    const frame = toSseFrame(entry);
    for (const subscriber of this.subscribers) {
      try {
        subscriber.send(frame);
      } catch {
        // A dead socket must not take the emitting stage down with it.
        this.subscribers.delete(subscriber);
      }
    }

    return entry;
  }

  /**
   * Attach a browser.
   *
   * Replays anything the tab missed *before* it joins the live set, so an event
   * cannot slip through the gap between "read history" and "start listening" —
   * the classic dropped-first-frame bug in hand-rolled SSE.
   */
  subscribe(subscriber: ConsoleSubscriber, sinceId = 0): () => void {
    for (const entry of this.buffer) {
      if (entry.id > sinceId) {
        try {
          subscriber.send(toSseFrame(entry));
        } catch {
          return () => undefined;
        }
      }
    }

    this.subscribers.add(subscriber);
    defaultLogger.debug(`[console] SSE subscriber attached (${this.subscribers.size} open)`);

    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  /** History for a fresh tab, newest last. */
  getEvents(sinceId = 0, limit = 200, applicationId?: string): ConsoleEvent[] {
    const matching = this.buffer.filter(
      (entry) =>
        entry.id > sinceId && (!applicationId || entry.applicationId === applicationId)
    );
    return matching.slice(-limit);
  }

  getLatestId(): number {
    return this.nextId - 1;
  }

  subscriberCount(): number {
    return this.subscribers.size;
  }

  /** Test-only. */
  reset(): void {
    this.buffer.length = 0;
    this.subscribers.clear();
    this.nextId = 1;
  }
}

/** SSE wire format. `id:` lets the browser resume with Last-Event-ID. */
function toSseFrame(entry: ConsoleEvent): string {
  return `id: ${entry.id}\nevent: ${entry.event}\ndata: ${JSON.stringify(entry)}\n\n`;
}

/**
 * Pull an applicationId out of any of the payload shapes on the bus.
 *
 * Defensive rather than schema-parsed on purpose: the hub's only job is routing,
 * and a payload whose shape drifted should still reach the console (where a human
 * can see it) instead of being silently dropped by a strict parse.
 */
function readApplicationId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;

  if (typeof record['applicationId'] === 'string') return record['applicationId'];

  const nested = record['run'] ?? record['record'] ?? record['result'];
  if (nested && typeof nested === 'object') {
    const inner = (nested as Record<string, unknown>)['applicationId'];
    if (typeof inner === 'string') return inner;
  }

  return null;
}
