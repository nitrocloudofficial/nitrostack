import { Injectable } from '@nitrostack/core';

import {
  GWASAssociation,
  FilterDecision,
  EffectType,
  EvidenceQuality,
} from '../../types.js';

/*
 * Conventional genome-wide significance threshold.
 */
const GWS_PVALUE = 5e-8;

/*
 * PolyRisk MVP heuristic.
 *
 * This is NOT a universal GWAS quality cutoff.
 */
const MIN_SAMPLE_SIZE = 1000;

interface BasicQualityResult {
  valid: boolean;
  reason: string;
}

@Injectable()
export class EvidenceFilterEngine {

  /* ========================================================
     MAIN FILTER
     ======================================================== */

  filter(
    associations: GWASAssociation[],
    userAncestry: string | null
  ): FilterDecision[] {

    /*
     * Group all retrieved associations by SNP.
     *
     * This lets us evaluate every study while still selecting
     * only one effect estimate per SNP for PRS calculation.
     */
    const byRsid =
      new Map<string, GWASAssociation[]>();

    for (const association of associations) {

      if (!association?.rsid) {
        continue;
      }

      if (!byRsid.has(association.rsid)) {
        byRsid.set(
          association.rsid,
          []
        );
      }

      byRsid
        .get(association.rsid)!
        .push(association);
    }

    const decisions:
      FilterDecision[] = [];

    /* ======================================================
       PROCESS EACH SNP
       ====================================================== */

    for (const [, group] of byRsid.entries()) {

      /*
       * Evaluate every study independently.
       */
      const evaluated =
        group.map(
          association => ({
            association,

            quality:
              this.evaluateBasicQuality(
                association
              ),
          })
        );

      const validCandidates =
        evaluated.filter(
          item =>
            item.quality.valid
        );

      /*
       * No study for this SNP passed QC.
       */
      if (
        validCandidates.length === 0
      ) {

        for (const item of evaluated) {

          decisions.push(
            this.buildExcludedDecision(
              item.association,
              item.quality.reason,
              userAncestry,
              group.length
            )
          );
        }

        continue;
      }

      /*
       * Rank qualifying studies.
       *
       * Priority:
       *
       * 1. larger sample size
       * 2. stronger p-value
       * 3. mantissa/exponent p-value tiebreak
       * 4. deterministic accession ordering
       */
      const ranked =
        [...validCandidates]
          .sort(
            (a, b) =>
              this.compareCandidates(
                a.association,
                b.association
              )
          );

      const best =
        ranked[0].association;

      /*
       * Only one effect estimate per SNP enters the PRS.
       *
       * This prevents double-counting the same genetic locus
       * merely because multiple GWAS publications reported it.
       */
      decisions.push(
        this.buildIncludedDecision(
          best,
          userAncestry,
          group.length
        )
      );

      /*
       * Keep decisions for every other study so the evidence
       * selection remains transparent.
       */
      for (const item of evaluated) {

        if (
          item.association === best
        ) {
          continue;
        }

        /*
         * Failed basic QC.
         */
        if (
          !item.quality.valid
        ) {

          decisions.push(
            this.buildExcludedDecision(
              item.association,
              item.quality.reason,
              userAncestry,
              group.length
            )
          );

          continue;
        }

        /*
         * Passed QC but another study was selected.
         */
        decisions.push(
          this.buildSupersededDecision(
            item.association,
            best,
            userAncestry,
            group.length
          )
        );
      }
    }

    /*
     * Included evidence first, then excluded evidence.
     */
    return decisions.sort(
      (a, b) => {

        if (
          a.decision !==
          b.decision
        ) {

          return (
            a.decision ===
            'included'
          )
            ? -1
            : 1;
        }

        const rsidComparison =
          a.rsid.localeCompare(
            b.rsid
          );

        if (
          rsidComparison !== 0
        ) {
          return rsidComparison;
        }

        return (
          a.studyAccession ?? ''
        ).localeCompare(
          b.studyAccession ?? ''
        );
      }
    );
  }

  /* ========================================================
     BASIC QUALITY CONTROL
     ======================================================== */

