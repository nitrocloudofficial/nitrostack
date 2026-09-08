import { Injectable } from '@nitrostack/core';
import { DataLoaderService } from './data-loader.service.js';
import { ChangeDetectionService } from './change-detection.service.js';
import { ConflictService } from './conflict.service.js';
import { RiskService } from './risk.service.js';
import { AuditService } from './audit.service.js';
import { ValidationService } from './validation.service.js';
import type {
  AuditEntry,
  ConflictResult,
  RiskAssessment,
} from '../types/index.js';

// ── Types ──────────────────────────────────────────────────────────────

export interface DepartmentHealth {
  department: string;
  total_documents: number;
  documents_with_conflicts: number;
  total_claims: number;
  conflicts: number;
  health_percentage: number;
}

export interface ComplianceReport {
  report_id: string;
  generated_at: string;
  scope: {
    department: string | null;
    min_risk_level: string;
  };
  summary: {
    total_policies_checked: number;
    policies_with_changes: number;
    total_claims_validated: number;
    conflicts_found: number;
    conflicts_remediated: number;
    conflicts_outstanding: number;
    knowledge_health_percentage: number;
  };
  outstanding_conflicts: {
    document_id: string;
    document_title: string;
    claim_id: string;
    claim_text: string;
    risk_level: string;
    risk_score: number;
    department: string;
    authoritative_source: string;
    authoritative_value: string;
  }[];
  remediation_history: AuditEntry[];
  department_breakdown: DepartmentHealth[];
}

// ── Helpers ────────────────────────────────────────────────────────────

const RISK_RANK: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

function meetsRiskThreshold(level: string, minimum: string): boolean {
  return (RISK_RANK[level] ?? 0) >= (RISK_RANK[minimum] ?? 0);
}

// ── Service ────────────────────────────────────────────────────────────

/**
 * ReportService — generates structured compliance reports aggregating
 * change detection, conflict analysis, risk scoring, and audit history.
 */
@Injectable({
  deps: [
    DataLoaderService,
    ChangeDetectionService,
    ConflictService,
    RiskService,
    AuditService,
    ValidationService,
  ],
})
export class ReportService {
  constructor(
    private readonly dataLoader: DataLoaderService,
    private readonly changeDetection: ChangeDetectionService,
    private readonly conflictService: ConflictService,
    private readonly riskService: RiskService,
    private readonly auditService: AuditService,
    private readonly validationService: ValidationService,
  ) {}

