import { getAllHealthChecks } from '../decorators/health-check.decorator.js';

/**
 * Health Checks Resource
 * 
 * Exposes all registered health checks as an MCP resource
 * so clients can query health status
 */
export async function buildHealthChecksResource() {
  return {
    uri: 'health://checks',
    name: 'Health Checks',
    description: 'Current health status of all registered health checks',
    mimeType: 'application/json',
    async read() {
      const checks = await getAllHealthChecks();
      
      // Transform to array format
      const checksArray = Object.entries(checks).map(([name, result]) => ({
        name,
        ...result,
      }));
      
      return JSON.stringify({
        checks: checksArray,
        count: checksArray.length,
        timestamp: new Date().toISOString(),
      }, null, 2);
    },
  };
}

