import { HealthCheck, HealthCheckInterface, HealthCheckResult, Injectable } from '@nitrostack/core';
import { IncrementalSVDEngine } from '../engine/incremental-svd.engine.js';

@Injectable({ deps: [IncrementalSVDEngine] })
@HealthCheck({ name: 'svd_health', description: 'Incremental SVD Engine Health' })
export class SvdHealthCheck implements HealthCheckInterface {
  constructor(private readonly svdEngine: IncrementalSVDEngine) {}

  async check(): Promise<HealthCheckResult> {
    const isUp = !!this.svdEngine;
    return {
      status: isUp ? 'up' : 'down',
      message: isUp ? 'SVD Engine is operational' : 'SVD Engine failed',
      timestamp: Date.now()
    };
  }
}