  private evaluateBasicQuality(
    assoc: GWASAssociation
  ): BasicQualityResult {

    /* ------------------------------------------------------
       P-VALUE VALIDATION
       ------------------------------------------------------ */

    if (
      !Number.isFinite(
        assoc.pvalue
      ) ||
      assoc.pvalue < 0 ||
      assoc.pvalue > 1
    ) {

      return {
        valid: false,

        reason:
          'excluded: association has a missing or invalid p-value',
      };
    }

    /* ------------------------------------------------------
       GENOME-WIDE SIGNIFICANCE
       ------------------------------------------------------ */

    if (
      assoc.pvalue >=
      GWS_PVALUE
    ) {

      return {
        valid: false,

        reason:
          `excluded: does not meet genome-wide significance threshold ` +
          `(p=${this.formatPvalue(assoc)}, required p < 5×10⁻⁸)`,
      };
    }

    /* ------------------------------------------------------
       EFFECT ALLELE VALIDATION
       ------------------------------------------------------ */

    if (
      !this.hasValidRiskAllele(
        assoc.riskAllele
      )
    ) {

      return {
        valid: false,

        reason:
          'excluded: effect/risk allele is missing or invalid',
      };
    }

    /* ------------------------------------------------------
       EFFECT SIZE VALIDATION
       ------------------------------------------------------ */

    const effectSize =
      this.getEffectSize(
        assoc
      );

    const effectType =
      this.getEffectType(
        assoc
      );

    if (
      effectSize === null ||
      effectType === 'unknown'
    ) {

      return {
        valid: false,

        reason:
          'excluded: no usable quantitative effect size (odds ratio or beta) was reported',
      };
    }

    /*
     * Odds ratios must be strictly positive.
     */
    if (
      effectType === 'OR' &&
      effectSize <= 0
    ) {

      return {
        valid: false,

        reason:
          'excluded: odds ratio is invalid; OR must be greater than zero',
      };
    }

    /* ------------------------------------------------------
       SAMPLE SIZE
       ------------------------------------------------------ */

    const sampleSize =
      this.getSampleSize(
        assoc
      );

    if (
      sampleSize <
      MIN_SAMPLE_SIZE
    ) {

      return {
        valid: false,

        reason:
          `excluded: study sample size (n≈${sampleSize}) is below ` +
          `PolyRisk's MVP minimum evidence threshold (n=${MIN_SAMPLE_SIZE}); ` +
          `this is a project heuristic, not a universal GWAS quality cutoff`,
      };
    }

    return {
      valid: true,

      reason:
        'passes PolyRisk evidence QC',
    };
  }

  /* ========================================================
     CANDIDATE RANKING
     ======================================================== */

  private compareCandidates(
    a: GWASAssociation,
    b: GWASAssociation
  ): number {

    /* ------------------------------------------------------
       1. LARGER SAMPLE SIZE
       ------------------------------------------------------ */

    const sampleA =
      this.getSampleSize(a);

    const sampleB =
      this.getSampleSize(b);

    if (
      sampleA !==
      sampleB
    ) {

      return (
        sampleB -
        sampleA
      );
    }

    /* ------------------------------------------------------
       2. NUMERIC P-VALUE
       ------------------------------------------------------ */

    if (
      a.pvalue !==
      b.pvalue
    ) {

      return (
        a.pvalue -
        b.pvalue
      );
    }

    /*
     * Extremely small p-values can underflow to 0 in JS.
     *
     * Therefore if numeric p-values tie, compare the original
     * scientific-notation exponent and mantissa.
     */

    /* ------------------------------------------------------
       3. EXPONENT
       ------------------------------------------------------ */

    const expA =
      Number.isFinite(
        a.pvalueExponent
      )
        ? a.pvalueExponent
        : 0;

    const expB =
      Number.isFinite(
        b.pvalueExponent
      )
        ? b.pvalueExponent
        : 0;

    if (
      expA !==
      expB
    ) {

      /*
       * More negative exponent = smaller p-value.
       *
       * Example:
       *
       * 10^-200 is stronger than 10^-100.
       */
      return (
        expA -
        expB
      );
    }

    /* ------------------------------------------------------
       4. MANTISSA
       ------------------------------------------------------ */

    const mantA =
      Number.isFinite(
        a.pvalueMantissa
      )
        ? a.pvalueMantissa
        : 1;

    const mantB =
      Number.isFinite(
        b.pvalueMantissa
      )
        ? b.pvalueMantissa
        : 1;

    if (
      mantA !==
      mantB
    ) {

      return (
        mantA -
        mantB
      );
    }

    /* ------------------------------------------------------
       5. DETERMINISTIC FINAL TIEBREAK
       ------------------------------------------------------ */

    return (
      a.studyAccession ?? ''
    ).localeCompare(
      b.studyAccession ?? ''
    );
  }

