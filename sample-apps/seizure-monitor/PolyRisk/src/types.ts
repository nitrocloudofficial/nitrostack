export type Disease =
  | 'type2_diabetes'
  | 'coronary_artery_disease'
  | 'age_related_macular_degeneration';

export type SampleSet =
  | 'T2D_SAMPLE'
  | 'CAD_SAMPLE'
  | 'AMD_SAMPLE';

export type RiskTier =
  | 'low'
  | 'moderate'
  | 'high';

export type EffectType =
  | 'OR'
  | 'beta'
  | 'unknown';

export type FilterDecisionType =
  | 'included'
  | 'excluded';

export type ConfidenceLevel =
  | 'low'
  | 'moderate'
  | 'high';

/* =========================================================
   VARIANT VALIDATION
   ========================================================= */

export interface ValidatedVariant {
  rsid: string;
  isValid: boolean;
  normalizedRsid: string;
  error?: string;
}

/* =========================================================
   GWAS ASSOCIATION
   ========================================================= */

export interface GWASAssociation {
  rsid: string;

  /*
   * Bare effect/risk allele.
   * Example: "T"
   */
  riskAllele: string;

  /*
   * Numeric p-value.
   *
   * Very small values may underflow to 0 in JavaScript,
   * therefore mantissa/exponent are also preserved.
   */
  pvalue: number;
  pvalueMantissa: number;
  pvalueExponent: number;

  /*
   * Raw GWAS effect estimates.
   */
  orPerCopyNum: number | null;

  betaNum: number | null;
  betaUnit: string | null;
  betaDirection: string | null;

  riskFrequency: number | null;

  /*
   * Study metadata.
   */
  studyAccession: string;
  pubmedId: string;

  traitName: string;

  initialSampleSize: string;
  replicationSampleSize: string;

  ancestralGroups: string[];

  totalSampleSize: number;
}

/* =========================================================
   EVIDENCE QUALITY
   ========================================================= */

/*
 * PolyRisk heuristic evidence score.
 *
 * IMPORTANT:
 * This is NOT a clinical probability and NOT a universally
 * accepted GWAS evidence score.
 *
 * It exists to make the evidence-selection process transparent.
 */
export interface EvidenceQuality {
  /*
   * Total score from 0–100.
   */
  score: number;

  level: ConfidenceLevel;

  /*
   * Score components.
   *
   * significanceScore: max 25
   * sampleSizeScore:   max 25
   * effectScore:       max 20
   * ancestryScore:     max 20
   * replicationScore:  max 10
   */
  significanceScore: number;
  sampleSizeScore: number;
  effectScore: number;
  ancestryScore: number;
  replicationScore: number;

  warnings: string[];
}

/* =========================================================
   FILTER DECISION
   ========================================================= */

export interface FilterDecision {
  rsid: string;

  riskAllele: string;

  pubmedId: string | null;
  studyAccession: string | null;

  traitName: string;

  /*
   * Raw scientific effect estimate.
   *
   * If effectType = OR:
   *   effectSize is the raw OR.
   *
   * If effectType = beta:
   *   effectSize is the signed beta.
   *
   * Do NOT confuse this with PRSContribution.weight.
   */
  effectSize: number;

  effectType: EffectType;

  pvalue: number;
  pvalueFormatted: string;

  ancestralGroups: string[];

  totalSampleSize: number;

  decision: FilterDecisionType;

  reason: string;

  evidenceQuality?: EvidenceQuality;
}

export interface FilterEvidenceResult {
  disease: Disease;

  total: number;

  includedCount: number;

  excludedCount: number;

  ancestryNote: string | null;

  allDecisions: FilterDecision[];
}

/* =========================================================
   PRS CONTRIBUTION
   ========================================================= */

export interface PRSContribution {
  rsid: string;

  riskAllele: string;

  /*
   * Number of effect-allele copies:
   *
   * 0 = no copies
   * 1 = one copy
   * 2 = two copies
   */
  genotypeAlleleCount: number;

  /*
   * Whether this particular SNP used an assumed dosage.
   *
   * This allows the UI to clearly distinguish measured
   * genotype contributions from fallback assumptions.
   */
  genotypeAssumed?: boolean;

  /*
   * Weight actually used by PRS.
   *
   * OR association:
   *     weight = ln(OR)
   *
   * beta association:
   *     weight = beta
   *
   * This is intentionally NOT called effectSize because
   * FilterDecision.effectSize contains the raw GWAS estimate.
   */
  weight: number;

  effectType:
    | 'OR_log'
    | 'beta';

  /*
   * contribution =
   * genotypeAlleleCount × weight
   */
  contribution: number;

  /*
   * Absolute share of total PRS contribution.
   *
   * Uses absolute contributions in the denominator so
   * protective and risk effects do not cancel each other.
   */
  contributionPercent?: number;

  studyAccession: string | null;

  pubmedId: string | null;

  evidenceScore?: number;
}

/* =========================================================
   PRS RESULT
   ========================================================= */

export interface PRSResult {
  disease: Disease;

  totalScore: number;

  contributions: PRSContribution[];

  variantsIncluded: number;

  /*
   * True if dosage was assumed for at least one scored SNP.
   */
  genotypeAssumed: boolean;

  /*
   * Exact variants for which dosage was unavailable.
   *
   * Empty when every scored SNP had supplied genotype dosage.
   */
  assumedGenotypeRsids?: string[];

  confidenceLevel?: ConfidenceLevel;

  confidenceReason?: string;
}

/* =========================================================
   CITATIONS
   ========================================================= */

export interface Citation {
  pubmedId: string;

  title: string;

  authors: string;

  journal: string;

  year: string;

  url: string;
}

/* =========================================================
   RISK INTERPRETATION
   ========================================================= */

export interface RiskInterpretation {
  disease: Disease;

  tier: RiskTier;

  prsScore: number;

  zScore: number;

  percentileApprox: number;

  confidenceLevel: ConfidenceLevel;

  confidenceReason: string;

  description: string;
}

/* =========================================================
   LIFESTYLE CONTEXT
   ========================================================= */

export interface LifestyleContext {
  disease: Disease;

  factors: Array<{
    category: string;
    description: string;
  }>;

  source: string;
}

/* =========================================================
   FINAL REPORT
   ========================================================= */

export interface PolyRiskReport {
  disease: Disease;

  diseaseName: string;

  riskInterpretation: RiskInterpretation;

  prsResult: PRSResult;

  filterResult: FilterEvidenceResult;

  citations: Citation[];

  lifestyleContext: LifestyleContext;

  disclaimer: string;

  generatedAt: string;
}
