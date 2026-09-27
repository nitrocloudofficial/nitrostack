/**
 * RiskService — the weighted 0-100 risk score behind `score_risk`.
 *
 * Deterministic arithmetic over recorded stage results. No model is involved and
 * none ever will be: a government risk score that changes between two identical
 * runs cannot be defended in an appeal, and "the model said 74" is not a reason a
 * refusal can be justified on. Every point in the total is traceable to a named
 * factor with a source stage, which is what makes the number reviewable.
 *
 * ---------------------------------------------------------------------------
 * WHY THE SCORE IS NOT JUST A SUM OF FIRED RULES
 * ---------------------------------------------------------------------------
 * `evaluate_rules` answers "was policy breached". Scoring answers "how much
 * should a human worry". Those differ: one missing photocopy breaches policy and
 * barely moves risk, while four applications sharing one photograph breaches the
 * same number of rules and is the entire case.
 *
 * So the score reads the STAGE FACTS directly and grades them by category, with a
 * per-category cap. The rulebook then contributes its own small category on top —
 * deliberately small, because the facts behind the rules have already been
 * counted, and letting policy breaches score twice would make document-heavy
 * applications outrank genuine fraud rings.
 *
 * ---------------------------------------------------------------------------
 * CONFIDENCE IS NOT THE SCORE
 * ---------------------------------------------------------------------------
 * `confidence` reports how much of the pipeline actually reported in. A score of
 * 20 at confidence 0.4 is not a low-risk application; it is an unassessed one, and
 * the officer UI renders the caveat rather than the reassurance.
 */
import { Injectable } from '@nitrostack/core';
import type {
  RiskBand,
  RiskFactor,
  ScoreRiskResult,
  Severity,
} from '../../../contracts/index.js';
import { REQUIRED_STAGES_BEFORE_DECISION } from '../../../contracts/index.js';
import { ApplicationService } from '../../pipeline/services/application.service.js';
import { PipelineStateService } from '../../pipeline/services/pipeline-state.service.js';
import { OcrService } from './ocr.service.js';

/** Band thresholds applied to the final 0-100 score. */
export const RISK_BAND_THRESHOLDS = { high: 60, medium: 30 } as const;

/**
 * Maximum points any one category may contribute.
 *
 * The caps ARE the risk model. They encode that no single dimension can carry an
 * application to "high" on its own except the network view plus reused
 * identifiers together — which is exactly the pattern the project exists to
 * surface, and exactly the pattern a per-application checker cannot see.
 */
const CATEGORY_CAPS: Record<RiskFactor['category'], number> = {
  documents: 18,
  identity: 24,
  address: 14,
  duplicates: 30,
  graph: 26,
  photo: 16,
  rules: 12,
};

/** Points per severity for the (deliberately small) rulebook category. */
const RULE_POINTS: Record<Severity, number> = { high: 4, medium: 2, low: 1 };

/** Points per severity for a reused-identifier signal. */
const SIGNAL_POINTS: Record<Severity, number> = { high: 9, medium: 4, low: 1 };

/**
 * Service-level memo TTL.
 *
 * NOT core's `@Cache` decorator, and that is a load-bearing distinction: a cache
 * HIT on a tool skips the handler entirely, so `ctx.emit('pipeline.stage_completed')`
 * would never fire, `PipelineStateService` would never record `score_risk`, and
 * `PipelineCompleteGuard` would block the decision forever. Memoising inside the
 * service keeps the tool's event emission unconditional.
 */
const MEMO_TTL_MS = 30_000;

interface MemoEntry {
  /** Fingerprint of the stage data the score was computed from. */
  fingerprint: string;
  at: number;
  result: ScoreRiskResult;
}

@Injectable({ deps: [ApplicationService, PipelineStateService, OcrService] })
export class RiskService {
  private readonly memo = new Map<string, MemoEntry>();

  constructor(
    private readonly applications: ApplicationService,
    private readonly state: PipelineStateService,
    private readonly ocr: OcrService
  ) {}

  /** Band for a raw score. Exported through the tool so the UI never re-derives it. */
  bandFor(score: number): RiskBand {
    if (score >= RISK_BAND_THRESHOLDS.high) return 'high';
    if (score >= RISK_BAND_THRESHOLDS.medium) return 'medium';
    return 'low';
  }

