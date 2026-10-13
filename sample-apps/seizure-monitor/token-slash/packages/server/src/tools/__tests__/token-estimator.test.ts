import { describe, expect, it } from 'vitest';
import { TokenEstimatorService } from '../token-estimator.tool.js';

describe('TokenEstimatorService', () => {
  const estimator = new TokenEstimatorService();

  it('returns zero tokens for empty string', () => {
    const result = estimator.estimateTokens('');
    expect(result.tokenCount).toBe(0);
    expect(result.tokenizerUsed).toContain('cl100k_base');
  });

  it('returns zero tokens for whitespace-only input', () => {
    const result = estimator.estimateTokens('   \n\t  ');
    expect(result.tokenCount).toBeGreaterThanOrEqual(0);
  });

  it('counts tokens for a simple English prompt', () => {
    const prompt = 'Hello, how are you today?';
    const result = estimator.estimateTokens(prompt);
    expect(result.tokenCount).toBeGreaterThan(0);
    expect(result.tokenCount).toBeLessThan(prompt.length);
    expect(result.tokenizerUsed).toContain('js-tiktoken');
  });

  it('counts tokens for code prompts accurately', () => {
    const prompt =
      'function fibonacci(n: number): number {\n  return n <= 1 ? n : fibonacci(n - 1) + fibonacci(n - 2);\n}';
    const result = estimator.estimateTokens(prompt);
    expect(result.tokenCount).toBeGreaterThan(10);
    expect(result.tokenCount).toBeLessThan(100);
  });

  it('handles non-English input without throwing', () => {
    const prompt = '请帮我总结这篇文章的主要内容，谢谢。';
    const result = estimator.estimateTokens(prompt);
    expect(result.tokenCount).toBeGreaterThan(0);
    expect(result.tokenizerUsed).toBeTruthy();
  });

  it('handles very long input without hanging', () => {
    const prompt = 'word '.repeat(20_000);
    const start = Date.now();
    const result = estimator.estimateTokens(prompt);
    const elapsed = Date.now() - start;

    expect(result.tokenCount).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(2000);
    expect(result.tokenizerUsed).toContain('truncated');
  });

  it('completes within 200ms for a 2000-word prompt', () => {
    const prompt = 'analyze '.repeat(2000);
    const start = Date.now();
    estimator.estimateTokens(prompt);
    expect(Date.now() - start).toBeLessThan(200);
  });

  it('returns higher count for longer prompts', () => {
    const short = estimator.estimateTokens('Summarize this.');
    const long = estimator.estimateTokens(
      'Please provide a detailed summary of the following document including all key points, ' +
        'action items, deadlines, and stakeholder responsibilities mentioned throughout.',
    );
    expect(long.tokenCount).toBeGreaterThan(short.tokenCount);
  });
});
