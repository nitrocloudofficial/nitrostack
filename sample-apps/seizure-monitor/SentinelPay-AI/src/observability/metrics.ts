/**
 * SentinelPay AI — Metrics
 * Source: Technical Specification §13.2 (Metrics), §13.3 (Latency metrics),
 *         §13.5 (Alerts — thresholds this module makes measurable)
 *
 * A minimal in-memory counter/histogram implementation with the exact
 * metric names from §13.2. This is intentionally NOT a Prometheus client
 * or NitroStack-native metrics binding — if NitroStack exposes native
 * metrics, wrap this module's `increment`/`observe` calls with it later
 * without changing any call site.
 */

export type CounterName =
  | "investigation_total"
  | "investigation_success_total"
  | "investigation_failure_total"
  | "tool_calls_total"
  | "tool_errors_total"
  | "risk_calculation_total"
  | "approval_pending_total"
  | "approval_decision_total"
  | "missing_evidence_total"
  | "conflict_detected_total";

const counters: Record<CounterName, number> = {
  investigation_total: 0,
  investigation_success_total: 0,
  investigation_failure_total: 0,
  tool_calls_total: 0,
  tool_errors_total: 0,
  risk_calculation_total: 0,
  approval_pending_total: 0,
  approval_decision_total: 0,
  missing_evidence_total: 0,
  conflict_detected_total: 0,
};

/** tool_latency_ms samples, grouped by tool name, for p50/p95/p99 (§13.3). */
const latencySamples: Map<string, number[]> = new Map();

class Metrics {
  increment(name: CounterName, by = 1): void {
    counters[name] += by;
  }

  get(name: CounterName): number {
    return counters[name];
  }

  snapshot(): Readonly<Record<CounterName, number>> {
    return { ...counters };
  }

  /** Record a latency sample for a given tool/operation (§13.3). */
  observeLatency(tool: string, durationMs: number): void {
    const samples = latencySamples.get(tool) ?? [];
    samples.push(durationMs);
    latencySamples.set(tool, samples);
  }

  /** Compute a percentile (0-100) over recorded samples for a tool. */
  percentile(tool: string, p: number): number | null {
    const samples = latencySamples.get(tool);
    if (!samples || samples.length === 0) return null;
    const sorted = [...samples].sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
    return sorted[Math.max(0, index)] ?? null;
  }

  /** Reset all counters/latencies. Test-only utility. */
  reset(): void {
    for (const key of Object.keys(counters) as CounterName[]) counters[key] = 0;
    latencySamples.clear();
  }
}

export const metrics = new Metrics();
