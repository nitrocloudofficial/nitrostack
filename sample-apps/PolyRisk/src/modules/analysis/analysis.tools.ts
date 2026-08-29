import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import { VariantService } from '../variant/variant.service.js';
import { GWASCatalogService } from '../evidence/gwas-catalog.service.js';
import { PubMedService } from '../evidence/pubmed.service.js';
import { EvidenceFilterEngine } from '../evidence/evidence-filter.engine.js';

import { SampleSet } from '../../types.js';

const variantService = new VariantService();
const gwasService = new GWASCatalogService();
const pubmedService = new PubMedService();
const filterEngine = new EvidenceFilterEngine();

const DISEASE_LABELS: Record<string, string> = {
  type2_diabetes: 'Type 2 Diabetes',
  coronary_artery_disease: 'Coronary Artery Disease',
  age_related_macular_degeneration: 'Age-Related Macular Degeneration',
};

const PRS_POP_PARAMS: Record<string, { mean: number; sd: number }> = {
  type2_diabetes:                    { mean: 0.80, sd: 0.35 },
  coronary_artery_disease:           { mean: 0.45, sd: 0.20 },
  age_related_macular_degeneration:  { mean: 1.10, sd: 0.55 },
};

const LIFESTYLE: Record<string, Array<{ category: string; description: string }>> = {
  type2_diabetes: [
    { category: 'Diet', description: 'Reducing refined carbohydrates, sugar-sweetened beverages, and processed foods; increasing dietary fiber is associated with lower T2D risk.' },
    { category: 'Physical activity', description: '150 min/week of moderate aerobic exercise substantially reduces T2D incidence independent of weight loss.' },
    { category: 'Weight management', description: 'A 5–7% reduction in body weight in people with prediabetes reduces progression to T2D by ~58% (Diabetes Prevention Program).' },
    { category: 'Sleep', description: 'Consistently poor sleep quality is associated with impaired glucose tolerance and increased T2D risk.' },
    { category: 'Smoking', description: 'Smoking cessation is associated with improved insulin sensitivity and reduced T2D risk over time.' },
  ],
  coronary_artery_disease: [
    { category: 'Smoking', description: 'Smoking is one of the strongest modifiable risk factors for CAD. Cessation substantially reduces risk within years.' },
    { category: 'Blood lipids', description: 'LDL cholesterol management through diet, exercise, or medication is central to CAD prevention.' },
    { category: 'Blood pressure', description: 'Hypertension management through diet (reduced sodium, DASH diet) and exercise reduces CAD events.' },
    { category: 'Physical activity', description: 'Regular aerobic exercise reduces multiple CAD risk factors simultaneously (blood pressure, lipids, weight, inflammation).' },
    { category: 'Diet', description: 'Mediterranean-style diet patterns are associated with reduced cardiovascular risk in multiple large trials.' },
  ],
  age_related_macular_degeneration: [
    { category: 'Smoking', description: 'Smoking is the strongest modifiable AMD risk factor — smokers have 2–4× higher risk, and benefit from cessation at any age.' },
    { category: 'Diet / antioxidants', description: 'The AREDS2 formulation (vitamins C, E, zinc, lutein, zeaxanthin) reduces progression risk in intermediate-to-advanced AMD.' },
    { category: 'UV exposure', description: 'Protective eyewear reducing UV-B and blue light exposure is recommended, particularly outdoors.' },
    { category: 'Blood pressure', description: 'Hypertension is associated with AMD progression; blood pressure management may reduce risk.' },
    { category: 'BMI and exercise', description: 'Obesity and sedentary lifestyle are associated with increased AMD risk; regular exercise has protective associations.' },
  ],
};

const DISCLAIMER = 'IMPORTANT: PolyRisk is an educational and evidence-transparency tool, NOT a diagnostic or medical device. This analysis does not diagnose any disease, predict your personal health outcomes, or replace professional medical advice. Polygenic risk scores represent statistical tendencies across populations — they cannot predict whether any individual will or will not develop a disease. If you have health concerns, please consult a qualified healthcare provider.';

