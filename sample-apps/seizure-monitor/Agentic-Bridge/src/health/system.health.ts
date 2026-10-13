/**
 * Health checks.
 *
 * `@HealthCheck` is a CLASS decorator taking an options object, and the class
 * implements `HealthCheckInterface.check()` — one class per check.
 */
import {
  HealthCheck,
  Injectable,
  type HealthCheckInterface,
  type HealthCheckResult,
} from '@nitrostack/core';
import * as fs from 'fs';
import { execFileSync } from 'child_process';
import { WorkspaceService } from '../shared/services/workspace.service.js';
import { JiraClient } from '../modules/agile/jira.client.js';
import { SlackClient } from '../modules/agile/chat.client.js';
import { StoreService } from '../shared/services/store.service.js';
import { AuthService } from '../shared/services/auth.service.js';
import { hardeningState } from '../shared/services/http-hardening.service.js';
import { EffectsService } from '../modules/pipeline/effects.service.js';
import { resolveTransportType } from '../shared/transport.js';

/** Probed once: git either exists on this host for the process lifetime, or it does not. */
let gitAvailable: boolean | undefined;
function hasGit(): boolean {
  if (gitAvailable === undefined) {
    try {
      execFileSync('git', ['--version'], { stdio: 'ignore', timeout: 5000 });
      gitAvailable = true;
    } catch {
      gitAvailable = false;
    }
  }
  return gitAvailable;
}

@HealthCheck({
  name: 'system',
  description: 'Process uptime and memory headroom',
  interval: 30,
})
@Injectable()
export class SystemHealthCheck implements HealthCheckInterface {
  async check(): Promise<HealthCheckResult> {
    const memory = process.memoryUsage();
    const heapPercent = (memory.heapUsed / memory.heapTotal) * 100;
    return {
      status: heapPercent < 90 ? 'up' : 'degraded',
      message: heapPercent < 90 ? 'Bridge is operational' : 'High heap usage',
      details: {
        uptime: `${Math.floor(process.uptime())}s`,
        heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
        heapPercent: `${heapPercent.toFixed(1)}%`,
        node: process.version,
      },
    };
  }
}

@HealthCheck({
  name: 'fixture',
  description: 'Bundled legacy fixture and mock enterprise data are readable',
  interval: 60,
})
@Injectable({ deps: [WorkspaceService] })
export class FixtureHealthCheck implements HealthCheckInterface {
  constructor(private workspace: WorkspaceService) {}

  async check(): Promise<HealthCheckResult> {
    const fixture = fs.existsSync(this.workspace.fixtureRoot);
    const data = fs.existsSync(this.workspace.dataRoot);
    return {
      status: fixture && data ? 'up' : 'degraded',
      message:
        fixture && data
          ? 'Bundled fixture and mock enterprise data are present'
          : 'Bundled assets missing — tools will require explicit paths',
      details: {
        fixtureRoot: this.workspace.fixtureRoot,
        fixturePresent: String(fixture),
        dataRoot: this.workspace.dataRoot,
        dataPresent: String(data),
        allowedRoots: this.workspace.allowedRoots.join(', '),
      },
    };
  }
}

@HealthCheck({
  name: 'security',
  description: 'Transport, payload limits, credential enforcement and wired integrations',
  interval: 60,
})
@Injectable({ deps: [AuthService, EffectsService] })
export class SecurityHealthCheck implements HealthCheckInterface {
  constructor(
    private auth: AuthService,
    private effects: EffectsService
  ) {}

