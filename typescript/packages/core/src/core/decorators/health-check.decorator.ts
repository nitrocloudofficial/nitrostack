import 'reflect-metadata';

const HEALTH_CHECK_KEY = 'nitrostack:health_check';

/**
 * Health check result
 */
export interface HealthCheckResult {
  status: 'up' | 'down' | 'degraded';
  message?: string;
  details?: unknown;
  timestamp?: number;
}

/**
 * Health check interface
 */
export interface HealthCheckInterface {
  check(): Promise<HealthCheckResult> | HealthCheckResult;
}

/**
 * Health check options
 */
export interface HealthCheckOptions {
  /** Health check name/identifier */
  name: string;
  
  /** Description */
  description?: string;
  
  /** Interval to run health check (in seconds) */
  interval?: number;
}

// Global health check registry
const healthChecks = new Map<string, { 
  checker: HealthCheckInterface; 
  options: HealthCheckOptions;
  lastResult?: HealthCheckResult;
}>();

/**
 * Health check decorator - marks a class as a health check
 * 
 * @example
 * ```typescript
 * @HealthCheck({ name: 'database', description: 'Database connectivity' })
 * export class DatabaseHealthCheck implements HealthCheckInterface {
 *   constructor(private database: DatabaseService) {}
 *   
 *   async check(): Promise<HealthCheckResult> {
 *     try {
 *       await this.database.ping();
 *       return { status: 'up', message: 'Database is healthy' };
 *     } catch (error) {
 *       return { 
 *         status: 'down', 
 *         message: 'Database connection failed',
 *         details: error.message 
 *       };
 *     }
 *   }
 * }
 * ```
 */
export function HealthCheck(options: HealthCheckOptions): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata(HEALTH_CHECK_KEY, options, target);
  };
}

/**
 * Register a health check
 */
export function registerHealthCheck(checker: HealthCheckInterface, options: HealthCheckOptions): void {
  healthChecks.set(options.name, { checker, options });
  
  // Run periodically if interval is set
  if (options.interval) {
    setInterval(async () => {
      try {
        const result = await checker.check();
        const entry = healthChecks.get(options.name);
        if (entry) {
          entry.lastResult = {
            ...result,
            timestamp: Date.now(),
          };
        }
      } catch (error) {
        const entry = healthChecks.get(options.name);
        if (entry) {
          entry.lastResult = {
            status: 'down',
            message: 'Health check failed',
            details: error,
            timestamp: Date.now(),
          };
        }
      }
    }, options.interval * 1000);
  }
}

/**
 * Get all health check results
 */
export async function getAllHealthChecks(): Promise<Record<string, HealthCheckResult>> {
  const results: Record<string, HealthCheckResult> = {};
  
  for (const [name, { checker, lastResult }] of healthChecks.entries()) {
    if (lastResult) {
      results[name] = lastResult;
    } else {
      try {
        results[name] = {
          ...await checker.check(),
          timestamp: Date.now(),
        };
      } catch (error: unknown) {
        results[name] = {
          status: 'down',
          message: 'Health check failed',
          details: error instanceof Error ? error.message : String(error),
          timestamp: Date.now(),
        };
      }
    }
  }
  
  return results;
}

/**
 * Get a specific health check result
 */
export async function getHealthCheck(name: string): Promise<HealthCheckResult | null> {
  const entry = healthChecks.get(name);
  if (!entry) return null;
  
  if (entry.lastResult) {
    return entry.lastResult;
  }
  
  try {
    const result = await entry.checker.check();
    return {
      ...result,
      timestamp: Date.now(),
    };
  } catch (error: unknown) {
    return {
      status: 'down',
      message: 'Health check failed',
      details: error instanceof Error ? error.message : String(error),
      timestamp: Date.now(),
    };
  }
}

/**
 * Get overall health status
 */
export async function getOverallHealth(): Promise<{
  status: 'healthy' | 'unhealthy' | 'degraded';
  checks: Record<string, HealthCheckResult>;
}> {
  const checks = await getAllHealthChecks();
  
  const statuses = Object.values(checks).map(c => c.status);
  
  let overallStatus: 'healthy' | 'unhealthy' | 'degraded';
  if (statuses.every(s => s === 'up')) {
    overallStatus = 'healthy';
  } else if (statuses.some(s => s === 'down')) {
    overallStatus = 'unhealthy';
  } else {
    overallStatus = 'degraded';
  }
  
  return {
    status: overallStatus,
    checks,
  };
}

/**
 * Check if a class is a health check
 */
export function isHealthCheck(target: object): boolean {
  return Reflect.hasMetadata(HEALTH_CHECK_KEY, target);
}

/**
 * Get health check options from metadata
 */
export function getHealthCheckMetadata(target: object): HealthCheckOptions | undefined {
  return Reflect.getMetadata(HEALTH_CHECK_KEY, target);
}