  score(applicationId: string): ScoreRiskResult {
    const application = this.applications.getApplication(applicationId);

    // Fingerprint over the stages that have reported, so a re-run that resets
    // state recomputes instead of serving a stale number.
    const fingerprint = this.state.getCompletedStages(applicationId).join('|');
    const cached = this.memo.get(applicationId);
    if (cached && cached.fingerprint === fingerprint && Date.now() - cached.at < MEMO_TTL_MS) {
      return cached.result;
    }

    const factors: RiskFactor[] = [
      ...this.documentFactors(applicationId),
      ...this.identityFactors(applicationId),
      ...this.addressFactors(applicationId),
      ...this.duplicateFactors(applicationId),
      ...this.graphFactors(applicationId),
      ...this.photoFactors(applicationId),
      ...this.ruleFactors(applicationId),
    ];

    const capped = this.applyCategoryCaps(factors);
    const categoryTotals = totalsByCategory(capped);
    const raw = capped.reduce((total, factor) => total + factor.points, 0);
    const score = Math.max(0, Math.min(100, Math.round(raw)));

    const missingStages = this.state.getMissingStages(applicationId);

    const result: ScoreRiskResult = {
      applicationId: application.applicationId,
      // MUST be `score`: PipelineStateService.getRiskScore() reads exactly this key.
      score,
      factors: capped,
      band: this.bandFor(score),
      confidence: this.confidence(missingStages.length, applicationId),
      categoryTotals,
      missingStages,
      // Alias for the acceptance suite and the branch's earlier consumers. The
      // `graph:` prefix on graph factors is asserted there — it is how the test
      // proves the score is genuinely graph-weighted rather than coincidentally high.
      contributions: capped.map((factor) => ({ factor: factor.factorId, points: factor.points })),
      scoredAt: new Date().toISOString(),
    };

    this.memo.set(applicationId, { fingerprint, at: Date.now(), result });
    return result;
  }

  /** Drop the memo for one application — called when the pipeline is re-run. */
  reset(applicationId: string): void {
    this.memo.delete(applicationId);
  }

  // =========================================================================
  // Category scorers
  // =========================================================================

  private documentFactors(applicationId: string): RiskFactor[] {
    const stage = this.stage(applicationId, 'document_validate');
    if (!stage) return [];

    const factors: RiskFactor[] = [];
    const missing = strings(stage['missingDocuments']);
    const expired = strings(stage['expiredDocuments']);
    const soon = strings(stage['expiringSoonDocuments']);

    if (missing.length > 0) {
      const consentMissing = missing.includes('parent_consent');
      factors.push(
        factor({
          factorId: `documents:missing_${missing.length}`,
          category: 'documents',
          // Absent parental consent is a statutory bar, not a paperwork gap.
          severity: consentMissing ? 'high' : 'medium',
          points: (consentMissing ? 10 : 6) * missing.length,
          reason: `${missing.length} required document(s) missing: ${missing.join(', ')}`,
          sourceStage: 'document_validate',
        })
      );
    }

    if (expired.length > 0) {
      factors.push(
        factor({
          factorId: `documents:expired_${expired.length}`,
          category: 'documents',
          severity: 'high',
          points: 9 * expired.length,
          reason: `${expired.length} submitted document(s) expired: ${expired.join(', ')}`,
          sourceStage: 'document_validate',
        })
      );
    }

    if (soon.length > 0) {
      factors.push(
        factor({
          factorId: `documents:expiring_soon_${soon.length}`,
          category: 'documents',
          severity: 'low',
          points: 2 * soon.length,
          reason: `${soon.length} document(s) expire within the processing window`,
          sourceStage: 'document_validate',
        })
      );
    }

    return factors;
  }

  private identityFactors(applicationId: string): RiskFactor[] {
    const stage = this.stage(applicationId, 'check_identity_consistency');
    if (!stage) return [];

    const factors: RiskFactor[] = [];

    for (const mismatch of records(stage['mismatches'])) {
      const field = String(mismatch['field'] ?? 'identity');
      const severity = severityOf(mismatch['severity']);

      // A DOB conflict is scored above a name conflict at equal severity: a name
      // has legitimate variant spellings and a date of birth does not.
      const base = field === 'dateOfBirth' ? 20 : severity === 'high' ? 15 : severity === 'medium' ? 9 : 3;

      factors.push(
        factor({
          factorId: `identity:${field}`,
          category: 'identity',
          severity,
          points: base,
          reason: `${field} disagrees across submitted documents`,
          sourceStage: 'check_identity_consistency',
        })
      );
    }

    // Extraction the pipeline could not read confidently makes the checks above
    // weaker, so it is scored as uncertainty rather than ignored.
    const uncertain = this.ocr
      .getExtractions(applicationId)
      .flatMap((extraction) => extraction.uncertainFields ?? []);

    if (uncertain.length > 0) {
      factors.push(
        factor({
          factorId: `identity:low_confidence_reads_${uncertain.length}`,
          category: 'identity',
          severity: 'low',
          points: Math.min(4, uncertain.length),
          reason: `${uncertain.length} field(s) extracted below the confidence floor`,
          sourceStage: 'ocr_extract',
        })
      );
    }

    return factors;
  }

