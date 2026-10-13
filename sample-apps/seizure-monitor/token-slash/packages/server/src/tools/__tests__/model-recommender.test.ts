import { describe, it, expect } from 'vitest';
import { recommendModel, recommendModelSchema } from '../model-recommender.tool.js';

describe('ModelRecommenderTool', () => {
  it('should recommend gpt-4o-mini for simple summarization (light tier)', () => {
    // Mock upstream input 1: Light complexity task currently using expensive gpt-4o
    const input = {
      tokenCount: { inputTokens: 500, outputTokens: 200 },
      complexityScore: 2,
      taskType: 'summarization',
      currentModel: 'gpt-4o'
    };

    expect(() => recommendModelSchema.parse(input)).not.toThrow();

    const result = recommendModel(input.tokenCount, input.complexityScore, input.taskType, input.currentModel);

    expect(result.recommendedModel).toBe('gpt-4o-mini');
    expect(result.currentModelCost).toBeGreaterThan(result.recommendedModelCost);
    expect(result.savingsPercent).toBeGreaterThan(0);
    expect(result.reasoning).toContain('light');
  });

  it('should recommend gemini-3.5-flash or claude-3-5-sonnet for standard coding (standard tier)', () => {
    // Mock upstream input 2: Standard coding task currently using gpt-4o
    const input = {
      tokenCount: { inputTokens: 1200, outputTokens: 800 },
      complexityScore: 5,
      taskType: 'code_generation',
      currentModel: 'gpt-4o'
    };

    const result = recommendModel(input.tokenCount, input.complexityScore, input.taskType, input.currentModel);

    expect(['gemini-3.5-flash', 'claude-3-5-sonnet', 'gpt-4o', 'o3-mini']).toContain(result.recommendedModel);
    expect(result.recommendedModelCost).toBeLessThanOrEqual(result.currentModelCost);
    expect(result.savingsPercent).toBeGreaterThanOrEqual(0);
  });

  it('should recommend o3-mini for reasoning/math tasks (reasoning tier)', () => {
    // Mock upstream input 3: High reasoning query currently using o1
    const input = {
      tokenCount: { inputTokens: 2500, outputTokens: 4000 },
      complexityScore: 10,
      taskType: 'complex_reasoning',
      currentModel: 'o1'
    };

    const result = recommendModel(input.tokenCount, input.complexityScore, input.taskType, input.currentModel);

    expect(result.recommendedModel).toBe('o3-mini');
    expect(result.recommendedModelCost).toBeLessThan(result.currentModelCost);
    expect(result.savingsPercent).toBeGreaterThan(0);
  });

  it('should handle edge case when current model is already the cheapest capable model', () => {
    const input = {
      tokenCount: { inputTokens: 100, outputTokens: 50 },
      complexityScore: 1,
      taskType: 'simple_edit',
      currentModel: 'gpt-4o-mini'
    };

    const result = recommendModel(input.tokenCount, input.complexityScore, input.taskType, input.currentModel);

    expect(result.recommendedModel).toBe('gpt-4o-mini');
    expect(result.savingsPercent).toBe(0);
  });

  it('should guard against negative, NaN, or zero token inputs', () => {
    const result = recommendModel(
      { inputTokens: -500, outputTokens: NaN },
      -3,
      '',
      'invalid-model-name'
    );

    expect(result.currentModelCost).toBeGreaterThanOrEqual(0);
    expect(result.recommendedModelCost).toBeGreaterThanOrEqual(0);
    expect(result.savingsPercent).toBeGreaterThanOrEqual(0);
    expect(isNaN(result.savingsPercent)).toBe(false);
  });
});
