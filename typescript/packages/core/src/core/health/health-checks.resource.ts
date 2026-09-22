import { getAllHealthChecks } from '../decorators/health-check.decorator.js';
import type { NitroStackServer } from '../server.js';
import type { ServerHealthPayload } from './health.interface.js';

/**
 * Health Checks Resource
 * 
 * Exposes registered health checks, transform pipeline telemetry,
 * and spillover cache stats as an MCP resource (health://checks).
 */
export async function buildHealthChecksResource(server?: NitroStackServer) {
  return {
    uri: 'health://checks',
    name: 'Health Checks & Pipeline Telemetry',
    description: 'Current health status, transform pipeline state, and sandbox metrics',
    mimeType: 'application/json',
    async read(): Promise<string> {
      const checks = await getAllHealthChecks();

      const checksArray = Object.entries(checks).map(([name, result]) => ({
        name,
        ...result,
      }));

      const hasFailures = checksArray.some(
        (c) => (c as any).status === 'error' || (c as any).status === 'unhealthy'
      );
      const transforms = server ? server.getTransformTelemetry() : [];
      const uptimeSeconds = server ? server.getUptimeSeconds() : Math.floor(process.uptime());

      let spillover: ServerHealthPayload['spillover'] | undefined;
      const spillStore = server?.getSpilloverStore?.();
      if (spillStore) {
        const storeName = spillStore.constructor.name;
        const currentSizeBytes = typeof (spillStore as any).getCurrentSizeBytes === 'function'
          ? (spillStore as any).getCurrentSizeBytes()
          : 0;
        const activeCount = typeof (spillStore as any).getRecordCount === 'function'
          ? (spillStore as any).getRecordCount()
          : 0;
        const maxSizeBytes = (spillStore as any).maxSizeBytes ?? 100 * 1024 * 1024;
        spillover = {
          driver: storeName,
          activeCount,
          currentSizeBytes,
          maxSizeBytes,
        };
      }

      const payload: ServerHealthPayload = {
        status: hasFailures ? 'unhealthy' : 'healthy',
        uptimeSeconds,
        checks: checksArray,
        count: checksArray.length,
        transforms,
        spillover,
        timestamp: new Date().toISOString(),
      };

      return JSON.stringify(payload, null, 2);
    },
  };
}
