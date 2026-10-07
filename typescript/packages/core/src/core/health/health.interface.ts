export interface TransformTelemetry {
  name: string;
  type: string;
  order: number;
  details: Record<string, unknown>;
}

export interface ServerHealthPayload {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptimeSeconds: number;
  checks: Array<{ name: string; status: string; [key: string]: unknown }>;
  count: number;
  transforms: TransformTelemetry[];
  transformsPipeline?: {
    totalTransforms: number;
    transforms: Array<{ name: string; priority?: number; enabled?: boolean }>;
  };
  sandboxWorkerPool?: {
    poolSize: number;
    activeWorkers: number;
    queuedTasks: number;
    memoryLimitMb: number;
    totalExecutions: number;
  };
  spillover?: {
    driver: string;
    activeCount: number;
    currentSizeBytes: number;
    maxSizeBytes: number;
  };
  timestamp: string;
}
