import { Injectable } from '@nitrostack/core';
import { ActivityService } from '../../observability/activity.service.js';

/**
 * notifier.service.ts — intended to fire `notifications/resources/list_changed`
 * when a new server is forged, per README-team.md's "cheap recovery of
 * dynamism now that live mount is cut."
 *
 * REAL GAP, flagged rather than faked: `ExecutionContext`
 * (node_modules/@nitrostack/core/dist/core/types.d.ts) exposes only
 * requestId/toolName/logger/metadata/auth/task — no server handle, no
 * notification emitter. `index.d.ts`'s full export surface has zero
 * exports containing "Notif" or "notification". The only place
 * `notifications/resources/list_changed` gets sent is internally, inside
 * server.js's own lifecycle (e.g. when @Resource-decorated methods are
 * (de)registered at the framework level) — there is no public hook for
 * application code to trigger it on demand.
 *
 * What this does instead: records the *intent* to the activity log, so the
 * console still shows a `notification` row when a server is forged (useful
 * for the demo narrative), but it does NOT and CANNOT push a real MCP
 * notification with the current @nitrostack/core public API. If a real
 * push turns out to matter for the live demo, this needs either a
 * NitroStack API that isn't in the current package, or dropping to the
 * underlying MCP SDK server object directly (not attempted here — out of
 * scope for a "connect the wiring" pass, and risks fighting the framework's
 * own transport internals).
 */
@Injectable()
export class NotifierService {
  constructor(private readonly activity: ActivityService) {}

  async announceServerForged(serverId: string): Promise<void> {
    await this.activity.record({
      ts: new Date().toISOString(),
      kind: 'notification',
      method: 'notifications/resources/list_changed',
      name: `forge://server/${serverId}`,
      durationMs: null,
      status: 'ok',
      detail: 'logged only — no public API to push a real MCP notification, see class doc comment',
    });
  }
}
