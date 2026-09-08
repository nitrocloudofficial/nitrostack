import { Injectable } from '@nitrostack/core';
import { DataLoaderService } from './data-loader.service.js';
import { ChangeDetectionService } from './change-detection.service.js';
import { DependencyService } from './dependency.service.js';
import { ConflictService } from './conflict.service.js';
import { RiskService } from './risk.service.js';
import type { RiskAssessment } from '../types/index.js';

// ── Types ──────────────────────────────────────────────────────────────

export interface SourceDrift {
  source_id: string;
  source_title: string;
  facts_changed: number;
  total_facts: number;
  dependent_claims: number;
  conflicts: number;
}

export interface DriftSummary {
  total_facts: number;
  changed_facts: number;
  drift_percentage: number;
  total_dependent_claims: number;
  claims_valid: number;
  claims_conflicting: number;
  claims_ambiguous: number;
  staleness_score: number;
  most_affected_department: string | null;
  highest_risk_document: string | null;
  per_source_drift: SourceDrift[];
}

// ── Service ────────────────────────────────────────────────────────────

/**
 * DriftService — computes overall knowledge staleness metrics in a single call.
 *
 * Answers the question: "How stale is our knowledge base?"
 */
@Injectable({
  deps: [
    DataLoaderService,
    ChangeDetectionService,
    DependencyService,
    ConflictService,
    RiskService,
  ],
})
export class DriftService {
  constructor(
    private readonly dataLoader: DataLoaderService,
    private readonly changeDetection: ChangeDetectionService,
    private readonly dependencyService: DependencyService,
    private readonly conflictService: ConflictService,
    private readonly riskService: RiskService,
  ) {}

  /**
   * Compute a full knowledge drift summary.
   *
   * @param sourceId  Optional — scope to a single authoritative source.
   */
  getDriftSummary(sourceId?: string): DriftSummary {
    const changeResult = this.changeDetection.detectChanges(sourceId);

    // Count total facts across all current sources (scoped or global)
    const sources = this.dataLoader.getAuthoritativeSources();
    const relevantSources = sourceId
      ? sources.filter((s) => s.id === sourceId)
      : sources;

    let totalFacts = 0;
    for (const source of relevantSources) {
      totalFacts += Object.keys(source.facts).length;
    }

    // Aggregate per-source drift and conflict counts
    const perSourceDrift: SourceDrift[] = [];
    let totalDependentClaims = 0;
    let claimsValid = 0;
    let claimsConflicting = 0;
    let claimsAmbiguous = 0;

    // Track department exposure and highest-risk document
    const departmentConflicts = new Map<string, number>();
    let highestRisk: RiskAssessment | null = null;

    // Group changes by source
    const changesBySource = new Map<string, typeof changeResult.changes>();
    for (const change of changeResult.changes) {
      const existing = changesBySource.get(change.source_id) ?? [];
      existing.push(change);
      changesBySource.set(change.source_id, existing);
    }

    for (const source of relevantSources) {
      const sourceChanges = changesBySource.get(source.id) ?? [];
      let sourceDependentClaims = 0;
      let sourceConflicts = 0;

      for (const change of sourceChanges) {
        try {
          const conflictReport = this.conflictService.detectConflicts(
            change.source_id,
            change.fact_key,
          );
          sourceDependentClaims += conflictReport.total_claims_checked;
          totalDependentClaims += conflictReport.total_claims_checked;
          claimsValid += conflictReport.valid;
          claimsConflicting += conflictReport.conflicts;
          claimsAmbiguous += conflictReport.ambiguous;
          sourceConflicts += conflictReport.conflicts;

          // Track departments and risk for conflict claims
          for (const result of conflictReport.results) {
            if (result.status === 'CONFLICT') {
              const doc = this.dataLoader.getDocumentById(result.document_id);
              if (doc) {
                const count = departmentConflicts.get(doc.department) ?? 0;
                departmentConflicts.set(doc.department, count + 1);
              }

              try {
                const risk = this.riskService.assessRisk(
                  result.document_id,
                  result.claim_id,
                );
                if (!highestRisk || risk.risk_score > highestRisk.risk_score) {
                  highestRisk = risk;
                }
              } catch {
                // Risk assessment may fail for edge cases — skip
              }
            }
          }
        } catch {
          // Skip facts with no dependencies
        }
      }

      perSourceDrift.push({
        source_id: source.id,
        source_title: source.title,
        facts_changed: sourceChanges.length,
        total_facts: Object.keys(source.facts).length,
        dependent_claims: sourceDependentClaims,
        conflicts: sourceConflicts,
      });
    }

    // Determine most affected department
    let mostAffectedDepartment: string | null = null;
    let maxConflicts = 0;
    for (const [dept, count] of departmentConflicts) {
      if (count > maxConflicts) {
        maxConflicts = count;
        mostAffectedDepartment = dept;
      }
    }

    // Calculate staleness score
    const driftPercentage =
      totalFacts > 0
        ? Math.round((changeResult.changes.length / totalFacts) * 100)
        : 0;

    const stalenessScore =
      totalDependentClaims > 0
        ? Math.round((claimsConflicting / totalDependentClaims) * 100)
        : 0;

    return {
      total_facts: totalFacts,
      changed_facts: changeResult.changes.length,
      drift_percentage: driftPercentage,
      total_dependent_claims: totalDependentClaims,
      claims_valid: claimsValid,
      claims_conflicting: claimsConflicting,
      claims_ambiguous: claimsAmbiguous,
      staleness_score: stalenessScore,
      most_affected_department: mostAffectedDepartment,
      highest_risk_document: highestRisk?.document_id ?? null,
      per_source_drift: perSourceDrift,
    };
  }
}
