import { Injectable } from '@nitrostack/core';

export interface TelemetryMetrics {
  total_requests: number;
  total_errors: number;
  avg_latency_ms: number;
  p50_latency_ms: number;
  p95_latency_ms: number;
  min_latency_ms: number;
  max_latency_ms: number;
  uptime_seconds: number;
  requests_by_tool: Record<string, number>;
  errors_by_tool: Record<string, number>;
  cache_hits: number;
  cache_misses: number;
  upstream_requests: number;
  upstream_errors: Record<string, number>;
  memory_usage: {
    rss_mb: number;
    heap_used_mb: number;
    heap_total_mb: number;
  };
}

const MAX_LATENCY_SAMPLES = 10_000;

function percentile(values: number[], fraction: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil(fraction * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

@Injectable()
export class MetricsStore {
  private totalRequests = 0;
  private totalErrors = 0;
  private latencySum = 0;
  private minLatency = Infinity;
  private maxLatency = 0;
  private latencySamples: number[] = [];
  private requestsByTool: Record<string, number> = {};
  private errorsByTool: Record<string, number> = {};
  private cacheHits = 0;
  private cacheMisses = 0;
  private upstreamRequests = 0;
  private upstreamErrors: Record<string, number> = {};

  recordRequest(toolName: string, latencyMs: number, isError: boolean = false) {
    const safeLatency = Number.isFinite(latencyMs) && latencyMs >= 0 ? latencyMs : 0;
    this.totalRequests++;
    this.latencySum += safeLatency;
    this.latencySamples.push(safeLatency);
    if (this.latencySamples.length > MAX_LATENCY_SAMPLES) this.latencySamples.shift();

    if (safeLatency < this.minLatency) this.minLatency = safeLatency;
    if (safeLatency > this.maxLatency) this.maxLatency = safeLatency;

    this.requestsByTool[toolName] = (this.requestsByTool[toolName] ?? 0) + 1;

    if (isError) {
      this.totalErrors++;
      this.errorsByTool[toolName] = (this.errorsByTool[toolName] ?? 0) + 1;
    }
  }

  recordCache(toolName: string, hit: boolean): void {
    if (hit) this.cacheHits++;
    else this.cacheMisses++;
  }

  recordExternalCalls(
    calls: Array<{ api: string; status: number }>,
  ): void {
    this.upstreamRequests += calls.length;
    for (const call of calls) {
      if (call.status === 0 || call.status >= 400) {
        this.upstreamErrors[call.api] = (this.upstreamErrors[call.api] ?? 0) + 1;
      }
    }
  }

  getMetrics(): TelemetryMetrics {
    const mem = process.memoryUsage();
    return {
      total_requests: this.totalRequests,
      total_errors: this.totalErrors,
      avg_latency_ms: this.totalRequests > 0 ? Math.round(this.latencySum / this.totalRequests) : 0,
      p50_latency_ms: Math.round(percentile(this.latencySamples, 0.5)),
      p95_latency_ms: Math.round(percentile(this.latencySamples, 0.95)),
      min_latency_ms: this.minLatency === Infinity ? 0 : this.minLatency,
      max_latency_ms: this.maxLatency,
      uptime_seconds: Math.round(process.uptime()),
      requests_by_tool: { ...this.requestsByTool },
      errors_by_tool: { ...this.errorsByTool },
      cache_hits: this.cacheHits,
      cache_misses: this.cacheMisses,
      upstream_requests: this.upstreamRequests,
      upstream_errors: { ...this.upstreamErrors },
      memory_usage: {
        rss_mb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
        heap_used_mb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
        heap_total_mb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
      },
    };
  }
}
