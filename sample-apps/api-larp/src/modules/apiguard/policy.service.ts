import { Injectable } from '@nitrostack/core';
import type { Assessment, PolicyEvaluation } from '../../domain/types.js';
import { randomUUID } from 'node:crypto';
import { SpecRepository } from './spec.repository.js';

function parseMajorVersion(v?: string): number | null {
  if (!v || typeof v !== 'string') return null;
  const match = v.match(/^v?(\d+)/i);
  return match ? parseInt(match[1]!, 10) : null;
}

@Injectable({ deps: [SpecRepository] })
export class PolicyService {
  constructor(private readonly specs: SpecRepository) {}

  async evaluate(assessment: Assessment, profile: 'STRICT' | 'BALANCED'): Promise<PolicyEvaluation> {
    const rules: PolicyEvaluation['rules'] = [];
    let overallVerdict: PolicyEvaluation['verdict'] = 'ALLOW';

    const breakingChanges = assessment.changes.filter(c => c.breaking);
    
    // POL-001: analysis completeness
    if (assessment.analysisStatus === 'FAILED' || assessment.analysisStatus === 'INCOMPLETE') {
      rules.push({
        ruleId: 'POL-001',
        result: 'FAIL',
        effect: 'BLOCK',
        explanation: 'Analysis is FAILED or INCOMPLETE.',
        evidenceRefs: []
      });
    } else {
      rules.push({
        ruleId: 'POL-001',
        result: 'PASS',
        effect: 'NONE',
        explanation: 'Analysis completed successfully.',
        evidenceRefs: []
      });
    }

    // POL-002: repository coverage
    if (assessment.coverage.repositoriesFailed > 0) {
      const effect = profile === 'STRICT' ? 'BLOCK' : 'MANUAL_REVIEW';
      rules.push({
        ruleId: 'POL-002',
        result: 'FAIL',
        effect,
        explanation: `${assessment.coverage.repositoriesFailed} repositories failed to scan.`,
        evidenceRefs: []
      });
    } else {
      rules.push({
        ruleId: 'POL-002',
        result: 'PASS',
        effect: 'NONE',
        explanation: 'All repositories scanned successfully.',
        evidenceRefs: []
      });
    }

    // POL-004: Semantic Versioning
    let baselineVersionStr: string | undefined;
    let candidateVersionStr: string | undefined;
    try {
      const scenario = await this.specs.getScenario(assessment.scenarioId);
      baselineVersionStr = (scenario.baseline?.info as any)?.version;
      candidateVersionStr = (scenario.candidate?.info as any)?.version;
    } catch {
      // Scenario specs may not be on disk if dynamic inline
    }

    const baselineMajor = parseMajorVersion(baselineVersionStr);
    const candidateMajor = parseMajorVersion(candidateVersionStr);

    if (breakingChanges.length > 0) {
      if (baselineMajor !== null && candidateMajor !== null && candidateMajor > baselineMajor) {
        rules.push({
          ruleId: 'POL-004',
          result: 'PASS',
          effect: 'NONE',
          explanation: `Breaking changes accompanied by major SemVer increment (${baselineVersionStr} -> ${candidateVersionStr}).`,
          evidenceRefs: []
        });
      } else {
        const effect = profile === 'STRICT' ? 'BLOCK' : 'MANUAL_REVIEW';
        rules.push({
          ruleId: 'POL-004',
          result: 'FAIL',
          effect,
          explanation: `Breaking changes detected without major version bump (baseline: ${baselineVersionStr || 'unknown'}, candidate: ${candidateVersionStr || 'unknown'}).`,
          evidenceRefs: []
        });
      }
    } else {
      rules.push({
        ruleId: 'POL-004',
        result: 'PASS',
        effect: 'NONE',
        explanation: 'No breaking changes detected.',
        evidenceRefs: []
      });
    }

    // POL-005: confirmed production impact
    const confirmedImpacts = assessment.evidence.filter(e => e.classification === 'CONFIRMED_IMPACT');
    if (confirmedImpacts.length > 0) {
      rules.push({
        ruleId: 'POL-005',
        result: 'FAIL',
        effect: 'BLOCK',
        explanation: 'Confirmed consumer impact detected.',
        evidenceRefs: confirmedImpacts.map(e => e.id)
      });
    } else {
      rules.push({
        ruleId: 'POL-005',
        result: 'PASS',
        effect: 'NONE',
        explanation: 'No confirmed consumer impact.',
        evidenceRefs: []
      });
    }

    // POL-006: ambiguous evidence
    const ambiguousImpacts = assessment.evidence.filter(e => e.classification === 'REVIEW_REQUIRED');
    if (ambiguousImpacts.length > 0) {
      rules.push({
        ruleId: 'POL-006',
        result: 'FAIL',
        effect: 'MANUAL_REVIEW',
        explanation: 'Evidence requires manual review.',
        evidenceRefs: ambiguousImpacts.map(e => e.id)
      });
    }

    // POL-007: ownership completeness
    if (assessment.ownershipResolution) {
      const unresolved = assessment.ownershipResolution.unresolvedCount;
      if (unresolved > 0) {
        const effect = profile === 'STRICT' ? 'BLOCK' : 'MANUAL_REVIEW';
        rules.push({
          ruleId: 'POL-007',
          result: 'FAIL',
          effect,
          explanation: `${unresolved} affected files have unresolved owners.`,
          evidenceRefs: []
        });
      } else {
        rules.push({
          ruleId: 'POL-007',
          result: 'PASS',
          effect: 'NONE',
          explanation: 'All affected code is owned.',
          evidenceRefs: []
        });
      }
    }

    // Calculate overall verdict
    for (const rule of rules) {
      if (rule.effect === 'BLOCK') {
        overallVerdict = 'BLOCK';
        break;
      }
      if (rule.effect === 'MANUAL_REVIEW') {
        overallVerdict = 'MANUAL_REVIEW';
      }
    }

    return {
      evaluationId: `eval_${randomUUID().slice(0, 8)}`,
      assessmentId: assessment.id,
      assessmentVersion: assessment.version,
      policyProfile: profile,
      policyVersion: '1.0.0',
      verdict: overallVerdict,
      rules,
      evaluatedAt: new Date().toISOString()
    };
  }
}
