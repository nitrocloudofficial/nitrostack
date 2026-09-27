import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import { Disease, FilterEvidenceResult } from '../../types.js';
import { Citation } from '../citations/citations.service.js';
import { RiskTier, RiskInterpretation } from '../risk-interpreter/risk-interpreter.service.js';

export interface LifestyleContext {
  disease: Disease;
  factors: Array<{ category: string; description: string }>;
  source: string;
}

export interface PolyRiskReport {
  disease: Disease;
  diseaseName: string;
  narrative?: string;
  riskInterpretation: RiskInterpretation;
  prsResult: any;
  filterResult?: FilterEvidenceResult;
  citations: Citation[];
  lifestyleContext?: LifestyleContext;
  disclaimer: string;
  generatedAt: string;
}

const SUPPORTED_DISEASES = ['type2_diabetes', 'coronary_artery_disease', 'age_related_macular_degeneration'] as const;

const DISEASE_LABELS: Record<Disease, string> = {
  type2_diabetes: 'Type 2 Diabetes',
  coronary_artery_disease: 'Coronary Artery Disease',
  age_related_macular_degeneration: 'Age-Related Macular Degeneration',
};

// Approximate PRS population parameters for the three diseases
// (mean/SD of log-OR-weighted sums across typical variant sets)
// These are illustrative approximations for relative-risk framing; not clinical calibration.
const PRS_POPULATION_PARAMS: Record<Disease, { mean: number; sd: number }> = {
  type2_diabetes: { mean: 0.80, sd: 0.35 },
  coronary_artery_disease: { mean: 0.45, sd: 0.20 },
  age_related_macular_degeneration: { mean: 1.10, sd: 0.55 },
};

const DISCLAIMER = `IMPORTANT: PolyRisk is an educational and evidence-transparency tool, NOT a diagnostic or medical device. This analysis does not diagnose any disease, predict your personal health outcomes, or replace professional medical advice. Polygenic risk scores represent statistical tendencies across populations — they cannot predict whether any individual will or will not develop a disease. Genetic risk is only one of many factors that influence health outcomes. If you have health concerns, please consult a qualified healthcare provider. The data in this report comes from published peer-reviewed research and open databases (GWAS Catalog, PubMed), but is provided for informational purposes only.`;

const LIFESTYLE_FACTORS: Record<Disease, Array<{ category: string; description: string }>> = {
  type2_diabetes: [
    { category: 'Diet', description: 'Reducing refined carbohydrates, sugar-sweetened beverages, and processed foods; increasing dietary fiber and whole grains is associated with lower T2D risk.' },
    { category: 'Physical activity', description: 'Even modest regular aerobic exercise (150 min/week of moderate intensity) substantially reduces T2D incidence independent of weight loss.' },
    { category: 'Weight management', description: 'A 5–7% reduction in body weight in people with prediabetes reduces progression to T2D by ~58% (Diabetes Prevention Program).' },
    { category: 'Sleep', description: 'Consistently poor sleep quality or short sleep duration is associated with impaired glucose tolerance and increased T2D risk.' },
    { category: 'Smoking', description: 'Smoking cessation is associated with improved insulin sensitivity and reduced T2D risk over time.' },
  ],
  coronary_artery_disease: [
    { category: 'Smoking', description: 'Smoking is one of the strongest modifiable risk factors for CAD. Cessation substantially reduces risk within years.' },
    { category: 'Blood lipids', description: 'LDL cholesterol management (through diet, exercise, or medication if indicated) is central to CAD prevention.' },
    { category: 'Blood pressure', description: 'Hypertension management through diet (reduced sodium, DASH diet), exercise, and when appropriate, medication reduces CAD events.' },
    { category: 'Physical activity', description: 'Regular aerobic exercise reduces multiple CAD risk factors simultaneously (blood pressure, lipids, weight, inflammation).' },
    { category: 'Diet', description: 'Mediterranean-style diet patterns are associated with reduced cardiovascular risk in multiple large trials.' },
  ],
  age_related_macular_degeneration: [
    { category: 'Smoking', description: 'Smoking is the strongest modifiable risk factor for AMD — smokers have 2–4× higher risk, and benefit from cessation at any age.' },
    { category: 'Diet / antioxidants', description: 'The AREDS/AREDS2 formulation (vitamins C, E, zinc, copper, lutein, zeaxanthin) reduces progression risk in intermediate-to-advanced AMD. Diet rich in leafy greens and fish may have protective effects.' },
    { category: 'UV exposure', description: 'Protective eyewear reducing UV-B and blue light exposure is recommended, particularly outdoors.' },
    { category: 'Blood pressure', description: 'Hypertension is associated with AMD progression; blood pressure management may reduce risk.' },
    { category: 'BMI and exercise', description: 'Obesity and sedentary lifestyle are associated with increased AMD risk; regular exercise has protective associations in observational studies.' },
  ],
};