  private addressFactors(applicationId: string): RiskFactor[] {
    const stage = this.stage(applicationId, 'check_address_consistency');
    if (!stage) return [];

    return records(stage['mismatches']).map((mismatch) => {
      const field = String(mismatch['field'] ?? 'address');
      const severity = severityOf(mismatch['severity']);

      // PIN code is the one exactly-checkable address field, so a difference there
      // is a discrepancy rather than a transcription variant.
      const base = field === 'pincode' ? 11 : severity === 'high' ? 8 : severity === 'medium' ? 5 : 2;

      return factor({
        factorId: `address:${field}`,
        category: 'address',
        severity,
        points: base,
        reason: `${field} on the address proof does not match the application form`,
        sourceStage: 'check_address_consistency',
      });
    });
  }

  private duplicateFactors(applicationId: string): RiskFactor[] {
    const stage = this.stage(applicationId, 'detect_duplicate_signals');
    if (!stage) return [];

    const signals = records(stage['signals']);
    if (signals.length === 0) return [];

    // Grouped by identifier kind rather than one factor per signal: four
    // pairwise phone links inside one cluster are ONE finding ("this phone number
    // is shared"), and listing them separately would inflate the score by cluster
    // size instead of by how many distinct things are actually wrong.
    const byKind = new Map<string, { severity: Severity; matched: Set<string> }>();

    for (const signal of signals) {
      const evidence = record(signal['evidence']);
      const kind = String(evidence['signalSubtype'] ?? signal['type'] ?? 'unknown');
      const severity = severityOf(signal['severity']);

      const existing = byKind.get(kind) ?? { severity, matched: new Set<string>() };
      if (severityRank(severity) > severityRank(existing.severity)) existing.severity = severity;
      existing.matched.add(String(signal['matchedApplicationId']));
      byKind.set(kind, existing);
    }

    return [...byKind.entries()]
      .sort((a, b) => severityRank(b[1].severity) - severityRank(a[1].severity) || a[0].localeCompare(b[0]))
      .map(([kind, group]) =>
        factor({
          factorId: `duplicates:${kind}`,
          category: 'duplicates',
          severity: group.severity,
          // Reach matters: one shared phone number across three applications is
          // worse than across one, but sub-linearly.
          points: SIGNAL_POINTS[group.severity] + Math.min(4, group.matched.size - 1) * 2,
          reason:
            `${kind.replace(/_/g, ' ')} reused across ${group.matched.size} other ` +
            `application(s): ${[...group.matched].sort().join(', ')}`,
          sourceStage: 'detect_duplicate_signals',
        })
      );
  }

  private graphFactors(applicationId: string): RiskFactor[] {
    const stage = this.stage(applicationId, 'build_risk_graph');
    if (!stage) return [];

    const clusterSize = Number(stage['clusterSize'] ?? 1);
    if (!Number.isFinite(clusterSize) || clusterSize <= 1) return [];

    const summary = record(stage['clusterSummary']);
    const factors: RiskFactor[] = [];

    // factorId MUST keep the `graph:` prefix — the acceptance suite asserts on it
    // to prove the score is graph-weighted.
    factors.push(
      factor({
        factorId: `graph:cluster_of_${clusterSize}`,
        category: 'graph',
        severity: clusterSize >= 3 ? 'high' : 'medium',
        points: Math.min(16, (clusterSize - 1) * 6),
        reason: `Application belongs to a connected cluster of ${clusterSize} applications`,
        sourceStage: 'build_risk_graph',
      })
    );

    if (summary['isCoordinatedPattern'] === true) {
      const kinds = strings(summary['sharedSignalKinds']);
      factors.push(
        factor({
          factorId: 'graph:coordinated_pattern',
          category: 'graph',
          severity: 'high',
          points: 12,
          reason:
            `Cluster shares ${kinds.length} distinct identifier types at density ` +
            `${String(summary['density'] ?? 'unknown')} — consistent with coordination`,
          sourceStage: 'build_risk_graph',
        })
      );
    }

    return factors;
  }

