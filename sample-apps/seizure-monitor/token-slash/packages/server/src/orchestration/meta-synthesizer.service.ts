import { Injectable } from '@nitrostack/core';
import type {
  CostComparison,
  FinalReport,
  ModuleAvailability,
  ModuleErrors,
  SynthesisInput,
} from '../shared/types.js';
import { DEFAULT_CURRENT_MODEL } from '../shared/types.js';

const UNAVAILABLE = 'unavailable';

@Injectable()
export class MetaSynthesizerService {
  synthesizeReport(input: SynthesisInput): FinalReport {
    const availability = this.buildAvailability(input);
    const errors = this.buildErrors(input);

    const complexityScore = input.complexity.data?.complexityScore ?? 'simple';
    const taskType = input.complexity.data?.taskType ?? 'general-qa';
    const tokenCount = input.tokenEstimate.data?.tokenCount ?? 0;

    const rewrite = input.rewrite.data;
    const modelRec = input.modelRecommendation.data;
    const history = input.history.data;

    const optimizedPrompt =
      rewrite?.optimizedPrompt ??
      (availability.rewrite ? input.originalPrompt : UNAVAILABLE);

    const tokenSavingsPercent = rewrite?.tokenSavingsPercent ?? 0;
    const recommendedModel = modelRec?.recommendedModel ?? UNAVAILABLE;

    const costComparison = this.buildCostComparison(
      modelRec,
      history?.monthlyPromptVolume ?? 0,
    );

    const monthlySavings = history?.projectedMonthlySavings ?? 0;

    return {
      originalPrompt: input.originalPrompt,
      optimizedPrompt,
      tokenSavingsPercent,
      recommendedModel,
      costComparison,
      monthlySavings,
      tokenCount,
      complexityScore,
      taskType,
      modelRecommendationReasoning:
        modelRec?.reasoning ?? 'Model recommendation unavailable.',
      userPatternSummary:
        history?.userPatternSummary ?? 'History analysis unavailable.',
      monthlyPromptVolume: history?.monthlyPromptVolume ?? 0,
      availability,
      errors,
      generatedAt: new Date().toISOString(),
    };
  }

  private buildAvailability(input: SynthesisInput): ModuleAvailability {
    return {
      tokenEstimate: input.tokenEstimate.ok,
      complexity: input.complexity.ok,
      modelRecommendation: input.modelRecommendation.ok,
      history: input.history.ok,
      rewrite: input.rewrite.ok,
    };
  }

  private buildErrors(input: SynthesisInput): ModuleErrors {
    const errors: ModuleErrors = {};

    if (!input.tokenEstimate.ok) {
      errors.tokenEstimate = input.tokenEstimate.error ?? 'Token estimate failed';
    }
    if (!input.complexity.ok) {
      errors.complexity = input.complexity.error ?? 'Complexity classification failed';
    }
    if (!input.modelRecommendation.ok) {
      errors.modelRecommendation =
        input.modelRecommendation.error ?? 'Model recommendation failed';
    }
    if (!input.history.ok) {
      errors.history = input.history.error ?? 'History analysis failed';
    }
    if (!input.rewrite.ok) {
      errors.rewrite = input.rewrite.error ?? 'Prompt rewrite failed';
    }

    return errors;
  }

  private buildCostComparison(
    modelRec: SynthesisInput['modelRecommendation']['data'],
    monthlyVolume: number,
  ): CostComparison {
    const currentModel = DEFAULT_CURRENT_MODEL;
    const recommendedModel = modelRec?.recommendedModel ?? UNAVAILABLE;

    const currentCostPerRequest = modelRec?.currentModelCost ?? 0;
    const recommendedCostPerRequest = modelRec?.recommendedModelCost ?? 0;

    const volume = Math.max(monthlyVolume, 1);
    const currentMonthlyCost = Number((currentCostPerRequest * volume).toFixed(4));
    const recommendedMonthlyCost = Number(
      (recommendedCostPerRequest * volume).toFixed(4),
    );

    const savingsPercent = modelRec?.savingsPercent ?? 0;

    return {
      currentModel,
      recommendedModel,
      currentCostPerRequest,
      recommendedCostPerRequest,
      currentMonthlyCost,
      recommendedMonthlyCost,
      savingsPercent,
    };
  }
}
