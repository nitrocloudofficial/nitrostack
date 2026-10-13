import { HealthCheck, HealthCheckInterface, HealthCheckResult, Injectable } from '@nitrostack/core';
import { HermesComplianceAgent } from '../agents/hermes.compliance.js';

@Injectable({ deps: [HermesComplianceAgent] })
@HealthCheck({ name: 'hermes_health', description: 'HERMES Compliance Agent Health' })
export class HermesHealthCheck implements HealthCheckInterface {
  constructor(private readonly hermes: HermesComplianceAgent) {}

  async check(): Promise<HealthCheckResult> {
    const isUp = !!this.hermes;
    return {
      status: isUp ? 'up' : 'down',
      message: isUp ? 'HERMES Compliance Agent is operational' : 'HERMES agent failed',
      timestamp: Date.now()
    };
  }
}
