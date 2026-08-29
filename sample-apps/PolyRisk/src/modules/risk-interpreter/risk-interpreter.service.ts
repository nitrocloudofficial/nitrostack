import { Injectable } from '@nitrostack/core';
import { Disease, FilterEvidenceResult } from '../../types.js';

export type RiskTier = 'low' | 'moderate' | 'high';

export interface RiskInterpretation {
  disease: Disease;
  tier: RiskTier;
  prsScore: number;
  zScore: number;
  percentileApprox: number;
  confidenceLevel: 'low' | 'moderate' | 'high';
  confidenceReason: string;
  description: string;
}

export interface PopulationParameters {
  mean: number;
  sd: number;
}

const DEFAULT_POPULATION_PARAMS: Record<Disease, PopulationParameters> = {
  type2_diabetes: { mean: 0.80, sd: 0.35 },
  coronary_artery_disease: { mean: 0.45, sd: 0.20 },
  age_related_macular_degeneration: { mean: 1.10, sd: 0.55 },
};

const DISEASE_LABELS: Record<Disease, string> = {
  type2_diabetes: 'Type 2 Diabetes',
  coronary_artery_disease: 'Coronary Artery Disease',
  age_related_macular_degeneration: 'Age-Related Macular Degeneration',
};

@Injectable()
export class RiskInterpreterService {
  private populationParams: Record<Disease, PopulationParameters> = { ...DEFAULT_POPULATION_PARAMS };

  /**
   * Set custom population parameters (mean and standard deviation) for a disease.
   */
  public setPopulationParams(disease: Disease, params: PopulationParameters): void {
    this.populationParams[disease] = params;
  }

  /**
   * Get population parameters for a disease.
   */
  public getPopulationParams(disease: Disease): PopulationParameters {
    return this.populationParams[disease] ?? { mean: 0.60, sd: 0.30 };
  }

  /**
   * Converts a raw PRS score and evidence filter result into a RiskInterpretation structure.
   */
  public interpret(
    prsResult: any,
    filterResult?: FilterEvidenceResult,
    topLevelDisease?: Disease
  ): RiskInterpretation {
    const disease = (prsResult?.disease ?? filterResult?.disease ?? topLevelDisease ?? 'type2_diabetes') as Disease;
    const params = this.getPopulationParams(disease);

    const totalScore = prsResult?.totalScore ?? 0;
    const zScore = params.sd > 0
      ? (totalScore - params.mean) / params.sd
      : 0;

    const tier: RiskTier = zScore < -0.5 ? 'low' : zScore > 0.5 ? 'high' : 'moderate';
    
    // Percentile approximation using hyperbolic tangent sigmoidal mapping for normal distribution
    const percentileApprox = Math.min(99, Math.max(1, Math.round((0.5 + 0.5 * Math.tanh(zScore * 0.8)) * 100)));

    let confidenceLevel: 'low' | 'moderate' | 'high' = 'moderate';
    let confidenceReason = '';

    const variantsIncluded = prsResult?.variantsIncluded ?? prsResult?.contributions?.length ?? 0;
    const totalFiltered = filterResult?.total ?? variantsIncluded;
    const includedCount = filterResult?.includedCount ?? variantsIncluded;
    const inclusionRate = totalFiltered > 0 ? includedCount / totalFiltered : 1;

    if (variantsIncluded < 2 || inclusionRate < 0.4) {
      confidenceLevel = 'low';
      confidenceReason = `Only ${variantsIncluded} variant(s) passed evidence filtering (${includedCount}/${totalFiltered} total). With so few variants, the score may not capture the full genetic architecture.`;
    } else if (variantsIncluded < 4 || inclusionRate < 0.7 || prsResult?.genotypeAssumed) {
      confidenceLevel = 'moderate';
      confidenceReason = `${variantsIncluded} variant(s) included (${includedCount}/${totalFiltered} passed filtering)${prsResult?.genotypeAssumed ? '; genotype assumed as heterozygous (1 allele) since exact genotype was not provided' : ''}. Score is informative but not comprehensive.`;
    } else {
      confidenceLevel = 'high';
      confidenceReason = `${variantsIncluded} variants included with high filtering pass rate (${includedCount}/${totalFiltered}), all with real genotype data and GWS-significant evidence.`;
    }

    const diseaseName = DISEASE_LABELS[disease] ?? disease;
    const tierDescriptions: Record<RiskTier, string> = {
      low: `Your Polygenic Risk Score (PRS) is below the population average for ${diseaseName}. This indicates a lower-than-average genetic predisposition based on the variants analyzed. This does NOT guarantee zero risk — non-genetic factors such as lifestyle, environment, and non-assessed variants play crucial roles.`,
      moderate: `Your Polygenic Risk Score (PRS) is near the population average for ${diseaseName}. The genetic variants analyzed do not indicate substantially elevated or reduced genetic predisposition compared to the general population.`,
      high: `Your Polygenic Risk Score (PRS) is above the population average for ${diseaseName}. This indicates a higher-than-average genetic predisposition based on the variants analyzed. This is NOT a diagnostic prediction — many individuals with elevated genetic risk never develop the condition, and modifiable lifestyle factors significantly modulate actual risk.`,
    };

    return {
      disease,
      tier,
      prsScore: Math.round(totalScore * 10000) / 10000,
      zScore: Math.round(zScore * 100) / 100,
      percentileApprox,
      confidenceLevel,
      confidenceReason,
      description: tierDescriptions[tier],
    };
  }

  /**
   * Explains what a specific risk tier means in public-facing educational language.
   */
  public explainTier(disease: Disease, tier: RiskTier): string {
    const name = DISEASE_LABELS[disease] ?? disease;
    switch (tier) {
      case 'low':
        return `Low Tier for ${name}: Your score falls in the lower percentile of population distribution. Genetic predisposition is lower than average, though modifiable factors remain key.`;
      case 'moderate':
        return `Moderate Tier for ${name}: Your score falls in the middle range of population distribution. Genetic risk is typical for the population.`;
      case 'high':
        return `High Tier for ${name}: Your score falls in the upper percentile of population distribution. Elevated genetic predisposition warrants proactive lifestyle management.`;
      default:
        return `Risk tier for ${name}: ${tier}`;
    }
  }
}
