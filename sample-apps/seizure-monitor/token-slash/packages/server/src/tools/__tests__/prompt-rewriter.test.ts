import { describe, expect, it } from 'vitest';
import { PromptRewriterService } from '../../orchestration/prompt-rewriter.service.js';

describe('PromptRewriterService', () => {
  const rewriter = new PromptRewriterService();

  it('returns empty result for empty prompt', () => {
    const result = rewriter.rewritePrompt('', 'general-qa');
    expect(result.optimizedPrompt).toBe('');
    expect(result.tokenSavingsPercent).toBe(0);
  });

  it('trims filler while preserving intent', () => {
    const prompt =
      'Please kindly I would like you to summarize this article in 3 bullet points.';
    const result = rewriter.rewritePrompt(prompt, 'summarization');

    expect(result.optimizedPrompt.length).toBeLessThan(prompt.length);
    expect(result.optimizedPrompt.toLowerCase()).toContain('summarize');
    expect(result.optimizedPrompt).toContain('3 bullet points');
    expect(result.tokenSavingsPercent).toBeGreaterThan(0);
  });

  it('preserves code blocks intact', () => {
    const prompt =
      'Please refactor this function:\n```typescript\nfunction add(a: number, b: number) {\n  return a + b;\n}\n```';
    const result = rewriter.rewritePrompt(prompt, 'code-generation');

    expect(result.optimizedPrompt).toContain('```typescript');
    expect(result.optimizedPrompt).toContain('function add(a: number, b: number)');
    expect(result.optimizedPrompt).not.toContain('Please refactor');
  });

  it('does not crash on very long input', () => {
    const prompt = 'Please summarize '.repeat(5000);
    const result = rewriter.rewritePrompt(prompt, 'summarization');

    expect(result.optimizedPrompt.length).toBeGreaterThan(0);
    expect(result.tokenSavingsPercent).toBeGreaterThanOrEqual(0);
  });

  it('handles non-English input without throwing', () => {
    const prompt = '请帮我总结这篇文章的主要内容，谢谢。';
    const result = rewriter.rewritePrompt(prompt, 'summarization');

    expect(result.optimizedPrompt).toBeTruthy();
    expect(result.tokenSavingsPercent).toBeGreaterThanOrEqual(0);
  });

  it('keeps creative-writing tone relatively intact', () => {
    const prompt =
      'Please write a creative story about a robot who learns to paint.';
    const result = rewriter.rewritePrompt(prompt, 'creative-writing');

    expect(result.optimizedPrompt.toLowerCase()).toContain('creative');
    expect(result.optimizedPrompt.toLowerCase()).toContain('story');
  });
});