  /* ========================================================
     INCLUDED DECISION
     ======================================================== */

  private buildIncludedDecision(
    assoc: GWASAssociation,
    userAncestry: string | null,
    supportingStudies: number
  ): FilterDecision {

    const effectSize =
      this.getEffectSize(
        assoc
      )!;

    const effectType =
      this.getEffectType(
        assoc
      );

    const sampleSize =
      this.getSampleSize(
        assoc
      );

    const evidenceQuality =
      this.calculateEvidenceQuality(
        assoc,
        userAncestry,
        supportingStudies
      );

    const ancestryMessage =
      this.getAncestryMessage(
        assoc.ancestralGroups ?? [],
        userAncestry
      );

    const effectDescription =
      effectType === 'OR'

        ? `OR=${effectSize.toFixed(3)}`

        : `β=${effectSize.toFixed(3)}`;

    return {
      rsid:
        assoc.rsid,

      riskAllele:
        assoc.riskAllele,

      pubmedId:
        assoc.pubmedId || null,

      studyAccession:
        assoc.studyAccession || null,

      traitName:
        assoc.traitName,

      effectSize,

      effectType,

      pvalue:
        assoc.pvalue,

      pvalueFormatted:
        this.formatPvalue(
          assoc
        ),

      ancestralGroups:
        assoc.ancestralGroups ?? [],

      totalSampleSize:
        sampleSize,

      decision:
        'included',

      evidenceQuality,

      reason:
        `included: genome-wide significant ` +
        `(p=${this.formatPvalue(assoc)}); ` +

        `adequate study size (n≈${sampleSize}); ` +

        `valid effect estimate (${effectDescription}); ` +

        `effect allele=${assoc.riskAllele}; ` +

        `PolyRisk evidence confidence=${evidenceQuality.level} ` +
        `(${evidenceQuality.score}/100)` +

        ancestryMessage,
    };
  }

  /* ========================================================
     EXCLUDED DECISION
     ======================================================== */

  private buildExcludedDecision(
    assoc: GWASAssociation,
    reason: string,
    userAncestry: string | null,
    supportingStudies: number
  ): FilterDecision {

    return {
      rsid:
        assoc.rsid,

      riskAllele:
        assoc.riskAllele || '',

      pubmedId:
        assoc.pubmedId || null,

      studyAccession:
        assoc.studyAccession || null,

      traitName:
        assoc.traitName || '',

      effectSize:
        this.getEffectSize(
          assoc
        ) ?? 0,

      effectType:
        this.getEffectType(
          assoc
        ),

      pvalue:
        assoc.pvalue,

      pvalueFormatted:
        Number.isFinite(
          assoc.pvalue
        )
          ? this.formatPvalue(
              assoc
            )
          : 'unknown',

      ancestralGroups:
        assoc.ancestralGroups ?? [],

      totalSampleSize:
        this.getSampleSize(
          assoc
        ),

      decision:
        'excluded',

      reason,

      evidenceQuality:
        this.calculateEvidenceQuality(
          assoc,
          userAncestry,
          supportingStudies
        ),
    };
  }

  /* ========================================================
     SUPERSEDED DECISION
     ======================================================== */

