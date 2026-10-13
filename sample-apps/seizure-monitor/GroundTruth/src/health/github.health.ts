import { HealthCheck, HealthCheckInterface, HealthCheckResult } from '@nitrostack/core';
import { GitHubConfigError, apiBase, readConfig } from '../modules/github/github.service.js';

/**
 * GitHub connectivity check.
 *
 * GroundTruth is useless without GitHub access — the whole premise is verifying
 * claims against real activity. A missing or expired token is the single most
 * likely thing to break a demo, so it gets its own health check rather than
 * surfacing only when someone runs crosscheck_activity on stage.
 */
@HealthCheck({
  name: 'github',
  description: 'GitHub API credentials and reachability',
  interval: 60,
})
export class GitHubHealthCheck implements HealthCheckInterface {
  async check(): Promise<HealthCheckResult> {
    let cfg;
    try {
      cfg = readConfig();
    } catch (error) {
      if (error instanceof GitHubConfigError) {
        return {
          status: 'down',
          message: 'GitHub is not configured — claim verification is unavailable',
          details: {
            reason: error.message,
            fix: 'Copy .env.example to .env and set GITHUB_TOKEN and GITHUB_ORG.',
          },
        };
      }
      throw error;
    }

    try {
      const res = await fetch(`${apiBase()}/rate_limit`, {
        headers: {
          Authorization: `Bearer ${cfg.token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'groundtruth-mcp',
        },
      });

      if (res.status === 401) {
        return {
          status: 'down',
          message: 'GitHub rejected the token',
          details: {
            reason: 'HTTP 401 — the token is invalid, revoked, or expired.',
            fix: 'Generate a new classic token with repo read scope and update GITHUB_TOKEN.',
          },
        };
      }

      if (!res.ok) {
        return {
          status: 'degraded',
          message: `GitHub responded ${res.status}`,
          details: { org: cfg.org },
        };
      }

      const body = (await res.json()) as {
        resources?: { core?: { remaining?: number; limit?: number } };
      };
      const remaining = body.resources?.core?.remaining ?? null;
      const limit = body.resources?.core?.limit ?? null;

      // Running dry mid-demo looks like a bug, so warn well before zero.
      const low = remaining !== null && remaining < 100;

      return {
        status: low ? 'degraded' : 'up',
        message: low
          ? 'GitHub reachable but rate limit is nearly exhausted'
          : 'GitHub reachable and authenticated',
        details: {
          org: cfg.org,
          repos: cfg.repos.length > 0 ? cfg.repos.join(', ') : '(auto-discovered)',
          rateLimit: remaining !== null ? `${remaining}/${limit}` : 'unknown',
        },
      };
    } catch (error: any) {
      return {
        status: 'down',
        message: 'Could not reach the GitHub API',
        details: {
          reason: error?.message ?? String(error),
          fix: 'Check network access from wherever this server is running.',
        },
      };
    }
  }
}
