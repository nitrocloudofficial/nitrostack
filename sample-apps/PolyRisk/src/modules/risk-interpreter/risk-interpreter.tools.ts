import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { RiskInterpreterService } from './risk-interpreter.service.js';
import { Disease } from '../../types.js';
import { RiskTier } from './risk-interpreter.service.js';

const SUPPORTED_DISEASES = ['type2_diabetes', 'coronary_artery_disease', 'age_related_macular_degeneration'] as const;

export class RiskInterpreterTools {
  private service = new RiskInterpreterService();

  @Tool({
    name: 'interpret_risk',
    description:
      'Converts a raw PRS score into a risk tier (low / moderate / high relative to population average) with an explicit confidence level. Framing relative risk with population percentiles and stated uncertainty.',
    inputSchema: z.object({
      disease: z.enum(SUPPORTED_DISEASES).optional().describe('Target disease condition'),
      prsResult: z.object({
        disease: z.enum(SUPPORTED_DISEASES).optional(),
        totalScore: z.number(),
        variantsIncluded: z.number(),
        genotypeAssumed: z.boolean().optional(),
        contributions: z.array(z.any()).optional(),
      }).describe('Output of calculate_prs'),
      filterResult: z.object({
        disease: z.enum(SUPPORTED_DISEASES).optional(),
        total: z.number(),
        includedCount: z.number(),
        excludedCount: z.number(),
        ancestryNote: z.string().nullable().optional(),
        allDecisions: z.array(z.any()).optional(),
      }).optional().describe('Output of filter_evidence (for confidence calculation)'),
    }),
  })
  async interpretRisk(input: any, ctx: ExecutionContext) {
    const disease = input.disease ?? input.prsResult?.disease ?? input.filterResult?.disease;
    ctx.logger.info('Executing interpret_risk tool', { disease });
    return this.service.interpret(input.prsResult, input.filterResult, disease);
  }

  @Tool({
    name: 'explain_risk_tier',
    description:
      'Returns a clear, evidence-framed explanation of what a specific risk tier (low, moderate, high) implies for a target disease.',
    inputSchema: z.object({
      disease: z.enum(SUPPORTED_DISEASES).describe('Target disease condition'),
      tier: z.enum(['low', 'moderate', 'high']).describe('Risk tier to explain'),
    }),
  })
  async explainRiskTier(input: { disease: Disease; tier: RiskTier }, ctx: ExecutionContext) {
    ctx.logger.info('Explaining risk tier', { disease: input.disease, tier: input.tier });
    return {
      disease: input.disease,
      tier: input.tier,
      explanation: this.service.explainTier(input.disease, input.tier),
    };
  }

  @Tool({
    name: 'get_population_percentile',
    description:
      'Calculates the estimated population percentile and Z-score for a given raw Polygenic Risk Score (PRS) and disease.',
    inputSchema: z.object({
      disease: z.enum(SUPPORTED_DISEASES).describe('Target disease condition'),
      score: z.number().describe('Raw Polygenic Risk Score value'),
    }),
  })
  async getPopulationPercentile(input: { disease: Disease; score: number }, ctx: ExecutionContext) {
    ctx.logger.info('Calculating population percentile', { disease: input.disease, score: input.score });
    const dummyPrsResult = {
      disease: input.disease,
      totalScore: input.score,
      contributions: [],
      variantsIncluded: 5,
      genotypeAssumed: false,
    };
    const interpretation = this.service.interpret(dummyPrsResult);
    return {
      disease: input.disease,
      score: input.score,
      zScore: interpretation.zScore,
      percentileApprox: interpretation.percentileApprox,
      tier: interpretation.tier,
    };
  }
}