  private buildSupersededDecision(
    assoc: GWASAssociation,
    best: GWASAssociation,
    userAncestry: string | null,
    supportingStudies: number
  ): FilterDecision {

    return {
      rsid:
        assoc.rsid,

      riskAllele:
        assoc.riskAllele,

      pubmedId:
        assoc.pubmedId || null,

      studyAccession:
        assoc.studyAccession || null,

      traitName:
        assoc.traitName,

      effectSize:
        this.getEffectSize(
          assoc
        ) ?? 0,

      effectType:
        this.getEffectType(
          assoc
        ),

      pvalue:
        assoc.pvalue,

      pvalueFormatted:
        this.formatPvalue(
          assoc
        ),

      ancestralGroups:
        assoc.ancestralGroups ?? [],

      totalSampleSize:
        this.getSampleSize(
          assoc
        ),

      decision:
        'excluded',

      evidenceQuality:
        this.calculateEvidenceQuality(
          assoc,
          userAncestry,
          supportingStudies
        ),

      reason:
        `excluded from scoring: another qualifying association ` +
        `for ${assoc.rsid} has stronger study support ` +
        `(${best.studyAccession || 'selected study'}); ` +
        `retaining one effect estimate prevents double-counting the same variant`,
    };
  }

  /* ========================================================
     EVIDENCE QUALITY SCORE
     ======================================================== */

  private calculateEvidenceQuality(
    assoc: GWASAssociation,
    userAncestry: string | null,
    supportingStudies: number
  ): EvidenceQuality {

    const warnings:
      string[] = [];

    /* ------------------------------------------------------
       SIGNIFICANCE
       MAX = 25
       ------------------------------------------------------ */

    let significanceScore = 0;

    if (
      Number.isFinite(
        assoc.pvalue
      )
    ) {

      if (
        assoc.pvalue <
        5e-20
      ) {

        significanceScore = 25;
      }

      else if (
        assoc.pvalue <
        5e-12
      ) {

        significanceScore = 22;
      }

      else if (
        assoc.pvalue <
        5e-8
      ) {

        significanceScore = 18;
      }

      else {

        significanceScore = 0;
      }
    }

    /* ------------------------------------------------------
       SAMPLE SIZE
       MAX = 25
       ------------------------------------------------------ */

    const n =
      this.getSampleSize(
        assoc
      );

    let sampleSizeScore = 0;

    if (
      n >= 100000
    ) {

      sampleSizeScore = 25;
    }

    else if (
      n >= 50000
    ) {

      sampleSizeScore = 22;
    }

    else if (
      n >= 10000
    ) {

      sampleSizeScore = 18;
    }

    else if (
      n >= 5000
    ) {

      sampleSizeScore = 14;
    }

    else if (
      n >= 1000
    ) {

      sampleSizeScore = 10;
    }

    else {

      sampleSizeScore = 0;

      warnings.push(
        'small study sample'
      );
    }

    /* ------------------------------------------------------
       EFFECT ESTIMATE
       MAX = 20
       ------------------------------------------------------ */

    const effectType =
      this.getEffectType(
        assoc
      );

    const effectSize =
      this.getEffectSize(
        assoc
      );

    let effectScore = 0;

    if (
      effectType === 'OR' &&
      effectSize !== null &&
      effectSize > 0
    ) {

      effectScore = 20;
    }

    else if (
      effectType === 'beta' &&
      effectSize !== null
    ) {

      effectScore = 20;
    }

    else {

      effectScore = 0;

      warnings.push(
        'missing quantitative effect estimate'
      );
    }

    /* ------------------------------------------------------
       ANCESTRY
       MAX = 20
       ------------------------------------------------------ */

    let ancestryScore = 10;

    const informative =
      (
        assoc.ancestralGroups ??
        []
      )
        .filter(
          group =>
            ![
              '',
              'nr',
              'not reported',
              'unknown',
            ].includes(
              group
                .trim()
                .toLowerCase()
            )
        );

    /*
     * No user ancestry supplied.
     */
    if (
      !userAncestry
    ) {

      if (
        informative.length > 0
      ) {

        ancestryScore = 12;
      }

      else {

        ancestryScore = 8;

        warnings.push(
          'study ancestry unavailable'
        );
      }
    }

    /*
     * User ancestry exists but study ancestry does not.
     */
    else if (
      informative.length === 0
    ) {

      ancestryScore = 7;

      warnings.push(
        'ancestry transferability cannot be assessed'
      );
    }

    /*
     * Compatible ancestry.
     */
    else if (
      this.ancestryMatches(
        informative,
        userAncestry
      )
    ) {

      ancestryScore = 20;
    }

    /*
     * Mismatch.
     */
    else {

      ancestryScore = 8;

      warnings.push(
        `study ancestry may not transfer well to ${userAncestry}`
      );
    }

    /* ------------------------------------------------------
       REPLICATION
       MAX = 10
       ------------------------------------------------------ */

    let replicationScore = 0;

    if (
      supportingStudies >= 5
    ) {

      replicationScore = 10;
    }

    else if (
      supportingStudies >= 3
    ) {

      replicationScore = 8;
    }

    else if (
      supportingStudies >= 2
    ) {

      replicationScore = 6;
    }

    else {

      replicationScore = 3;

      warnings.push(
        'limited replication evidence in retrieved records'
      );
    }

    /* ------------------------------------------------------
       TOTAL
       ------------------------------------------------------ */

    const score =
      Math.max(
        0,
        Math.min(
          100,

          significanceScore +
          sampleSizeScore +
          effectScore +
          ancestryScore +
          replicationScore
        )
      );

    let level:
      'low' |
      'moderate' |
      'high';

    if (
      score >= 80
    ) {

      level = 'high';
    }

    else if (
      score >= 60
    ) {

      level = 'moderate';
    }

    else {

      level = 'low';
    }

    return {
      score,

      level,

      significanceScore,

      sampleSizeScore,

      effectScore,

      ancestryScore,

      replicationScore,

      warnings,
    };
  }

