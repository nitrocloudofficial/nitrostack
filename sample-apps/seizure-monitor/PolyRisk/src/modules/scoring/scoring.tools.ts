import {
  ToolDecorator as Tool,
  ExecutionContext,
  z,
} from '@nitrostack/core';

import {
  Disease,
  PRSContribution,
  PRSResult,
  FilterDecision,
} from '../../types.js';

const SUPPORTED_DISEASES = [
  'type2_diabetes',
  'coronary_artery_disease',
  'age_related_macular_degeneration',
] as const;

export class ScoringTools {

  /* ========================================================
     CALCULATE PRS
     ======================================================== */

  @Tool({
    name: 'calculate_prs',

    description:
      'Calculates an explainable Polygenic Risk Score using PRS = Σ(weight_i × genotype_i). For odds ratios, weight = ln(OR). For beta effects, weight = beta. Genotype dosage is tracked independently for every SNP so missing genotypes are explicitly reported rather than silently treated as complete data.',

    inputSchema: z.object({

      disease:
        z.enum(
          SUPPORTED_DISEASES
        ),

      includedDecisions:
        z.array(
          z.any()
        )
        .describe(
          'FilterDecision objects returned by filter_evidence'
        ),

      genotypes:
        z.record(
          z.string(),

          /*
           * FIX:
           *
           * Dosage must be exactly:
           *
           * 0, 1 or 2
           *
           * Fractional values such as 1.5 are rejected.
           */
          z.number()
            .int()
            .min(0)
            .max(2)
        )
        .optional()
        .describe(
          'Map rsID -> effect allele dosage. Valid values are integers 0, 1 or 2. Missing SNP dosages are explicitly flagged and dosage=1 is used only as the current demo fallback.'
        ),
    }),
  })

