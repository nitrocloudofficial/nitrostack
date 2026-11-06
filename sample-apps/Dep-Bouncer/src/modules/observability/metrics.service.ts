import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { Injectable } from '@nitrostack/core';

export const BOUNCER_TOOL_NAMES = [
  'bouncer_check_package',
  'bouncer_check_upgrade',
  'bouncer_safe_version',
  'bouncer_review_install_scripts',
  'bouncer_check_manifest',
  'bouncer_diff_release',
  'bouncer_replay_incident',
] as const;

interface ToolMetrics {
  calls: number;
  errors: number;
  latencies: number[];
}

/** Aggregate counters only; seven tool names and at most 200 durations per tool. */
@Injectable()
export class MetricsService {
  private readonly startedAt = new Date().toISOString();
  private readonly started = performance.now();
  private readonly version: string = JSON.parse(
    readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'),
  ).version;
  private readonly tools = new Map<string, ToolMetrics>(
    BOUNCER_TOOL_NAMES.map(name => [name, { calls: 0, errors: 0, latencies: [] }]),
  );
  private readonly verdicts = { ALLOW: 0, REVIEW: 0, BLOCK: 0 };

  record(toolName: string | undefined, durationMs: number, failed: boolean, result?: unknown): void {
    const metrics = toolName ? this.tools.get(toolName) : undefined;
    if (!metrics) return;
    metrics.calls++;
    if (failed) metrics.errors++;
    metrics.latencies.push(durationMs);
    if (metrics.latencies.length > 200) metrics.latencies.shift();

    // A manifest contributes its overall verdict once, not each dependency's verdict.
    if (!failed && result && typeof result === 'object' && 'verdict' in result) {
      const verdict = result.verdict;
      if (verdict === 'ALLOW' || verdict === 'REVIEW' || verdict === 'BLOCK') {
        this.verdicts[verdict]++;
      }
    }
  }

  snapshot() {
    return {
      startedAt: this.startedAt,
      uptimeSeconds: (performance.now() - this.started) / 1000,
      version: this.version,
      tools: Object.fromEntries([...this.tools].map(([name, metrics]) => {
        const sorted = [...metrics.latencies].sort((a, b) => a - b);
        const percentile = (p: number) => sorted[Math.ceil(sorted.length * p) - 1] ?? 0;
        return [name, {
          calls: metrics.calls,
          errors: metrics.errors,
          latencyMs: { p50: percentile(0.5), p95: percentile(0.95), samples: sorted.length },
        }];
      })),
      verdicts: { ...this.verdicts },
    };
  }
}
