/**
 * Health checks for the automation layer.
 *
 * WHY THE AUTOPILOT NEEDS ITS OWN PROBE
 * ------------------------------------
 * The autopilot is a background timer. Its failure mode is not a crash — it is
 * silence. The process stays up, every tool still answers, the console still
 * renders, and nothing sweeps. From the outside that is indistinguishable from a
 * quiet queue, which is the worst possible property for the feature that makes
 * the system autonomous.
 *
 * These two checks make the silence visible:
 *
 *   autopilot     armed but never swept, or armed and stalled mid-sweep
 *   console-http  the browser UI never mounted (usually NODE_ENV/HOST on deploy)
 *
 * NEITHER REPORTS 'down' WHEN THE FEATURE IS SIMPLY OFF
 * ---------------------------------------------------
 * Disabled-by-configuration is a supported mode (local stdio development, and the
 * manual-flow demo). Reporting 'down' for it would make a healthy container fail
 * its readiness probe on NitroCloud and get restarted in a loop. Off => 'up' with
 * an explanatory message; armed-but-broken => 'degraded'.
 *
 * A @HealthCheck class must be listed in a module's `providers` for core to
 * resolve and register it (app-decorator.js:89-97). In `controllers` it silently
 * contributes nothing.
 */
import { HealthCheck, Injectable } from '@nitrostack/core';
import type { HealthCheckInterface, HealthCheckResult } from '@nitrostack/core';
import { AutopilotService } from '../services/autopilot.service.js';
import { ConsoleEventHubService } from '../services/console-event-hub.service.js';
import { ConsoleHttpService } from '../services/console-http.service.js';

/**
 * A sweep "in progress" longer than this is stuck, not slow. Nine applications ×
 * 12 steps of deterministic work completes in well under a second; with an LLM
 * planner in play, a few seconds per turn. Five minutes is far beyond any
 * legitimate sweep.
 */
const STALLED_SWEEP_MS = 5 * 60 * 1000;

@HealthCheck({
  name: 'autopilot',
  description: 'Autonomous investigation loop is armed and progressing',
})
@Injectable({ deps: [AutopilotService, ConsoleEventHubService] })
export class AutopilotHealthCheck implements HealthCheckInterface {
  constructor(
    private readonly autopilot: AutopilotService,
    private readonly hub: ConsoleEventHubService
  ) {}

  check(): HealthCheckResult {
    const status = this.autopilot.getStatus();

    const details = {
      enabled: status.enabled,
      mode: status.mode,
      intervalSeconds: status.intervalSeconds,
      sweepsCompleted: status.sweepsCompleted,
      applicationsInvestigated: status.applicationsInvestigated,
      escalations: status.escalations,
      ringsDetected: status.ringsDetected,
      nextSweepEta: status.nextSweepEta,
      bufferedEvents: this.hub.getLatestId(),
      liveSubscribers: this.hub.subscriberCount(),
    };

    if (!status.enabled) {
      return {
        status: 'up',
        message:
          'Autopilot disabled by configuration — on-demand agent_investigate and ' +
          'agent_triage_queue are unaffected. Set PASSPORTIQ_AUTOPILOT=true to arm it.',
        details,
      };
    }

    if (status.mode === 'stopped') {
      return {
        status: 'degraded',
        message:
          `Autopilot is enabled but not running: ${status.detail} The queue will not be ` +
          `investigated until it is armed (autopilot_control action=start).`,
        details,
      };
    }

    if (status.mode === 'sweeping' && status.lastSweepStartedAt !== null) {
      const elapsed = Date.now() - Date.parse(status.lastSweepStartedAt);
      if (Number.isFinite(elapsed) && elapsed > STALLED_SWEEP_MS) {
        return {
          status: 'degraded',
          message:
            `A sweep has been in progress for ${Math.round(elapsed / 1000)}s on ` +
            `${status.currentApplicationId ?? 'an unknown application'} — far longer than any ` +
            `legitimate sweep. The loop is likely stuck and subsequent ticks are being skipped ` +
            `by the re-entrancy guard.`,
          details,
        };
      }
    }

    return {
      status: 'up',
      message:
        `Autopilot ${status.mode}: ${status.sweepsCompleted} sweep(s) completed, ` +
        `${status.applicationsInvestigated} application(s) investigated autonomously, ` +
        `${status.escalations} escalated to a human officer.`,
      details,
    };
  }
}

@HealthCheck({
  name: 'console-http',
  description: 'Browser-facing officer console is mounted on the HTTP transport',
})
@Injectable({ deps: [ConsoleHttpService] })
export class ConsoleHttpHealthCheck implements HealthCheckInterface {
  constructor(private readonly consoleHttp: ConsoleHttpService) {}

  check(): HealthCheckResult {
    if (this.consoleHttp.isAttached()) {
      return {
        status: 'up',
        message: 'Officer console mounted at /console with the JSON API under /api/*.',
        details: { attached: true },
      };
    }

    // stdio-only is the normal local mode, so this is informational, not a fault.
    return {
      status: 'up',
      message:
        'Officer console not mounted — the server is in stdio-only mode ' +
        '(NODE_ENV development/dev/unset). MCP tools, resources and prompts are unaffected.',
      details: {
        attached: false,
        nodeEnv: process.env['NODE_ENV'] ?? '(unset)',
        hint: 'Set NODE_ENV=production and HOST=0.0.0.0 to serve the console over HTTP.',
      },
    };
  }
}
