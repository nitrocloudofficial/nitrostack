import { HealthCheck, HealthCheckInterface, HealthCheckResult, Injectable } from '@nitrostack/core';
import { ApiGuardConfig } from './config.service.js';

@Injectable()
@HealthCheck({ name: 'apiguard-liveness', description: 'APIGuard System Liveness Check' })
export class SystemLiveness implements HealthCheckInterface {
  async check(): Promise<HealthCheckResult> {
    return {
      status: 'up',
      message: 'APIGuard MCP server is running.',
      details: {
        uptimeSeconds: Math.floor(process.uptime()),
        node: process.version
      }
    };
  }
}

@Injectable({ deps: [ApiGuardConfig] })
@HealthCheck({ name: 'apiguard-readiness', description: 'APIGuard System Readiness Check' })
export class SystemReadiness implements HealthCheckInterface {
  constructor(private readonly config: ApiGuardConfig) {}

  async check(): Promise<HealthCheckResult> {
    const isLiveGitHubButNoToken = this.config.useLiveGitHub && !this.config.githubToken;
    
    if (isLiveGitHubButNoToken) {
      return {
        status: 'down',
        message: 'APIGuard is improperly configured: USE_LIVE_GITHUB=true but GITHUB_TOKEN is missing.'
      };
    }

    return {
      status: 'up',
      message: 'APIGuard is ready to accept requests.',
      details: {
        evidenceMode: this.config.useLiveGitHub ? 'live' : 'snapshot',
        classifierMode: this.config.useLlm ? this.config.llmProvider : 'deterministic-fallback',
      }
    };
  }
}

