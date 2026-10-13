import { describe, it, expect } from 'vitest';
import { analyzeHistory, analyzeHistorySchema } from '../history-analyzer.tool.js';

describe('HistoryAnalyzerTool', () => {
  it('should analyze history for mock user-alpha-101 and return plausible non-absurd savings', () => {
    const input = { userId: 'user-alpha-101' };
    expect(() => analyzeHistorySchema.parse(input)).not.toThrow();

    const result = analyzeHistory(input.userId);

    expect(result.monthlyPromptVolume).toBe(25);
    expect(result.projectedMonthlySavings).toBeGreaterThan(0);
    expect(result.projectedMonthlySavings).toBeLessThan(500); // Plausible bounds check
    expect(result.userPatternSummary).toContain('user-alpha-101');
    expect(result.satisfactionMetrics).toBeDefined();
    expect(result.satisfactionMetrics?.avgSatisfactionRate).toBeGreaterThanOrEqual(0);
    expect(result.satisfactionMetrics?.avgTimeToSatisfactionSec).toBeGreaterThan(0);
  });

  it('should analyze history for power reasoning mock user user-gamma-303', () => {
    const result = analyzeHistory('user-gamma-303');

    expect(result.monthlyPromptVolume).toBe(25);
    expect(result.projectedMonthlySavings).toBeGreaterThanOrEqual(0);
    expect(result.projectedMonthlySavings).toBeLessThan(500);
    expect(result.userPatternSummary).toContain('user-gamma-303');
    expect(result.satisfactionMetrics?.satisfactionScore).toBeGreaterThan(0);
  });

  it('should gracefully fall back to default user profile when userId is not found', () => {
    const result = analyzeHistory('non-existent-user-999');

    expect(result).toBeDefined();
    expect(result.monthlyPromptVolume).toBeGreaterThan(0);
    expect(result.projectedMonthlySavings).toBeGreaterThanOrEqual(0);
    expect(result.projectedMonthlySavings).toBeLessThan(500);
    expect(result.userPatternSummary).toBeDefined();
    expect(isNaN(result.projectedMonthlySavings)).toBe(false);
  });

  it('should handle empty or undefined userId without throwing or returning undefined', () => {
    const result = analyzeHistory('');

    expect(result).toBeDefined();
    expect(result.monthlyPromptVolume).toBeGreaterThan(0);
    expect(result.projectedMonthlySavings).toBeGreaterThanOrEqual(0);
    expect(typeof result.userPatternSummary).toBe('string');
  });
});