  private photoFactors(applicationId: string): RiskFactor[] {
    const factors: RiskFactor[] = [];

    const duplicates = this.stage(applicationId, 'detect_duplicate_signals');
    const reused = records(duplicates?.['signals']).filter(
      (signal) => signal['type'] === 'document_similarity'
    );

    if (reused.length > 0) {
      const matched = [...new Set(reused.map((signal) => String(signal['matchedApplicationId'])))];
      factors.push(
        factor({
          factorId: 'photo:reused_document_image',
          category: 'photo',
          severity: 'high',
          points: 14,
          reason:
            `A submitted document image is byte-identical to one filed with ` +
            `${matched.sort().join(', ')}`,
          sourceStage: 'detect_duplicate_signals',
        })
      );
    }

    // The optional visual stage, when it ran. Weighted low on purpose: it is a
    // similarity FLAG produced by a language model, not a biometric match, and
    // scoring it like proof would misrepresent what the system actually knows.
    const visual = this.stage(applicationId, 'visual_similarity_flag');
    if (visual?.['similarityFlag'] === 'likely_same' && visual['identicalImageHash'] !== true) {
      factors.push(
        factor({
          factorId: 'photo:visual_similarity_flag',
          category: 'photo',
          severity: 'medium',
          points: 5,
          reason:
            `Photograph flagged as likely the same person as ` +
            `${String(visual['compareToApplicationId'])} (advisory flag, not a biometric match)`,
          sourceStage: 'visual_similarity_flag',
        })
      );
    }

    return factors;
  }

  private ruleFactors(applicationId: string): RiskFactor[] {
    const stage = this.stage(applicationId, 'evaluate_rules');
    if (!stage) return [];

    const violations = records(stage['violations']);
    if (violations.length === 0) return [];

    const counts: Record<Severity, number> = { high: 0, medium: 0, low: 0 };
    for (const violation of violations) counts[severityOf(violation['severity'])] += 1;

    return (['high', 'medium', 'low'] as const)
      .filter((severity) => counts[severity] > 0)
      .map((severity) =>
        factor({
          factorId: `rules:${severity}_severity_x${counts[severity]}`,
          category: 'rules',
          severity,
          points: RULE_POINTS[severity] * counts[severity],
          reason: `${counts[severity]} ${severity}-severity policy rule(s) fired`,
          sourceStage: 'evaluate_rules',
        })
      );
  }

  // =========================================================================
  // Aggregation
  // =========================================================================

  /**
   * Scale each category's factors down proportionally when their sum exceeds the
   * cap.
   *
   * Proportional scaling rather than truncation, so the RELATIVE weight of the
   * factors inside a capped category survives into the UI's breakdown bars. If a
   * category were truncated by dropping factors, the officer would see a
   * breakdown that does not add up to the score they were shown.
   */
  private applyCategoryCaps(factors: readonly RiskFactor[]): RiskFactor[] {
    const sums = totalsByCategory(factors);

    return factors.map((entry) => {
      const cap = CATEGORY_CAPS[entry.category];
      const total = sums[entry.category] ?? 0;
      if (total <= cap) return entry;

      const scaled = Math.round((entry.points / total) * cap * 10) / 10;
      return { ...entry, points: scaled, weight: scaled };
    });
  }

  /**
   * How much of the pipeline reported in, 0..1.
   *
   * Two independent penalties, because they are different failures: a stage that
   * never ran means a whole dimension is unassessed, while a low-confidence read
   * means a stage ran on facts it could not fully see.
   */
  private confidence(missingStageCount: number, applicationId: string): number {
    const total = REQUIRED_STAGES_BEFORE_DECISION.length;
    const stageCoverage = total === 0 ? 1 : (total - missingStageCount) / total;

    const extractions = this.ocr.getExtractions(applicationId);
    const readQuality =
      extractions.length === 0
        ? 1
        : extractions.reduce((sum, extraction) => sum + extraction.confidence, 0) / extractions.length;

    // Weighted toward coverage: a missing stage is a bigger hole than a blurry
    // field, because nobody looked at all.
    return Math.round(Math.min(1, stageCoverage * 0.75 + readQuality * 0.25) * 100) / 100;
  }

  private stage(applicationId: string, name: string): Record<string, unknown> | undefined {
    const result = this.state.getStageResult(applicationId, name);
    return result && typeof result === 'object' ? (result as Record<string, unknown>) : undefined;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a factor with `weight` and `points` kept identical, as the contract requires. */
function factor(input: Omit<RiskFactor, 'weight'>): RiskFactor {
  return { ...input, weight: input.points };
}

function totalsByCategory(factors: readonly RiskFactor[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const entry of factors) {
    totals[entry.category] = Math.round(((totals[entry.category] ?? 0) + entry.points) * 10) / 10;
  }
  return totals;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function records(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((row): row is Record<string, unknown> => row !== null && typeof row === 'object')
    : [];
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function severityOf(value: unknown): Severity {
  return value === 'high' || value === 'medium' || value === 'low' ? value : 'medium';
}

function severityRank(severity: Severity): number {
  return severity === 'high' ? 3 : severity === 'medium' ? 2 : 1;
}
