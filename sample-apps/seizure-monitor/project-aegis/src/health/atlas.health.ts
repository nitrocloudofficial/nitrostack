import { HealthCheck, HealthCheckInterface, HealthCheckResult, Injectable } from '@nitrostack/core';
import { AtlasSreAgent } from '../agents/atlas.sre.js';

@Injectable({ deps: [AtlasSreAgent] })
@HealthCheck({ name: 'atlas_health', description: 'ATLAS SRE Agent Health' })
export class AtlasHealthCheck implements HealthCheckInterface {
  constructor(private readonly atlas: AtlasSreAgent) {}

  async check(): Promise<HealthCheckResult> {
    const isUp = !!this.atlas;
    return {
      status: isUp ? 'up' : 'down',
      message: isUp ? 'ATLAS SRE Agent is operational' : 'ATLAS agent failed',
      timestamp: Date.now()
    };
  }
}
