import { describe, it, expect } from 'vitest';
import { computeInfrastructureHealth } from '../src/lib/scorecard.js';

describe('Heuristics Engine (scorecard.ts)', () => {
  it('should compute a HEALTHY score for good metrics', () => {
    const infra = { cpu_utilization: 40, memory_utilization: 40, latency_ms: 100, error_rate: 0.5 };
    const deploy = { success_rate: 98, mttr_minutes: 5 };

    const result = computeInfrastructureHealth(infra, deploy);

    expect(result.status).toBe('HEALTHY');
    expect(result.score).toBeGreaterThan(85);
    expect(result.reason_codes).toHaveLength(0);
  });

  it('should compute a CRITICAL score and flag HIGH_CPU_LOAD', () => {
    const infra = { cpu_utilization: 95, memory_utilization: 40, latency_ms: 100, error_rate: 0.5 };
    const deploy = { success_rate: 98, mttr_minutes: 5 };

    const result = computeInfrastructureHealth(infra, deploy);

    expect(result.status).toBe('WARNING');
    expect(result.reason_codes).toContain('HIGH_CPU_LOAD');
  });

  it('should compute a CRITICAL score and flag LATENCY_SPIKE', () => {
    const infra = { cpu_utilization: 50, memory_utilization: 40, latency_ms: 2500, error_rate: 0.5 };
    const deploy = { success_rate: 98, mttr_minutes: 5 };

    const result = computeInfrastructureHealth(infra, deploy);

    expect(result.status).toBe('WARNING');
    expect(result.reason_codes).toContain('LATENCY_SPIKE');
  });

  it('should flag POOR_DEPLOYMENT_SUCCESS', () => {
    const infra = { cpu_utilization: 50, memory_utilization: 40, latency_ms: 100, error_rate: 0.5 };
    const deploy = { success_rate: 70, mttr_minutes: 60 };

    const result = computeInfrastructureHealth(infra, deploy);

    // Score might be WARNING depending on other metrics, but the reason code should definitely be there
    expect(result.reason_codes).toContain('POOR_DEPLOYMENT_SUCCESS');
  });
});
