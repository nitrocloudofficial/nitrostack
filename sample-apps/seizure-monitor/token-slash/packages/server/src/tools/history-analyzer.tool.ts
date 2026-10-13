import { Injectable } from '@nitrostack/core';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { HistoryAnalyzerResult, PromptHistoryEntry, SatisfactionModelWeights, SatisfactionMetrics } from '../shared/types.js';
import { recommendModel } from './model-recommender.tool.js';
import { Tool } from './model-recommender.tool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadJsonData(relPath: string) {
  const possiblePaths = [
    path.resolve(process.cwd(), `packages/server/dist/${relPath}`),
    path.resolve(process.cwd(), `packages/server/src/${relPath}`),
    path.resolve(__dirname, `../${relPath}`),
    path.resolve(__dirname, `../../src/${relPath}`),
    path.resolve(process.cwd(), relPath)
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
  }
  throw new Error(`Data file ${relPath} could not be located`);
}

const mockHistoryData = loadJsonData('data/mock-history.json');
const satisfactionModelData = loadJsonData('ml/satisfaction-model.json');

export const analyzeHistorySchema = z.object({
  userId: z.string(),
  currentPrompt: z.string().optional()
});

export type AnalyzeHistoryInput = z.infer<typeof analyzeHistorySchema>;

// Default baseline user profile for unknown / missing user IDs
const DEFAULT_USER_PROFILE: PromptHistoryEntry[] = [
  {
    id: 'hist_def_01',
    userId: 'default_user',
    timestamp: new Date().toISOString(),
    promptText: 'Summarize team meeting notes into key action items.',
    inputTokens: 520,
    outputTokens: 380,
    modelUsed: 'gpt-4o',
    complexityScore: 3,
    taskType: 'summarization',
    retriesCount: 0,
    userSatisfied: true,
    timeToSatisfactionSeconds: 15.0,
    cost: 0.0051
  },
  {
    id: 'hist_def_02',
    userId: 'default_user',
    timestamp: new Date().toISOString(),
    promptText: 'Write a basic python script to parse CSV files.',
    inputTokens: 410,
    outputTokens: 620,
    modelUsed: 'gpt-4o',
    complexityScore: 4,
    taskType: 'code_generation',
    retriesCount: 0,
    userSatisfied: true,
    timeToSatisfactionSeconds: 22.0,
    cost: 0.007225
  },
  {
    id: 'hist_def_03',
    userId: 'default_user',
    timestamp: new Date().toISOString(),
    promptText: 'Explain difference between REST and GraphQL APIs.',
    inputTokens: 340,
    outputTokens: 890,
    modelUsed: 'claude-3-opus',
    complexityScore: 4,
    taskType: 'technical_explanation',
    retriesCount: 0,
    userSatisfied: true,
    timeToSatisfactionSeconds: 28.0,
    cost: 0.02395
  }
];

export class HistoryAnalyzerTool {
  private readonly trainedModel: SatisfactionModelWeights = satisfactionModelData as SatisfactionModelWeights;

