import { ToolDecorator as Tool, z } from '@nitrostack/core';
import { getCollection } from '../mongodb.js';
import { bestPatternMatch, buildFindingSummary } from '../utils/similarity.js';

function findGuidelineMatches(guidelines: any[], labValues: Record<string, number | null>) {
  const explanations: string[] = [];

  for (const guideline of guidelines) {
    if (guideline.trigger && typeof guideline.trigger === 'string') {
      const trigger = guideline.trigger.toLowerCase();
      if (trigger.includes('insulin') && labValues.Insulin !== null && labValues.Insulin !== undefined) {
        explanations.push(guideline.explanation || guideline.summary || guideline.description || 'Insulin-related guideline applies.');
      }
      if (trigger.includes('testosterone') && labValues.Testosterone !== null && labValues.Testosterone !== undefined) {
        explanations.push(guideline.explanation || guideline.summary || guideline.description || 'Testosterone-related guideline applies.');
      }
      if (trigger.includes('vitamin d') && labValues.VitaminD !== null && labValues.VitaminD !== undefined) {
        explanations.push(guideline.explanation || guideline.summary || guideline.description || 'Vitamin D guideline applies.');
      }
    }
  }

  return explanations.length ? Array.from(new Set(explanations)) : ['Analysis is based on available laboratory values and reference guidance.'];
}

function selectRecommendation(plans: any[], labValues: Record<string, number | null>, type: 'diet' | 'exercise') {
  if (!plans.length) {
    return {
      summary: `No ${type} plans are available in the database.`,
      details: []
    };
  }

  const key = labValues.Insulin && labValues.Insulin > 15 ? 'insulin' : labValues.HbA1c && labValues.HbA1c > 5.7 ? 'glycemic' : 'general';
  const plan = plans.find((item) => {
    const focus = typeof item.focus === 'string' ? item.focus.toLowerCase() : '';
    return focus.includes(key);
  }) || plans[0];

  return {
    title: plan.title || plan.name || `${type.charAt(0).toUpperCase() + type.slice(1)} recommendation`,
    summary: plan.summary || plan.description || 'A recommended plan from the reference database.',
    focus: plan.focus || key,
    source: plan.source || null
  };
}

export class AnalyzePCOSTool {
  @Tool({
    name: 'analyzePCOS',
    description: 'Analyze temporary hormone lab values against reference cycle patterns and guidelines',
    inputSchema: z.object({
      lab_values: z.record(z.string(), z.number().nullable())
    })
  })
  async analyzePCOS(input: any) {
    const labValues: Record<string, number | null> = input.lab_values || {};
    const cycleCollection = await getCollection<any>('cycle_patterns');
    const guidelineCollection = await getCollection<any>('pcos_guidelines');
    const dietCollection = await getCollection<any>('diet_plans');
    const exerciseCollection = await getCollection<any>('exercise_plans');

    const [patterns, guidelines, dietPlans, exercisePlans] = await Promise.all([
      cycleCollection.find({}).limit(10).toArray(),
      guidelineCollection.find({}).limit(20).toArray(),
      dietCollection.find({}).limit(20).toArray(),
      exerciseCollection.find({}).limit(20).toArray()
    ]);

    const matchedTrend = bestPatternMatch(patterns, labValues);
    const explanations = findGuidelineMatches(guidelines, labValues);
    const dietRecommendation = selectRecommendation(dietPlans, labValues, 'diet');
    const exerciseRecommendation = selectRecommendation(exercisePlans, labValues, 'exercise');

    const summary = buildFindingSummary(labValues, matchedTrend, explanations);
    const confidenceScore = Math.round(Math.min(100, 50 + (matchedTrend?.score ?? 0) * 25 + explanations.length * 5));

    return {
      summary,
      matched_trends: matchedTrend ? [matchedTrend] : [],
      explanations,
      diet_recommendation: dietRecommendation,
      exercise_recommendation: exerciseRecommendation,
      confidence_score: confidenceScore
    };
  }
}