export class AnalysisTools {
  @Tool({
    name: 'run_full_analysis',
    description:
      'One-shot pipeline: runs all 8 PolyRisk steps in a single call. Provide a sample set key (T2D_SAMPLE, CAD_SAMPLE, or AMD_SAMPLE) and optionally your ancestry background. Returns a complete PolyRiskReport — risk tier, confidence level, per-variant PRS breakdown, real PubMed citations, lifestyle context, and disclaimer. Identical output to running parse_variants → fetch_gwas_associations → filter_evidence → calculate_prs → fetch_citations → interpret_risk → get_lifestyle_context → generate_report in sequence.',
    inputSchema: z.object({
      sampleSet: z
        .enum(['T2D_SAMPLE', 'CAD_SAMPLE', 'AMD_SAMPLE'])
        .describe('Pre-built sample set for one of the three supported diseases'),
      userAncestry: z
        .string()
        .optional()
        .describe('Your ancestry background (e.g. European, East Asian, South Asian). Improves ancestry-aware filtering.'),
    }),
    examples: {
      request: { sampleSet: 'T2D_SAMPLE' },
      response: {
        disease: 'type2_diabetes',
        diseaseName: 'Type 2 Diabetes',
        riskInterpretation: { tier: 'moderate', prsScore: 0.85, percentileApprox: 56, confidenceLevel: 'moderate' },
      },
    },
  })
  @Widget('risk-report')
  async runFullAnalysis(input: any, ctx: ExecutionContext) {
    const sampleSetKey = input.sampleSet as SampleSet;
    const userAncestry: string | null = input.userAncestry ?? null;

    // 1. Parse variants
    ctx.logger.info('run_full_analysis: expanding sample set', { sampleSet: sampleSetKey });
    const sample = variantService.expandSampleSet(sampleSetKey as import('../../types.js').SampleSet);
    const variants = variantService.validateRsids(sample.rsids);
    const validVariants = variants.filter((v: any) => v.isValid);
    const disease = sample.disease as string;

    // 2. Fetch GWAS associations
    ctx.logger.info('run_full_analysis: fetching GWAS associations', { variantCount: validVariants.length, disease });
    const allAssociations: any[] = [];
    for (const v of validVariants) {
      try {
        const assocs = await gwasService.getAssociationsForVariant(v.normalizedRsid, disease as any);
        allAssociations.push(...assocs);
      } catch (e: any) {
        ctx.logger.warn('Skipping variant — GWAS fetch failed', { rsid: v.rsid, error: e.message });
      }
    }

    // 3. Filter evidence
    ctx.logger.info('run_full_analysis: filtering evidence', { candidates: allAssociations.length });
    const decisions = filterEngine.filter(allAssociations, userAncestry);
    const included = decisions.filter((d: any) => d.decision === 'included');
    const excluded = decisions.filter((d: any) => d.decision === 'excluded');
    const filterResult = {
      disease,
      total: decisions.length,
      includedCount: included.length,
      excludedCount: excluded.length,
      ancestryNote: userAncestry ? `Ancestry context applied: ${userAncestry}` : null,
      allDecisions: decisions,
    };

    // 4. Calculate PRS (log(OR) × 1 allele assumed)
    ctx.logger.info('run_full_analysis: calculating PRS', { includedVariants: included.length });
    const contributions: any[] = [];
    let totalScore = 0;
    for (const d of included as any[]) {
      let effectSize: number;
      let effectType: string;
      if (d.effectType === 'OR' && d.effectSize > 0) {
        effectSize = Math.log(d.effectSize);
        effectType = 'OR_log';
      } else if (d.effectType === 'beta') {
        effectSize = d.effectSize;
        effectType = 'beta';
      } else {
        continue;
      }
      const contribution = effectSize * 1;
      totalScore += contribution;
      contributions.push({
        rsid: d.rsid, riskAllele: d.riskAllele ?? '',
        genotypeAlleleCount: 1, weight: effectSize, effectType, contribution,
        studyAccession: d.studyAccession ?? '', pubmedId: d.pubmedId ?? '',
      });
    }
    const prsResult = {
      disease,
      totalScore: Math.round(totalScore * 10000) / 10000,
      contributions,
      variantsIncluded: contributions.length,
      genotypeAssumed: true,
    };

    // 5. Fetch citations
    const pubmedIds = [...new Set((included as any[]).map((d: any) => d.pubmedId).filter(Boolean))] as string[];
    ctx.logger.info('run_full_analysis: fetching citations', { count: pubmedIds.length });
    const citations = await pubmedService.getCitations(pubmedIds);

    // 6. Interpret risk
    const params = PRS_POP_PARAMS[disease] ?? { mean: 0.6, sd: 0.3 };
    const zScore = params.sd > 0 ? (prsResult.totalScore - params.mean) / params.sd : 0;
    const tier = zScore < -0.5 ? 'low' : zScore > 0.5 ? 'high' : 'moderate';
    const percentileApprox = Math.round((0.5 + 0.5 * Math.tanh(zScore * 0.8)) * 100);
    const inclusionRate = filterResult.total > 0 ? filterResult.includedCount / filterResult.total : 0;
    const diseaseName = DISEASE_LABELS[disease] ?? disease;

    let confidenceLevel: string;
    let confidenceReason: string;
    if (contributions.length < 2 || inclusionRate < 0.4) {
      confidenceLevel = 'low';
      confidenceReason = `Only ${contributions.length} variant(s) passed evidence filtering (${filterResult.includedCount}/${filterResult.total} total). Score may not capture the full genetic picture.`;
    } else if (contributions.length < 4 || inclusionRate < 0.7) {
      confidenceLevel = 'moderate';
      confidenceReason = `${contributions.length} variants included (${filterResult.includedCount}/${filterResult.total} passed filtering); genotype assumed as heterozygous (1 allele) since no genotype data was provided.`;
    } else {
      confidenceLevel = 'high';
      confidenceReason = `${contributions.length} variants included with high filtering pass rate (${filterResult.includedCount}/${filterResult.total}), all GWS-significant.`;
    }

    const tierDesc: Record<string, string> = {
      low:      `Your PRS is below the population average for ${diseaseName}. This suggests a lower-than-average genetic predisposition based on the variants analyzed. It does not mean no risk — lifestyle, environment, and variants not captured here all contribute.`,
      moderate: `Your PRS is near the population average for ${diseaseName}. The genetic variants analyzed do not suggest substantially elevated or reduced genetic predisposition compared to the general population. This is the most common result.`,
      high:     `Your PRS is above the population average for ${diseaseName}. This suggests a higher-than-average genetic predisposition based on the variants analyzed. This is not a diagnosis — many people with elevated PRS never develop the condition, and lifestyle modifications can substantially modify actual risk.`,
    };

    const riskInterpretation = {
      disease, tier,
      prsScore: prsResult.totalScore,
      zScore: Math.round(zScore * 100) / 100,
      percentileApprox, confidenceLevel, confidenceReason,
      description: tierDesc[tier],
    };

    // 7. Lifestyle context
    const lifestyleContext = {
      disease,
      factors: LIFESTYLE[disease] ?? [],
      source: 'Synthesized from published public health guidelines and clinical trial evidence (e.g., Diabetes Prevention Program, AREDS2, Framingham Heart Study).',
    };

    // 8. Assemble report
    const report = {
      disease,
      diseaseName,
      riskInterpretation,
      prsResult,
      filterResult,
      citations,
      lifestyleContext,
      disclaimer: DISCLAIMER,
      generatedAt: new Date().toISOString(),
    };

    ctx.logger.info('run_full_analysis complete', { disease, tier, confidence: confidenceLevel });
    return report;
  }
}