  @Tool({
    name: 'analyzeHistory',
    description: 'Analyzes user prompt history, calculates monthly prompt volume, projected savings, user satisfaction metrics, and time-to-satisfaction using a trained ML model.',
    schema: analyzeHistorySchema
  })
  public analyzeHistory(userId: string, currentPrompt?: string): HistoryAnalyzerResult {
    // Fallback to default user profile if userId is not found or empty
    const allHistory = mockHistoryData as PromptHistoryEntry[];
    let userEntries = allHistory.filter(
      (entry) => entry.userId && entry.userId.toLowerCase() === (userId || '').toLowerCase()
    );

    if (!userEntries || userEntries.length === 0) {
      userEntries = DEFAULT_USER_PROFILE;
    }

    const monthlyPromptVolume = userEntries.length;

    let totalActualCost = 0;
    let totalOptimizedCost = 0;

    let totalRetries = 0;
    let totalTimeToSatisfaction = 0;
    let satisfiedCount = 0;

    for (const entry of userEntries) {
      const inputTokens = Math.max(0, isNaN(entry.inputTokens) ? 0 : entry.inputTokens);
      const outputTokens = Math.max(0, isNaN(entry.outputTokens) ? 0 : entry.outputTokens);
      const cost = Math.max(0, isNaN(entry.cost) ? 0 : entry.cost);

      totalActualCost += cost;

      // Run recommendation model on historical entry
      const rec = recommendModel(
        { inputTokens, outputTokens },
        entry.complexityScore || 3,
        entry.taskType || 'general',
        entry.modelUsed || 'gpt-4o'
      );

      totalOptimizedCost += Math.max(0, isNaN(rec.recommendedModelCost) ? 0 : rec.recommendedModelCost);

      totalRetries += Math.max(0, isNaN(entry.retriesCount) ? 0 : entry.retriesCount);
      totalTimeToSatisfaction += Math.max(0, isNaN(entry.timeToSatisfactionSeconds) ? 0 : entry.timeToSatisfactionSeconds);
      if (entry.userSatisfied) {
        satisfiedCount++;
      }
    }

    // Projected Monthly Savings calculation with non-negative, non-absurd bounds
    const rawSavings = totalActualCost - totalOptimizedCost;
    const projectedMonthlySavings = Math.max(
      0,
      Number(Math.min(500, Math.max(0, rawSavings)).toFixed(2))
    );

    const avgSatisfactionRate = Math.round((satisfiedCount / monthlyPromptVolume) * 100) / 100;
    const avgTimeToSatisfactionSec = Math.round((totalTimeToSatisfaction / monthlyPromptVolume) * 10) / 10;
    const avgRetries = totalRetries / monthlyPromptVolume;

    // Use ML trained model weights to score user satisfaction & efficiency
    const { intercept, featureWeights, mlpWeights, normalizationMeans, normalizationStds } = this.trainedModel as any;
    const avgComplexity = userEntries.reduce((acc, e) => acc + (e.complexityScore || 3), 0) / monthlyPromptVolume;
    const avgTokens = userEntries.reduce((acc, e) => acc + (e.inputTokens + e.outputTokens), 0) / (monthlyPromptVolume * 1000);
    const avgMismatch = userEntries.reduce((acc, e) => {
      const getTierNum = (m: string) => {
        if (["gpt-4o-mini", "gemini-3.1-flash-lite", "claude-3-5-haiku"].includes(m)) return 1;
        if (["gemini-3.5-flash", "claude-3-5-sonnet", "gpt-4o"].includes(m)) return 2;
        if (["gemini-3.1-pro", "claude-3-opus"].includes(m)) return 3;
        return 4;
      };
      const needed = e.complexityScore <= 3 ? 1 : e.complexityScore <= 6 ? 2 : e.complexityScore <= 8 ? 3 : 4;
      return acc + Math.max(0, getTierNum(e.modelUsed || 'gpt-4o') - needed);
    }, 0) / monthlyPromptVolume;

    const avgExpansionRatio = userEntries.reduce((acc, e) => acc + (e.outputTokens / Math.max(1, e.inputTokens)), 0) / monthlyPromptVolume;
    const avgCodeDensity = userEntries.reduce((acc, e) => acc + (/code|function|bug|class|sql|script/i.test(e.taskType || '') ? 1 : 0), 0) / monthlyPromptVolume;

    const avgSpecificity = userEntries.reduce((acc, e) => {
      const text = e.promptText || '';
      let spec = 0.0;
      if (/step\s*-?\s*by\s*-?\s*step|format|json|table|bullet|list|schema|markdown|regex|strict/i.test(text)) spec += 1.5;
      if (/\?|:|```|\*/.test(text)) spec += 1.0;
      if (text.length > 80) spec += 0.5;
      return acc + Math.min(3.0, spec);
    }, 0) / monthlyPromptVolume;

    const avgInteractionPenalty = (avgComplexity / 10.0) * (avgMismatch * 2.0);
    const avgCostEfficiency = userEntries.reduce((acc, e) => {
      const tokens = (e.inputTokens + e.outputTokens) / 1000.0;
      return acc + (e.cost / Math.max(0.001, tokens));
    }, 0) / monthlyPromptVolume;

    // Compute User Personal Requirement Vector features (f9 - f12)
    const getTierNum = (m: string) => {
      if (["gpt-4o-mini", "gemini-3.1-flash-lite", "claude-3-5-haiku"].includes(m)) return 1;
      if (["gemini-3.5-flash", "claude-3-5-sonnet", "gpt-4o"].includes(m)) return 2;
      if (["gemini-3.1-pro", "claude-3-opus"].includes(m)) return 3;
      return 4;
    };
    const userAvgTierPreference = userEntries.reduce((acc, e) => acc + getTierNum(e.modelUsed || 'gpt-4o'), 0) / monthlyPromptVolume;
    const userCodeRatio = avgCodeDensity;
    const userAvgVerbosity = avgExpansionRatio;
    const userPromptStructure = avgSpecificity;

    const rawFeatures = [
      avgComplexity, avgTokens, avgMismatch, avgRetries, avgExpansionRatio, avgCodeDensity, avgSpecificity, avgInteractionPenalty, avgCostEfficiency,
      userAvgTierPreference, userCodeRatio, userAvgVerbosity, userPromptStructure
    ];

    let p_lr = 0.5;
    let scaledFeatures = rawFeatures;
    if (normalizationMeans && normalizationStds && normalizationMeans.length === rawFeatures.length) {
      scaledFeatures = rawFeatures.map((v, i) => (v - normalizationMeans[i]) / (normalizationStds[i] || 1));
      let z_lr = intercept || 0;
      z_lr += scaledFeatures[0] * (featureWeights.complexityScore || 0) +
        scaledFeatures[1] * (featureWeights.tokenVolume || 0) +
        scaledFeatures[2] * (featureWeights.tierMismatch || 0) +
        scaledFeatures[3] * (featureWeights.retryCountPenalty || 0) +
        scaledFeatures[4] * (featureWeights.responseExpansionRatio || 0) +
        scaledFeatures[5] * (featureWeights.codeDensity || 0) +
        scaledFeatures[6] * (featureWeights.promptSpecificity || 0) +
        scaledFeatures[7] * (featureWeights.interactionMismatchPenalty || 0) +
        scaledFeatures[8] * (featureWeights.costEfficiency || 0) +
        scaledFeatures[9] * (featureWeights.userAvgTierPreference || 0) +
        scaledFeatures[10] * (featureWeights.userCodeRatio || 0) +
        scaledFeatures[11] * (featureWeights.userAvgVerbosity || 0) +
        scaledFeatures[12] * (featureWeights.userPromptStructure || 0);
      p_lr = 1.0 / (1.0 + Math.exp(-Math.max(-20, Math.min(20, z_lr))));
    } else {
      let z_lr = (intercept || 0) + rawFeatures[0] * (featureWeights.complexityScore || 0) +
        rawFeatures[1] * (featureWeights.tokenVolume || 0) +
        rawFeatures[2] * (featureWeights.tierMismatch || 0) +
        rawFeatures[3] * (featureWeights.retryCountPenalty || 0);
      p_lr = 1.0 / (1.0 + Math.exp(-Math.max(-20, Math.min(20, z_lr))));
    }

    let p_final = p_lr;
    if (mlpWeights && mlpWeights.hiddenLayerWeights && mlpWeights.outputLayerWeights) {
      const { hiddenLayerWeights, hiddenLayerBiases, outputLayerWeights, outputLayerBias } = mlpWeights;
      const hiddenSize = hiddenLayerWeights.length;
      const h = new Array(hiddenSize);
      for (let k = 0; k < hiddenSize; k++) {
        let z_k = hiddenLayerBiases[k] || 0;
        for (let j = 0; j < scaledFeatures.length; j++) {
          z_k += (hiddenLayerWeights[k][j] || 0) * scaledFeatures[j];
        }
        h[k] = 1.0 / (1.0 + Math.exp(-Math.max(-20, Math.min(20, z_k))));
      }
      let z_out = outputLayerBias || 0;
      for (let k = 0; k < hiddenSize; k++) {
        z_out += (outputLayerWeights[k] || 0) * h[k];
      }
      const p_mlp = 1.0 / (1.0 + Math.exp(-Math.max(-20, Math.min(20, z_out))));
      p_final = 0.5 * p_lr + 0.5 * p_mlp;
    }

    const satisfactionScore = Math.round(
      Math.max(0, Math.min(100, p_final * 100))
    );

    let recommendedAdjustment = 'Optimal model selection matching query complexity.';
    if (projectedMonthlySavings > 10) {
      recommendedAdjustment = `Switching light/standard complexity tasks to lightweight models can reduce costs by up to $${projectedMonthlySavings}/month without compromising accuracy.`;
    } else if (avgTimeToSatisfactionSec > 60) {
      recommendedAdjustment = 'Consider using faster response models to reduce user iteration time to satisfaction.';
    }

    const targetUser = userId || 'User';
    const userPatternSummary = `User '${targetUser}' logged ${monthlyPromptVolume} prompts this month. Average prompt complexity: ${avgComplexity.toFixed(1)}/10. Average time to satisfaction: ${avgTimeToSatisfactionSec}s. Model optimization yields projected monthly savings of $${projectedMonthlySavings.toFixed(2)} (${Math.round((projectedMonthlySavings / (totalActualCost || 1)) * 100)}% cost reduction) with a ${satisfactionScore}% ML satisfaction index.`;

    const satisfactionMetrics: SatisfactionMetrics = {
      avgSatisfactionRate,
      avgTimeToSatisfactionSec,
      satisfactionScore,
      recommendedAdjustment
    };

    return {
      monthlyPromptVolume,
      projectedMonthlySavings,
      userPatternSummary,
      satisfactionMetrics
    };
  }
}

// Standalone function export matching expected prompt signature: analyzeHistory(userId, currentPrompt)
const historyAnalyzerInstance = new HistoryAnalyzerTool();
export function analyzeHistory(userId: string, currentPrompt?: string): HistoryAnalyzerResult {
  return historyAnalyzerInstance.analyzeHistory(userId, currentPrompt);
}

@Injectable()
export class HistoryAnalyzerService {
  analyzeHistory(userId: string, currentPrompt?: string): HistoryAnalyzerResult {
    return analyzeHistory(userId, currentPrompt);
  }
}