  /* ========================================================
     P-VALUE FORMATTER
     ======================================================== */

  private formatPvalue(
    assoc: GWASAssociation
  ): string {

    if (
      Number.isFinite(
        assoc.pvalueMantissa
      ) &&
      Number.isFinite(
        assoc.pvalueExponent
      )
    ) {

      return (
        `${assoc.pvalueMantissa} × 10^${assoc.pvalueExponent}`
      );
    }

    return Number.isFinite(
      assoc.pvalue
    )

      ? assoc.pvalue
          .toExponential(2)

      : 'unknown';
  }

  /* ========================================================
     SAMPLE SIZE
     ======================================================== */

  private getSampleSize(
    assoc: GWASAssociation
  ): number {

    /*
     * Prefer structured GWAS API value.
     */
    if (
      Number.isFinite(
        assoc.totalSampleSize
      ) &&
      assoc.totalSampleSize > 0
    ) {

      return assoc.totalSampleSize;
    }

    /*
     * Fallback for records where totalSampleSize could not
     * be constructed upstream.
     *
     * Extract numbers from initial + replication descriptions.
     */
    const text =
      `${assoc.initialSampleSize ?? ''} ` +
      `${assoc.replicationSampleSize ?? ''}`;

    const matches =
      text.match(
        /[\d,]+/g
      );

    if (!matches) {
      return 0;
    }

    return matches
      .map(
        value =>
          Number.parseInt(
            value.replace(
              /,/g,
              ''
            ),
            10
          )
      )
      .filter(
        value =>
          Number.isFinite(
            value
          )
      )
      .reduce(
        (sum, value) =>
          sum + value,
        0
      );
  }

  /* ========================================================
     EFFECT SIZE
     ======================================================== */

  private getEffectSize(
    assoc: GWASAssociation
  ): number | null {

    /*
     * Prefer OR when available.
     */
    if (
      assoc.orPerCopyNum !== null &&
      assoc.orPerCopyNum !== undefined &&
      Number.isFinite(
        assoc.orPerCopyNum
      ) &&
      assoc.orPerCopyNum > 0
    ) {

      return assoc.orPerCopyNum;
    }

    /*
     * Otherwise use beta.
     */
    if (
      assoc.betaNum !== null &&
      assoc.betaNum !== undefined &&
      Number.isFinite(
        assoc.betaNum
      )
    ) {

      return this.getSignedBeta(
        assoc.betaNum,
        assoc.betaDirection
      );
    }

    return null;
  }

