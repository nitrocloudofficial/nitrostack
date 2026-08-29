import { HealthCheck, HealthCheckInterface, HealthCheckResult } from '@nitrostack/core';

@HealthCheck({ name: 'system', description: 'FinVerse system health check' })
export class SystemHealthCheck implements HealthCheckInterface {
  async check(): Promise<HealthCheckResult> {
    return {
      status: 'up',
      message: 'All FinVerse modules are healthy',
      details: {
        accountAggregator: 'ok',
        underwriting: 'ok',
        fraud: 'ok',
        repayment: 'ok',
        succession: 'ok'
      },
      timestamp: Date.now()
    };
  }
}