export class ReportTools {

  @Tool({
    name: 'get_lifestyle_context',
    description:
      'Returns evidence-based, disease-specific modifiable lifestyle factors relevant to the selected condition. Drawn from published public health and clinical research. General and factual — not personalized medical advice. All three supported diseases have strong evidence for lifestyle modification reducing risk.',
    inputSchema: z.object({
      disease: z.enum(SUPPORTED_DISEASES).describe('Target disease'),
    }),
    examples: {
      request: { disease: 'type2_diabetes' },
      response: {
        disease: 'type2_diabetes',
        factors: [
          { category: 'Physical activity', description: '150 min/week of moderate aerobic exercise substantially reduces T2D incidence.' },
        ],
      },
    },
  })
  async getLifestyleContext(input: any, ctx: ExecutionContext) {
    const disease = input.disease as Disease;
    ctx.logger.info('Fetching lifestyle context', { disease });
    const result: LifestyleContext = {
      disease,
      factors: LIFESTYLE_FACTORS[disease] ?? [],
      source: 'Synthesized from published public health guidelines and clinical trial evidence (e.g., Diabetes Prevention Program, AREDS2, Framingham Heart Study).',
    };
    return result;
  }

  @Tool({
    name: 'generate_report',
    description:
      'Compiles a complete, structured PolyRisk report: risk tier, confidence level, per-variant PRS contribution breakdown, included vs. excluded studies with reasons, real PubMed citations, modifiable lifestyle context, and a mandatory prominent disclaimer that this is an educational tool — not a diagnostic device.',
    inputSchema: z.object({
      riskInterpretation: z.any().describe('Output of interpret_risk'),
      prsResult: z.any().describe('Output of calculate_prs'),
      filterResult: z.any().describe('Output of filter_evidence'),
      citations: z.array(z.any()).describe('Output of fetch_citations (.citations array)'),
      lifestyleContext: z.any().describe('Output of get_lifestyle_context'),
    }),
    examples: {
      request: {
        riskInterpretation: { tier: 'moderate', disease: 'type2_diabetes' },
        prsResult: { totalScore: 0.85, variantsIncluded: 5 },
        filterResult: { includedCount: 5, excludedCount: 1, total: 6 },
        citations: [{ pubmedId: '17293876', title: 'TCF7L2 polymorphisms...' }],
        lifestyleContext: { factors: [{ category: 'Diet', description: '...' }] },
      },
      response: { disease: 'type2_diabetes', diseaseName: 'Type 2 Diabetes', disclaimer: '...' },
    },
  })
  @Widget('risk-report')
  async generateReport(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating PolyRisk report', {
      disease: input.riskInterpretation?.disease,
    });

    const riskInterpretation: RiskInterpretation = input.riskInterpretation;
    const disease = riskInterpretation.disease;

    const report: PolyRiskReport = {
      disease,
      diseaseName: DISEASE_LABELS[disease as Disease] ?? disease,
      riskInterpretation,
      prsResult: input.prsResult,
      filterResult: input.filterResult,
      citations: input.citations ?? [],
      lifestyleContext: input.lifestyleContext,
      disclaimer: DISCLAIMER,
      generatedAt: new Date().toISOString(),
    };

    ctx.logger.info('Report generated', {
      disease,
      tier: riskInterpretation.tier,
      confidence: riskInterpretation.confidenceLevel,
    });

    return report;
  }
}
