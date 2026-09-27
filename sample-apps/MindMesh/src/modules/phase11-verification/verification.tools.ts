import { ToolDecorator as Tool, Widget, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { MemoryStore } from '../../core/memory/memory.store.js';
import { generateId } from '../../utils/id-generator.js';
import { VerificationCheck, Claim } from '../../core/memory/session.schema.js';

/**
 * Phase 11: Research Verification Engine
 *
 * Aggregates verification checks for claims, citations, methodology consistency.
 */
@Injectable({ deps: [MemoryStore] })
export class VerificationTools {
  constructor(private memory: MemoryStore) {}

  @Tool({
    name: 'verify_claim',
    description: 'Verify a claim against extracted evidence',
    inputSchema: z.object({
      claimId: z.string().describe('Claim ID to verify'),
      evidence: z.array(z.string()).describe('Evidence text snippets'),
      sessionId: z.string().describe('Session ID'),
    }),
    invocation: {
      invoking: 'Verifying claim against evidence...',
      invoked: 'Claim verification complete'
    },
    examples: {
      request: { claimId: 'c1', evidence: ['Our method achieves 95% accuracy on ImageNet', 'We evaluate on standard benchmarks'], sessionId: 'sess_001' },
      response: { claimId: 'c1', claimText: 'Our method achieves 95% accuracy on ImageNet', checkType: 'claim-support', passed: true, detail: 'Found 8/12 key terms in evidence', evidenceCount: 2 }
    }
  })
  @Widget('research-pilot-shell')
  async verifyClaim(
    input: { claimId: string; evidence: string[]; sessionId: string },
    ctx: ExecutionContext
  ) {
    const { claimId, evidence, sessionId } = input;

    ctx.logger.info('Verifying claim', { claimId, sessionId });

    const claim = this.memory.getClaims(sessionId).find(c => c.claimId === claimId);
    if (!claim) {
      throw new Error(`Claim ${claimId} not found`);
    }

    // Check if claim text is supported by evidence
    const claimText = claim.text.toLowerCase();
    let supported = false;
    let supportDetails = '';

    for (const ev of evidence) {
      const evLower = ev.toLowerCase();
      // Check for key terms overlap
      const claimTerms = claimText.match(/\b\w{4,}\b/g) || [];
      const matchingTerms = claimTerms.filter(t => evLower.includes(t));
      const overlap = matchingTerms.length / Math.max(claimTerms.length, 1);

      if (overlap > 0.4) {
        supported = true;
        supportDetails = `Found ${matchingTerms.length}/${claimTerms.length} key terms in evidence`;
        break;
      }
    }

    const check: VerificationCheck = {
      checkId: generateId('verify'),
      claimId,
      checkType: 'claim-support',
      passed: supported,
      detail: supported ? supportDetails : 'Insufficient evidence to support claim',
      evidence: evidence.slice(0, 3),
      checkedAt: new Date().toISOString(),
    };

    this.memory.addVerificationChecks(sessionId, [check]);

    return {
      claimId,
      claimText: claim.text,
      checkType: 'claim-support',
      passed: supported,
      detail: supportDetails,
      evidenceCount: evidence.length,
    };
  }

  @Tool({
    name: 'verify_citation',
    description: 'Verify citation accuracy against paper metadata',
    inputSchema: z.object({
      paperId: z.string().describe('Paper ID'),
      citationText: z.string().describe('Citation text to verify'),
      sessionId: z.string().describe('Session ID'),
    }),
    invocation: {
      invoking: 'Verifying citation accuracy...',
      invoked: 'Citation verification complete'
    },
    examples: {
      request: { paperId: 'p1', citationText: 'Dao et al. (2022). FlashAttention: Fast and Memory-Efficient Exact Attention. NeurIPS.', sessionId: 'sess_001' },
      response: { paperId: 'p1', passed: true, issues: [], paperMetadata: { title: 'FlashAttention: Fast and Memory-Efficient Exact Attention', authors: ['T. Dao', 'D. Fu', 'S. Ermon'], year: 2022 } }
    }
  })
  @Widget('research-pilot-shell')
  async verifyCitation(
    input: { paperId: string; citationText: string; sessionId: string },
    ctx: ExecutionContext
  ) {
    const { paperId, citationText, sessionId } = input;

    ctx.logger.info('Verifying citation', { paperId, sessionId });

    const paper = this.memory.getPaper(sessionId, paperId);
    if (!paper) {
      throw new Error(`Paper ${paperId} not found`);
    }

    const issues: string[] = [];

    // Check author names
    if (paper.authors.length > 0) {
      const firstAuthor = paper.authors[0].split(' ').pop()?.toLowerCase();
      if (firstAuthor && !citationText.toLowerCase().includes(firstAuthor)) {
        issues.push(`First author "${paper.authors[0]}" not found in citation`);
      }
    }

    // Check year
    if (paper.year && !citationText.includes(paper.year.toString())) {
      issues.push(`Year ${paper.year} not found in citation`);
    }

    // Check title (partial match)
    const titleWords = paper.title.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    const titleMatches = titleWords.filter(w => citationText.toLowerCase().includes(w));
    if (titleMatches.length < Math.min(3, titleWords.length)) {
      issues.push(`Title words poorly matched (${titleMatches.length}/${titleWords.length})`);
    }

    const check: VerificationCheck = {
      checkId: generateId('verify'),
      claimId: paperId,
      checkType: 'citation-accuracy',
      passed: issues.length === 0,
      detail: issues.length === 0 ? 'Citation matches paper metadata' : issues.join('; '),
      evidence: [citationText],
      checkedAt: new Date().toISOString(),
    };

    this.memory.addVerificationChecks(sessionId, [check]);

    return {
      paperId,
      passed: issues.length === 0,
      issues,
      paperMetadata: {
        title: paper.title,
        authors: paper.authors,
        year: paper.year,
      },
    };
  }

  @Tool({
    name: 'verify_methodology_consistency',
    description: 'Check if methodology claims are consistent across papers',
    inputSchema: z.object({
      sessionId: z.string().describe('Session ID'),
    }),
    invocation: {
      invoking: 'Verifying methodology consistency...',
      invoked: 'Methodology consistency check complete'
    },
    examples: {
      request: { sessionId: 'sess_001' },
      response: { sessionId: 'sess_001', passed: true, methodologyCount: 5, issues: [] }
    }
  })
  @Widget('research-pilot-shell')
  async verifyMethodologyConsistency(
    input: { sessionId: string },
    ctx: ExecutionContext
  ) {
    const { sessionId } = input;

    ctx.logger.info('Verifying methodology consistency', { sessionId });

    const methods = this.memory.getMethodologies(sessionId);
    const issues: string[] = [];

    // Check for contradictory methodology claims
    for (let i = 0; i < methods.length; i++) {
      for (let j = i + 1; j < methods.length; j++) {
        const m1 = methods[i];
        const m2 = methods[j];

        // Check if they claim same thing with different approaches
        const desc1 = m1.description.toLowerCase();
        const desc2 = m2.description.toLowerCase();

        if (this.areContradictory(desc1, desc2)) {
          issues.push(`Potential contradiction between ${m1.paperId} and ${m2.paperId}: ${m1.name} vs ${m2.name}`);
        }
      }
    }

    const check: VerificationCheck = {
      checkId: generateId('verify'),
      claimId: 'methodology-consistency',
      checkType: 'methodology-consistency',
      passed: issues.length === 0,
      detail: issues.length === 0 ? 'No methodology contradictions found' : issues.join('; '),
      evidence: methods.map(m => m.paperId),
      checkedAt: new Date().toISOString(),
    };

    this.memory.addVerificationChecks(sessionId, [check]);

    return {
      sessionId,
      passed: issues.length === 0,
      methodologyCount: methods.length,
      issues,
    };
  }

  @Tool({
    name: 'compile_verification_summary',
    description: 'Compile all verification checks into a summary report',
    inputSchema: z.object({
      sessionId: z.string().describe('Session ID'),
    }),
    invocation: {
      invoking: 'Compiling verification summary...',
      invoked: 'Verification summary compiled'
    },
    examples: {
      request: { sessionId: 'sess_001' },
      response: { sessionId: 'sess_001', summary: '15/18 checks passed', totalChecks: 18, passedChecks: 15, failedChecks: 3, byType: [{ type: 'claim-support', passed: 8, total: 10, rate: '80.0%' }], flaggedChecks: [{ checkId: 'v3', type: 'citation-accuracy', claimId: 'p1', detail: 'First author not found in citation' }] }
    }
  })
  @Widget('research-pilot-shell')
  async compileVerificationSummary(
    input: { sessionId: string },
    ctx: ExecutionContext
  ) {
    const { sessionId } = input;

    ctx.logger.info('Compiling verification summary', { sessionId });

    const checks = this.memory.getVerificationChecks(sessionId);
    const passed = checks.filter(c => c.passed).length;

    const byType = new Map<string, { total: number; passed: number }>();
    for (const check of checks) {
      const existing = byType.get(check.checkType) || { total: 0, passed: 0 };
      existing.total++;
      if (check.passed) existing.passed++;
      byType.set(check.checkType, existing);
    }

    return {
      sessionId,
      summary: `${passed}/${checks.length} checks passed`,
      totalChecks: checks.length,
      passedChecks: passed,
      failedChecks: checks.length - passed,
      byType: Array.from(byType.entries()).map(([type, stats]) => ({
        type,
        passed: stats.passed,
        total: stats.total,
        rate: (stats.passed / stats.total * 100).toFixed(1) + '%',
      })),
      flaggedChecks: checks.filter(c => !c.passed).map(c => ({
        checkId: c.checkId,
        type: c.checkType,
        claimId: c.claimId,
        detail: c.detail,
      })),
    };
  }

  @Tool({
    name: 'run_all_verifications',
    description: 'Run all verification checks for a session',
    inputSchema: z.object({
      sessionId: z.string().describe('Session ID'),
    }),
    invocation: {
      invoking: 'Running comprehensive verification suite...',
      invoked: 'All verifications complete'
    },
    examples: {
      request: { sessionId: 'sess_001' },
      response: { sessionId: 'sess_001', claimVerifications: [{ claimId: 'c1', claimText: 'Method improves accuracy', checkType: 'claim-support', passed: true, detail: 'Found 5/8 key terms in evidence', evidenceCount: 3 }], citationVerifications: [{ paperId: 'p1', passed: true, issues: [], paperMetadata: { title: 'DP-FedAvg', authors: ['Smith', 'Doe'], year: 2023 } }], methodologyConsistency: { sessionId: 'sess_001', passed: true, methodologyCount: 5, issues: [] }, summary: { sessionId: 'sess_001', summary: '15/18 checks passed', totalChecks: 18, passedChecks: 15, failedChecks: 3 } }
    }
  })
  @Widget('research-pilot-shell')
  async runAllVerifications(
    input: { sessionId: string },
    ctx: ExecutionContext
  ) {
    const { sessionId } = input;

    ctx.logger.info('Running all verifications', { sessionId });

    // Verify all claims
    const claims = this.memory.getClaims(sessionId);
    const claimResults = [];

    for (const claim of claims) {
      const evidence = this.memory.getClaims(sessionId)
        .filter(c => c.paperId === claim.paperId)
        .map(c => c.text);

      const result = await this.verifyClaim({ claimId: claim.claimId, evidence, sessionId }, ctx);
      claimResults.push(result);
    }

    // Verify citations
    const papers = this.memory.getPapers(sessionId);
    const citationResults = [];

    for (const paper of papers.slice(0, 10)) { // Limit to 10
      const citation = `${paper.authors[0] || 'Unknown'} et al. (${paper.year || 'XXXX'}). ${paper.title}. ${paper.venue || 'Unknown venue'}.`;
      const result = await this.verifyCitation({ paperId: paper.paperId, citationText: citation, sessionId }, ctx);
      citationResults.push(result);
    }

    // Methodology consistency
    const methodResult = await this.verifyMethodologyConsistency({ sessionId }, ctx);

    // Compile summary
    const summary = await this.compileVerificationSummary({ sessionId }, ctx);

    return {
      sessionId,
      claimVerifications: claimResults,
      citationVerifications: citationResults,
      methodologyConsistency: methodResult,
      summary,
    };
  }

  private areContradictory(desc1: string, desc2: string): boolean {
    const opposites = [
      ['supervised', 'unsupervised'],
      ['online', 'offline'],
      ['centralized', 'decentralized'],
      ['batch', 'streaming'],
      ['deterministic', 'probabilistic'],
      ['exact', 'approximate'],
    ];

    for (const [a, b] of opposites) {
      if (desc1.includes(a) && desc2.includes(b)) return true;
      if (desc1.includes(b) && desc2.includes(a)) return true;
    }
    return false;
  }
}