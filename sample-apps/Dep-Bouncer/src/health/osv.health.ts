import { HealthCheck, HealthCheckInterface, HealthCheckResult } from '@nitrostack/core';

@HealthCheck({
  name: 'osv',
  description: 'OSV query API availability and latency',
  interval: 60,
})
export class OsvHealthCheck implements HealthCheckInterface {
  public fetchImpl: typeof fetch = fetch;

  async check(): Promise<HealthCheckResult> {
    const started = Date.now();
    try {
      const response = await this.fetchImpl('https://api.osv.dev/v1/query', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ package: { name: 'lodash', ecosystem: 'npm' }, version: '4.17.20' }),
        signal: AbortSignal.timeout(5_000),
      });
      if (response.status !== 200) {
        await response.body?.cancel();
        return {
          status: 'down', message: `OSV returned HTTP ${response.status}`,
          details: { latencyMs: Date.now() - started },
        };
      }
      await response.json();
      const latencyMs = Date.now() - started;
      return {
        status: latencyMs > 2_000 ? 'degraded' : 'up',
        message: latencyMs > 2_000 ? 'OSV is slow' : 'OSV is healthy',
        details: { latencyMs },
      };
    } catch (error) {
      return {
        status: 'down',
        message: `OSV health check failed: ${error instanceof Error ? error.message : String(error)}`,
        details: { latencyMs: Date.now() - started },
      };
    }
  }
}
