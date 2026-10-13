import { HealthCheck, HealthCheckInterface, HealthCheckResult, Injectable } from '@nitrostack/core';
import { PrimeOrchestrator } from '../agents/prime.orchestrator.js';

@Injectable({ deps: [PrimeOrchestrator] })
@HealthCheck({ name: 'prime_health', description: 'PRIME Orchestrator Health' })
export class PrimeHealthCheck implements HealthCheckInterface {
  constructor(private readonly prime: PrimeOrchestrator) {}

  async check(): Promise<HealthCheckResult> {
    const isUp = !!this.prime;
    return {
      status: isUp ? 'up' : 'down',
      message: isUp ? 'PRIME Orchestrator is operational' : 'PRIME orchestrator failed',
      timestamp: Date.now()
    };
  }
}