  /* ========================================================
     EFFECT TYPE
     ======================================================== */

  private getEffectType(
    assoc: GWASAssociation
  ): EffectType {

    if (
      assoc.orPerCopyNum !== null &&
      assoc.orPerCopyNum !== undefined &&
      Number.isFinite(
        assoc.orPerCopyNum
      ) &&
      assoc.orPerCopyNum > 0
    ) {

      return 'OR';
    }

    if (
      assoc.betaNum !== null &&
      assoc.betaNum !== undefined &&
      Number.isFinite(
        assoc.betaNum
      )
    ) {

      return 'beta';
    }

    return 'unknown';
  }

  /* ========================================================
     BETA DIRECTION
     ======================================================== */

  private getSignedBeta(
    beta: number,
    direction: string | null
  ): number {

    if (!direction) {
      return beta;
    }

    const normalized =
      direction
        .trim()
        .toLowerCase();

    if (
      normalized.includes(
        'decrease'
      ) ||
      normalized.includes(
        'negative'
      ) ||
      normalized === '-'
    ) {

      return -Math.abs(
        beta
      );
    }

    if (
      normalized.includes(
        'increase'
      ) ||
      normalized.includes(
        'positive'
      ) ||
      normalized === '+'
    ) {

      return Math.abs(
        beta
      );
    }

    return beta;
  }

  /* ========================================================
     RISK ALLELE VALIDATION
     ======================================================== */

  private hasValidRiskAllele(
    allele:
      string |
      null |
      undefined
  ): boolean {

    if (!allele) {
      return false;
    }

    return [
      'A',
      'C',
      'G',
      'T',
    ].includes(
      allele
        .trim()
        .toUpperCase()
    );
  }

  /* ========================================================
     ANCESTRY MESSAGE
     ======================================================== */

  private getAncestryMessage(
    studyGroups: string[],
    userAncestry: string | null
  ): string {

    const informative =
      studyGroups.filter(
        group =>
          ![
            '',
            'nr',
            'not reported',
            'unknown',
          ].includes(
            group
              .trim()
              .toLowerCase()
          )
      );

    /*
     * No target ancestry supplied.
     */
    if (
      !userAncestry
    ) {

      return (
        informative.length === 0
      )

        ? '; ancestry information unavailable'

        : `; study ancestry=${informative.join(', ')}`;
    }

    /*
     * Study ancestry unavailable.
     */
    if (
      informative.length === 0
    ) {

      return (
        '; CAUTION: study ancestry not reported; ' +
        'transferability cannot be assessed'
      );
    }

    /*
     * Compatible.
     */
    if (
      this.ancestryMatches(
        informative,
        userAncestry
      )
    ) {

      return (
        `; ancestry compatible with target (${userAncestry})`
      );
    }

    /*
     * Mismatch.
     */
    return (
      `; CAUTION: study ancestry (${informative.join(', ')}) ` +
      `differs from target ancestry (${userAncestry}); ` +
      `effect-size transferability may be reduced`
    );
  }

  /* ========================================================
     ANCESTRY MATCH
     ======================================================== */

  private ancestryMatches(
    studyGroups: string[],
    userAncestry: string
  ): boolean {

    const target =
      this.normalizeAncestry(
        userAncestry
      );

    return studyGroups.some(
      group => {

        const study =
          this.normalizeAncestry(
            group
          );

        return (
          study === target ||
          study.includes(target) ||
          target.includes(study)
        );
      }
    );
  }

  private normalizeAncestry(
    value: string
  ): string {

    return value
      .trim()
      .toLowerCase()
      .replace(
        /ancestry/g,
        ''
      )
      .replace(
        /\s+/g,
        ' '
      )
      .trim();
  }
}
