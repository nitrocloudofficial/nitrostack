import { HealthCheck, HealthCheckInterface, HealthCheckResult } from '@nitrostack/core';

@HealthCheck({
  name: 'npm-registry',
  description: 'Public npm registry availability and latency',
  interval: 60,
})
export class RegistryHealthCheck implements HealthCheckInterface {
  public fetchImpl: typeof fetch = fetch;

  async check(): Promise<HealthCheckResult> {
    const started = Date.now();
    try {
      const response = await this.fetchImpl('https://registry.npmjs.org/-/ping', {
        method: 'GET',
        signal: AbortSignal.timeout(5_000),
      });
      // The ping body is not needed; release the response stream.
      await response.body?.cancel();
      const latencyMs = Date.now() - started;
      if (response.status !== 200) {
        return { status: 'down', message: `npm registry returned HTTP ${response.status}`, details: { latencyMs } };
      }
      return {
        status: latencyMs > 2_000 ? 'degraded' : 'up',
        message: latencyMs > 2_000 ? 'npm registry is slow' : 'npm registry is healthy',
        details: { latencyMs },
      };
    } catch (error) {
      return {
        status: 'down',
        message: `npm registry health check failed: ${error instanceof Error ? error.message : String(error)}`,
        details: { latencyMs: Date.now() - started },
      };
    }
  }
}