  async calculatePrs(
    input: any,
    ctx: ExecutionContext
  ): Promise<PRSResult> {

    /* ======================================================
       KEEP ONLY INCLUDED EVIDENCE
       ====================================================== */

    const includedDecisions:
      FilterDecision[] =
      (
        input.includedDecisions ??
        []
      )
        .filter(
          (decision: FilterDecision) =>
            decision.decision ===
            'included'
        );

    /* ======================================================
       EMPTY INPUT
       ====================================================== */

    if (
      includedDecisions.length === 0
    ) {

      /*
       * No separate "warning" field.
       *
       * confidenceReason already provides the explanation,
       * keeping PRSResult consistent across every return path.
       */
      return {
        disease:
          input.disease as Disease,

        totalScore:
          0,

        contributions:
          [],

        variantsIncluded:
          0,

        genotypeAssumed:
          false,

        assumedGenotypeRsids:
          [],

        confidenceLevel:
          'low',

        confidenceReason:
          'No variants passed evidence filtering, so no PRS could be calculated.',
      };
    }

    /* ======================================================
       GENOTYPE INPUT
       ====================================================== */

    const genotypes:
      Record<string, number> =
      input.genotypes ?? {};

    /*
     * FIX:
     *
     * The old implementation did:
     *
     * Object.keys(genotypes).length === 0
     *
     * That only detects a completely empty genotype map.
     *
     * It fails when the user supplies some, but not all,
     * required SNP dosages.
     *
     * We now track assumptions PER VARIANT.
     */
    let anyGenotypeAssumed =
      false;

    const assumedRsids:
      string[] = [];

    const contributions:
      PRSContribution[] = [];

    let totalScore =
      0;

    /* ======================================================
       SCORE EACH VARIANT
       ====================================================== */

    for (
      const decision
      of includedDecisions
    ) {

      /* ----------------------------------------------------
         GENOTYPE DOSAGE
         ---------------------------------------------------- */

      /*
       * hasOwnProperty is important here.
       *
       * A dosage of 0 is valid data and must NOT be mistaken
       * for a missing value.
       *
       * Example:
       *
       * {
       *   rs7903146: 0
       * }
       *
       * means the genotype was supplied and contains zero
       * copies of the effect allele.
       */
      const hasGenotype =
        Object.prototype
          .hasOwnProperty
          .call(
            genotypes,
            decision.rsid
          );

      const genotypeAlleleCount =
        hasGenotype
          ? genotypes[
              decision.rsid
            ]
          : 1;

      /*
       * Record the assumption for this exact SNP.
       */
      if (
        !hasGenotype
      ) {

        anyGenotypeAssumed =
          true;

        assumedRsids.push(
          decision.rsid
        );
      }

      /* ----------------------------------------------------
         EFFECT -> PRS WEIGHT
         ---------------------------------------------------- */

      let weight:
        number;

      let effectType:
        'OR_log' |
        'beta';

      /*
       * For OR-based disease associations:
       *
       * weight = ln(OR)
       */
      if (
        decision.effectType ===
          'OR' &&
        decision.effectSize > 0
      ) {

        weight =
          Math.log(
            decision.effectSize
          );

        effectType =
          'OR_log';
      }

      /*
       * For beta associations:
       *
       * weight = beta
       */
      else if (
        decision.effectType ===
        'beta'
      ) {

        if (
          !Number.isFinite(
            decision.effectSize
          )
        ) {
          ctx.logger.warn(
            'Skipping variant with invalid beta',
            { rsid: decision.rsid, effectSize: decision.effectSize }
          );
          continue;
        }

        weight =
          decision.effectSize;

        effectType =
          'beta';
      }

      /*
       * Defensive fallback.
       *
       * Normally this should never occur because the evidence
       * filter already rejects unusable effect estimates.
       */
      else {

        ctx.logger.warn(
          'Skipping variant with unusable effect estimate',
          {
            rsid:
              decision.rsid,

            effectType:
              decision.effectType,

            effectSize:
              decision.effectSize,
          }
        );

        continue;
      }

      /* ----------------------------------------------------
         CONTRIBUTION
         ---------------------------------------------------- */

      /*
       * PRS_i = dosage_i × weight_i
       */
      const contribution =
        genotypeAlleleCount *
        weight;

      totalScore +=
        contribution;

      contributions.push({
        rsid:
          decision.rsid,

        riskAllele:
          decision.riskAllele,

        genotypeAlleleCount,

        /*
         * Explicitly tell downstream UI/report code whether
         * this particular dosage was supplied or assumed.
         */
        genotypeAssumed:
          !hasGenotype,

        weight,

        effectType,

        contribution,

        studyAccession:
          decision.studyAccession,

        pubmedId:
          decision.pubmedId,

        evidenceScore:
          decision
            .evidenceQuality
            ?.score,
      });
    }

    /* ======================================================
       CONTRIBUTION PERCENTAGES
       ====================================================== */

    /*
     * Use absolute values.
     *
     * Example:
     *
     * SNP A = +0.5
     * SNP B = -0.4
     *
     * Raw total = 0.1
     *
     * Dividing by 0.1 would make contribution percentages
     * misleading.
     *
     * Instead:
     *
     * denominator = |0.5| + |-0.4| = 0.9
     */
    const totalAbsoluteContribution =
      contributions.reduce(
        (sum, item) =>
          sum +
          Math.abs(
            item.contribution
          ),
        0
      );

    for (
      const item
      of contributions
    ) {

      item.contributionPercent =
        totalAbsoluteContribution > 0

          ? Math.round(
              (
                Math.abs(
                  item.contribution
                ) /
                totalAbsoluteContribution
              ) *
              10000
            ) / 100

          : 0;
    }

    /* ======================================================
       EVIDENCE CONFIDENCE
       ====================================================== */

    const evidenceScores =
      contributions
        .map(
          item =>
            item.evidenceScore
        )
        .filter(
          (
            value
          ): value is number =>
            typeof value ===
              'number' &&
            Number.isFinite(
              value
            )
        );

    /*
     * Average evidence quality of scored variants.
     */
    const averageEvidence =
      evidenceScores.length > 0

        ? evidenceScores.reduce(
            (sum, score) =>
              sum + score,
            0
          ) /
          evidenceScores.length

        : 0;

    let confidenceLevel:
      'low' |
      'moderate' |
      'high';

    if (
      averageEvidence >= 80
    ) {

      confidenceLevel =
        'high';
    }

    else if (
      averageEvidence >= 60
    ) {

      confidenceLevel =
        'moderate';
    }

    else {

      confidenceLevel =
        'low';
    }

    /* ======================================================
       DOWNGRADE IF GENOTYPES WERE ASSUMED
       ====================================================== */

    /*
     * Evidence can be strong while the person's genotype data
     * is incomplete.
     *
     * Therefore genotype assumptions reduce overall confidence.
     */
    if (
      anyGenotypeAssumed
    ) {

      if (
        confidenceLevel ===
        'high'
      ) {

        confidenceLevel =
          'moderate';
      }

      else {

        confidenceLevel =
          'low';
      }
    }

    /* ======================================================
       SORT CONTRIBUTIONS
       ====================================================== */

    /*
     * Most influential SNPs first.
     */
    contributions.sort(
      (a, b) =>
        Math.abs(
          b.contribution
        ) -
        Math.abs(
          a.contribution
        )
    );

    /* ======================================================
       CONFIDENCE EXPLANATION
       ====================================================== */

    let confidenceReason:
      string;

    if (
      anyGenotypeAssumed
    ) {

      confidenceReason =
        `Average evidence quality=${averageEvidence.toFixed(1)}/100, ` +
        `but genotype dosage was unavailable for ` +
        `${assumedRsids.join(', ')} and dosage=1 was assumed for those variants.`;
    }

    else {

      confidenceReason =
        `Average evidence quality=${averageEvidence.toFixed(1)}/100 ` +
        `across ${contributions.length} scored variants; ` +
        `genotype dosage was supplied for every scored variant.`;
    }

    /* ======================================================
       FINAL RESULT
       ====================================================== */

    const result:
      PRSResult = {

        disease:
          input.disease as Disease,

        totalScore:
          Math.round(
            totalScore *
            10000
          ) / 10000,

        contributions,

        variantsIncluded:
          contributions.length,

        /*
         * True if even ONE SNP dosage was assumed.
         */
        genotypeAssumed:
          anyGenotypeAssumed,

        /*
         * Exact SNPs where dosage was unavailable.
         */
        assumedGenotypeRsids:
          assumedRsids,

        confidenceLevel,

        confidenceReason,
      };

    /* ======================================================
       LOGGING
       ====================================================== */

    ctx.logger.info(
      'PRS calculation complete',
      {
        disease:
          input.disease,

        score:
          result.totalScore,

        variants:
          result.variantsIncluded,

        genotypeAssumed:
          anyGenotypeAssumed,

        assumedVariants:
          assumedRsids,

        confidence:
          confidenceLevel,

        averageEvidence,
      }
    );

    return result;
  }
}
