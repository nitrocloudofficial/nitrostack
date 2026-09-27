/**
 * DashboardGatewayService — the buffer between emitted events and the widgets.
 *
 * The build docs call for `this.dashboardGateway.push(applicationId, data)`; this
 * is that gateway.
 *
 * WHY A BUFFER AND NOT A SOCKET
 * -----------------------------
 * NitroStack widgets receive data through the MCP `toolOutput` postMessage
 * channel, not a socket this process owns, and @nitrostack/core@1.0.14 exposes no
 * server-push primitive for widgets. So "forwarding to the dashboard" concretely
 * means: keep an ordered, per-application event log that a widget can (a) read in
 * full when it mounts mid-pipeline, and (b) poll incrementally by cursor.
 *
 * This still satisfies the "no polling" requirement in the build doc in the way
 * that matters: nothing here polls the PIPELINE. Stages push the instant they
 * finish, ordering is preserved, and a widget that connects late replays history
 * instead of missing it — which a raw socket would not have given us.
 *
 * In-process and bounded. If PassportIQ ever needs true server-push, this is the
 * one class that changes.
 */
import { Injectable } from '@nitrostack/core';

export interface DashboardEvent {
  /** Monotonic per-server sequence number — the cursor Frontend A polls with. */
  sequence: number;
  event: string;
  applicationId: string;
  payload: unknown;
  emittedAt: string;
}

/**
 * Per-application ring-buffer cap. The full pipeline is ~10 events per
 * application, so 200 holds a long rehearsal session without unbounded growth.
 */
const MAX_EVENTS_PER_APPLICATION = 200;

@Injectable()
export class DashboardGatewayService {
  private readonly streams = new Map<string, DashboardEvent[]>();
  private sequence = 0;

  /** Append an event to an application's stream. Called by the @OnEvent listeners. */
  push(applicationId: string, event: string, payload: unknown): DashboardEvent {
    this.sequence += 1;

    const entry: DashboardEvent = {
      sequence: this.sequence,
      event,
      applicationId,
      payload,
      emittedAt: new Date().toISOString(),
    };

    const stream = this.streams.get(applicationId) ?? [];
    stream.push(entry);

    // Ring-buffer: drop oldest first so the newest events always survive.
    if (stream.length > MAX_EVENTS_PER_APPLICATION) {
      stream.splice(0, stream.length - MAX_EVENTS_PER_APPLICATION);
    }

    this.streams.set(applicationId, stream);
    return entry;
  }

  /**
   * Events for one application.
   *
   * @param sinceSequence return only events newer than this cursor. Pass the
   *        `sequence` of the last event you saw; omit for the full history.
   */
  getEvents(applicationId: string, sinceSequence = 0): DashboardEvent[] {
    const stream = this.streams.get(applicationId) ?? [];
    return sinceSequence <= 0
      ? [...stream]
      : stream.filter((entry) => entry.sequence > sinceSequence);
  }

  /** Newest event across all applications — useful for a "live" indicator. */
  getLatestSequence(): number {
    return this.sequence;
  }

  getTrackedApplicationIds(): string[] {
    return [...this.streams.keys()];
  }

  clear(applicationId: string): void {
    this.streams.delete(applicationId);
  }

  /** Test-only. */
  clearAll(): void {
    this.streams.clear();
    this.sequence = 0;
  }
}
