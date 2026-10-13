import { HealthCheck, HealthCheckInterface, HealthCheckResult, Injectable } from '@nitrostack/core';
import { CerberusSecurityAgent } from '../agents/cerberus.security.js';

@Injectable({ deps: [CerberusSecurityAgent] })
@HealthCheck({ name: 'cerberus_health', description: 'CERBERUS Security Agent Health' })
export class CerberusHealthCheck implements HealthCheckInterface {
  constructor(private readonly cerberus: CerberusSecurityAgent) {}

  async check(): Promise<HealthCheckResult> {
    const isUp = !!this.cerberus;
    return {
      status: isUp ? 'up' : 'down',
      message: isUp ? 'CERBERUS Security Agent is operational' : 'CERBERUS agent failed',
      timestamp: Date.now()
    };
  }
}
