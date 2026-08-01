import { describe, expect, it } from 'vitest';
import { ComplexityClassifierService } from '../complexity-classifier.tool.js';

describe('ComplexityClassifierService', () => {
  const classifier = new ComplexityClassifierService();

  it('returns simple/general-qa for empty string', () => {
    const result = classifier.classifyComplexity('');
    expect(result.complexityScore).toBe('simple');
    expect(result.taskType).toBe('general-qa');
    expect(result.reasoning).toContain('Empty prompt');
  });

  it('classifies summarization prompts', () => {
    const result = classifier.classifyComplexity(
      'Please summarize this quarterly report in 5 bullet points.',
    );
    expect(result.taskType).toBe('summarization');
    expect(['simple', 'moderate']).toContain(result.complexityScore);
  });

  it('classifies code-generation prompts', () => {
    const result = classifier.classifyComplexity(
      'Write a Python function that sorts a list using merge sort.',
    );
    expect(result.taskType).toBe('code-generation');
    expect(result.reasoning).toBeTruthy();
  });

  it('classifies code blocks as code-generation', () => {
    const result = classifier.classifyComplexity(
      'Refactor this:\n```typescript\nconst x = 1;\n```',
    );
    expect(result.taskType).toBe('code-generation');
  });

  it('classifies reasoning prompts as complex', () => {
    const result = classifier.classifyComplexity(
      'Prove step by step why the square root of 2 is irrational.',
    );
    expect(result.taskType).toBe('reasoning');
    expect(result.complexityScore).toBe('complex');
  });

  it('classifies creative-writing prompts', () => {
    const result = classifier.classifyComplexity(
      'Write a creative story about a robot who learns to paint.',
    );
    expect(result.taskType).toBe('creative-writing');
  });

  it('classifies data-analysis prompts', () => {
    const result = classifier.classifyComplexity(
      'Analyze this CSV dataset and create a chart of monthly revenue trends.',
    );
    expect(result.taskType).toBe('data-analysis');
  });

  it('handles non-English input without throwing', () => {
    const result = classifier.classifyComplexity(
      '请帮我总结这篇文章的主要内容，谢谢。',
    );
    expect(result.complexityScore).toBeTruthy();
    expect(result.taskType).toBeTruthy();
    expect(result.reasoning).toBeTruthy();
  });

  it('handles very long input without hanging', () => {
    const prompt =
      'Prove step by step and summarize this document in detail. '.repeat(5000);
    const start = Date.now();
    const result = classifier.classifyComplexity(prompt);
    expect(Date.now() - start).toBeLessThan(1000);
    expect(result.reasoning).toContain('truncated');
    expect(['moderate', 'complex']).toContain(result.complexityScore);
  });

  it('returns valid taskType from taxonomy for varied prompts', () => {
    const prompts = [
      'What is 2+2?',
      'Debug this SQL query: SELECT * FROM users WHERE id = 1',
      'Write a poem about the ocean',
      'Summarize the meeting notes',
      'Analyze why revenue dropped in Q3 step by step',
    ];

    const validTypes = [
      'summarization',
      'code-generation',
      'creative-writing',
      'data-analysis',
      'general-qa',
      'reasoning',
    ];

    for (const prompt of prompts) {
      const result = classifier.classifyComplexity(prompt);
      expect(validTypes).toContain(result.taskType);
    }
  });
});