  async check(): Promise<HealthCheckResult> {
    const state = hardeningState();
    const transport = resolveTransportType();
    const remote = transport !== 'stdio';

    // An unauthenticated remote surface is the one configuration worth
    // flagging: over stdio the client is already a trusted local process, but a
    // listening socket with no credential is an open door.
    const exposed = remote && !this.auth.enabled;
    // A body limit that silently failed to apply would cap ingestion at 100kb
    // without anyone noticing until a large upload was rejected.
    const limitBroken = remote && state.jsonBodyLimitVia === 'failed';

    const integrations = this.effects.describeConfiguration();

    return {
      status: exposed || limitBroken ? 'degraded' : 'up',
      message: exposed
        ? 'HTTP transport is listening with no credential configured — set BRIDGE_ADMIN_API_KEY'
        : limitBroken
          ? `JSON body limit could not be applied (${state.jsonBodyLimitError})`
          : `Transport ${transport}; auth ${this.auth.description}`,
      details: {
        transport,
        auth: this.auth.description,
        authScope: state.authScope,
        httpAuthEdge: String(state.httpEdgeInstalled),
        jsonBodyLimit: `${state.jsonBodyLimit} (${state.jsonBodyLimitVia})`,
        sideEffectIntegrations:
          Object.entries(integrations)
            .filter(([, wired]) => wired)
            .map(([name]) => name)
            .join(', ') || 'none',
      },
    };
  }
}

@HealthCheck({
  name: 'live-data',
  description: 'Live enterprise integrations and remote codebase ingestion',
  interval: 60,
})
@Injectable({ deps: [JiraClient, SlackClient] })
export class LiveDataHealthCheck implements HealthCheckInterface {
  constructor(
    private jira: JiraClient,
    private slack: SlackClient
  ) {}

  async check(): Promise<HealthCheckResult> {
    const mode = process.env.BRIDGE_DATA_MODE?.trim().toLowerCase() || 'auto';
    const jira = this.jira.configured;
    const slack = this.slack.configured;
    // Remote targets are unusable without git on PATH, and that is far easier
    // to diagnose here than from a failed clone inside a tool call.
    const git = hasGit();

    const gaps = [!jira && 'Jira', !slack && 'Slack', !git && 'git'].filter(Boolean);

    return {
      // Fixtures are a legitimate way to run this server, so missing
      // credentials are "degraded", not "down" — but they are never silent.
      status: jira && slack && git ? 'up' : 'degraded',
      message:
        jira && slack && git
          ? `Live Jira and Slack configured; remote repository ingestion available (mode=${mode})`
          : `Running without: ${gaps.join(', ')}. ` +
            (mode === 'fixture'
              ? 'BRIDGE_DATA_MODE=fixture, so live sources are disabled deliberately.'
              : 'Affected tools fall back to bundled fixtures and report dataSource="fixture".'),
      details: {
        dataMode: mode,
        jira: jira ? 'configured' : this.jira.missing().join(', ') + ' missing',
        slack: slack ? 'configured' : this.slack.missing().join(', ') + ' missing',
        git: git ? 'available' : 'not on PATH — GitHub URL targets will fail',
        allowedRepoHosts: process.env.BRIDGE_ALLOWED_REPO_HOSTS?.trim() || 'github.com',
        githubToken: process.env.GITHUB_TOKEN?.trim() ? 'set (private repos clonable)' : 'unset (public only)',
      },
    };
  }
}

@HealthCheck({
  name: 'knowledge-base',
  description: 'Durable knowledge base and swarm run state',
  interval: 30,
})
@Injectable({ deps: [StoreService] })
export class KnowledgeHealthCheck implements HealthCheckInterface {
  constructor(private store: StoreService) {}

  async check(): Promise<HealthCheckResult> {
    const facts = this.store.all('knowledge');
    const run = this.store.latestRun();
    const openConflicts = this.store.all('conflicts').filter((c) => c.status === 'open').length;
    return {
      // An empty knowledge base is a valid cold start, not a failure.
      status: 'up',
      message: facts.length
        ? `${facts.length} facts across ${new Set(facts.map((f) => f.category)).size} categories`
        : 'Cold start — run run_swarm to populate',
      details: {
        facts: String(facts.length),
        skills: String(this.store.all('skills').length),
        openConflicts: String(openConflicts),
        latestRun: run?.id ?? 'none',
        latestRunStatus: run?.status ?? 'none',
      },
    };
  }
}