  /**
   * Generate a structured compliance report.
   */
  generateComplianceReport(options: {
    department?: string;
    minRiskLevel?: string;
    includeRemediated?: boolean;
  }): ComplianceReport {
    const department = options.department ?? null;
    const minRiskLevel = options.minRiskLevel ?? 'MEDIUM';
    const includeRemediated = options.includeRemediated !== false;

    // Step 1: Detect all changes
    const changeResult = this.changeDetection.detectChanges();

    // Step 2: Find all conflicts and assess risk
    const allConflicts: (ConflictResult & { risk: RiskAssessment })[] = [];
    let totalClaimsValidated = 0;

    for (const change of changeResult.changes) {
      try {
        const conflictReport = this.conflictService.detectConflicts(
          change.source_id,
          change.fact_key,
        );
        totalClaimsValidated += conflictReport.total_claims_checked;

        for (const result of conflictReport.results) {
          if (result.status === 'CONFLICT') {
            try {
              const risk = this.riskService.assessRisk(
                result.document_id,
                result.claim_id,
              );
              allConflicts.push({ ...result, risk });
            } catch {
              // Skip claims where risk assessment fails
            }
          }
        }
      } catch {
        // Skip facts with no dependencies
      }
    }

    // Step 3: Filter by department if specified
    const documents = this.dataLoader.getDocuments();
    const docMap = new Map(documents.map((d) => [d.id, d]));

    let filteredConflicts = allConflicts;
    if (department) {
      filteredConflicts = allConflicts.filter((conflict) => {
        const doc = docMap.get(conflict.document_id);
        return doc?.department.toLowerCase() === department.toLowerCase();
      });
    }

    // Step 4: Filter by risk level
    const riskyConflicts = filteredConflicts.filter((conflict) =>
      meetsRiskThreshold(conflict.risk.risk_level, minRiskLevel),
    );

    // Step 5: Get audit log for remediated items
    const auditLog = this.auditService.getLog({ limit: 500 });
    const remediationHistory = includeRemediated
      ? auditLog.filter((e) => e.action === 'UPDATE_APPLIED')
      : [];

    // Step 6: Build department breakdown
    const departmentBreakdown = this.getDepartmentBreakdown(department ?? undefined);

    // Step 7: Calculate metrics — scope applied count to the same conflicts
    const riskyClaimKeys = new Set(
      riskyConflicts.map((c) => `${c.document_id}:${c.claim_id}`),
    );
    const appliedCount = auditLog.filter(
      (e) =>
        e.action === 'UPDATE_APPLIED' &&
        riskyClaimKeys.has(`${e.document_id}:${e.claim_id}`),
    ).length;
    const outstandingCount = Math.max(0, riskyConflicts.length - appliedCount);

    const healthPercentage =
      totalClaimsValidated > 0
        ? Math.round(
            ((totalClaimsValidated - allConflicts.length) / totalClaimsValidated) * 100,
          )
        : 100;

    // Build outstanding conflicts list (sorted by risk score, highest first)
    const outstandingConflicts = riskyConflicts
      .map((conflict) => {
        const doc = docMap.get(conflict.document_id);
        const dep = this.dataLoader.getDependencyForClaim(
          conflict.document_id,
          conflict.claim_id,
        );
        const source = dep
          ? this.dataLoader.getSourceById(dep.source_id)
          : undefined;

        return {
          document_id: conflict.document_id,
          document_title: conflict.document_title,
          claim_id: conflict.claim_id,
          claim_text: conflict.claim_text,
          risk_level: conflict.risk.risk_level,
          risk_score: conflict.risk.risk_score,
          department: doc?.department ?? 'Unknown',
          authoritative_source: dep
            ? `${dep.source_id}.${dep.fact_key}`
            : 'unknown',
          authoritative_value:
            source && dep ? (source.facts[dep.fact_key] ?? 'unknown') : 'unknown',
        };
      })
      .sort((a, b) => b.risk_score - a.risk_score);

    return {
      report_id: crypto.randomUUID(),
      generated_at: new Date().toISOString(),
      scope: {
        department,
        min_risk_level: minRiskLevel,
      },
      summary: {
        total_policies_checked: changeResult.total_sources_checked,
        policies_with_changes: changeResult.sources_with_changes,
        total_claims_validated: totalClaimsValidated,
        conflicts_found: riskyConflicts.length,
        conflicts_remediated: appliedCount,
        conflicts_outstanding: outstandingCount,
        knowledge_health_percentage: healthPercentage,
      },
      outstanding_conflicts: outstandingConflicts,
      remediation_history: remediationHistory,
      department_breakdown: departmentBreakdown,
    };
  }

  /**
   * Get per-department health breakdown.
   */
  getDepartmentBreakdown(department?: string): DepartmentHealth[] {
    const documents = this.dataLoader.getDocuments();
    const dependencies = this.dataLoader.getDependencies();
    const changeResult = this.changeDetection.detectChanges();

    // Build a set of changed facts for quick lookup
    const changedFacts = new Set(
      changeResult.changes.map((c) => `${c.source_id}.${c.fact_key}`),
    );

    // Group documents by department
    const deptDocs = new Map<string, typeof documents>();
    for (const doc of documents) {
      if (department && doc.department.toLowerCase() !== department.toLowerCase()) {
        continue;
      }
      const existing = deptDocs.get(doc.department) ?? [];
      existing.push(doc);
      deptDocs.set(doc.department, existing);
    }

    const result: DepartmentHealth[] = [];

    for (const [dept, docs] of deptDocs) {
      let totalClaims = 0;
      let conflictClaims = 0;
      const docsWithConflicts = new Set<string>();

      for (const doc of docs) {
        for (const claim of doc.claims) {
          totalClaims++;

          // Check if this claim depends on a changed fact
          const dep = dependencies.find(
            (d) =>
              d.dependent_document_id === doc.id &&
              d.dependent_claim_id === claim.id,
          );
          if (dep && changedFacts.has(`${dep.source_id}.${dep.fact_key}`)) {
            try {
              const validation = this.validationService.validateClaim(
                doc.id,
                claim.id,
              );
              if (validation.status === 'CONFLICT') {
                conflictClaims++;
                docsWithConflicts.add(doc.id);
              }
            } catch {
              // Skip validation errors
            }
          }
        }
      }

      const healthPct =
        totalClaims > 0
          ? Math.round(((totalClaims - conflictClaims) / totalClaims) * 100)
          : 100;

      result.push({
        department: dept,
        total_documents: docs.length,
        documents_with_conflicts: docsWithConflicts.size,
        total_claims: totalClaims,
        conflicts: conflictClaims,
        health_percentage: healthPct,
      });
    }

    return result.sort((a, b) => a.health_percentage - b.health_percentage);
  }
}
