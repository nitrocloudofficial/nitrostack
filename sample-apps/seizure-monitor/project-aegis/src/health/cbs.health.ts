import { HealthCheck, HealthCheckInterface, HealthCheckResult, Injectable } from '@nitrostack/core';
import { MockCBSService } from '../mock-cbs.service.js';

@Injectable({ deps: [MockCBSService] })
@HealthCheck({ name: 'cbs_connection', description: 'Core Banking System Connection Health' })
export class CbsHealthCheck implements HealthCheckInterface {
  constructor(private readonly cbs: MockCBSService) {}

  async check(): Promise<HealthCheckResult> {
    const isUp = !!this.cbs;
    return {
      status: isUp ? 'up' : 'down',
      message: isUp ? 'Core Banking System is operational' : 'CBS connection failed',
      timestamp: Date.now()
    };
  }
}
