/**
 * PRPilot — Review Dossier Synthesizer Service
 * Deterministically constructs evidence-backed review dossiers and reviewer routes.
 */

import {
  ChangeMap,
  CheckItem,
  ExplicitReference,
  LinkedContext,
  PullRequestMetadata,
  ReviewDossier,
  ReviewerRouteStep,
  VerificationEvidence,
} from './pull-request.types.js';

export class DossierService {
  /**
   * Parse explicit issue/PR references from text (PR description and commit messages)
   */
  extractReferences(
    text: string,
    source: 'description' | 'commit_message'
  ): { issues: ExplicitReference[]; prs: ExplicitReference[] } {
    if (!text || typeof text !== 'string') {
      return { issues: [], prs: [] };
    }

    const issues: ExplicitReference[] = [];
    const prs: ExplicitReference[] = [];
    const seenNumbers = new Set<number>();

    // Matches "#123", "GH-123", or GitHub issue/PR URLs
    const hashRegex = /(?:#|gh-)(\d+)\b/gi;
    let match: RegExpExecArray | null;

    while ((match = hashRegex.exec(text)) !== null) {
      const num = parseInt(match[1], 10);
      if (!seenNumbers.has(num)) {
        seenNumbers.add(num);
        issues.push({
          reference: `#${num}`,
          number: num,
          source,
          relationship: 'explicit_reference',
        });
      }
    }

    const urlRegex = /https:\/\/github\.com\/[^/]+\/[^/]+\/(issues|pull)\/(\d+)/gi;
    while ((match = urlRegex.exec(text)) !== null) {
      const type = match[1];
      const num = parseInt(match[2], 10);
      if (!seenNumbers.has(num)) {
        seenNumbers.add(num);
        const refObj: ExplicitReference = {
          reference: `#${num}`,
          number: num,
          source,
          html_url: match[0],
          relationship: 'explicit_reference',
        };
        if (type === 'pull') {
          prs.push(refObj);
        } else {
          issues.push(refObj);
        }
      }
    }

    return { issues, prs };
  }

  /**
   * Synthesize verification evidence with honest missing check reporting
   */
  buildVerificationEvidence(
    headSha: string,
    checkRunsData: any,
    commitStatusesData: any[]
  ): VerificationEvidence {
    const checks: CheckItem[] = [];

    // Process Check Runs
    if (checkRunsData && Array.isArray(checkRunsData.check_runs)) {
      for (const cr of checkRunsData.check_runs) {
        checks.push({
          name: cr.name || 'Unnamed Check',
          source: 'check_run',
          status: cr.status || 'completed',
          conclusion: cr.conclusion || null,
          details_url: cr.html_url || cr.details_url || null,
          started_at: cr.started_at || null,
          completed_at: cr.completed_at || null,
        });
      }
    }

    // Process Commit Statuses
    if (Array.isArray(commitStatusesData)) {
      for (const cs of commitStatusesData) {
        let mappedConclusion: CheckItem['conclusion'] = null;
        let mappedStatus: CheckItem['status'] = 'completed';

        if (cs.state === 'success') {
          mappedConclusion = 'success';
        } else if (cs.state === 'failure' || cs.state === 'error') {
          mappedConclusion = 'failure';
        } else if (cs.state === 'pending') {
          mappedStatus = 'pending';
          mappedConclusion = null;
        }

        checks.push({
          name: cs.context || 'Commit Status',
          source: 'commit_status',
          status: mappedStatus,
          conclusion: mappedConclusion,
          details_url: cs.target_url || null,
          started_at: cs.created_at || null,
          completed_at: cs.updated_at || null,
        });
      }
    }

    let passing = 0;
    let failing = 0;
    let pending = 0;
    let skipped = 0;

    for (const c of checks) {
      if (c.conclusion === 'success') {
        passing++;
      } else if (
        c.conclusion === 'failure' ||
        c.conclusion === 'timed_out' ||
        c.conclusion === 'action_required'
      ) {
        failing++;
      } else if (c.status === 'in_progress' || c.status === 'queued' || c.status === 'pending') {
        pending++;
      } else if (c.conclusion === 'skipped' || c.conclusion === 'neutral') {
        skipped++;
      }
    }

    let overall_status: VerificationEvidence['summary']['overall_status'] = 'no_checks_found';
    let honestAssessment = '';

    const shortSha = headSha ? headSha.slice(0, 7) : 'unknown';

    if (checks.length === 0) {
      overall_status = 'no_checks_found';
      honestAssessment = `No CI checks or status checks were found for commit ${shortSha}. Do not assume tests pass without verified CI automation.`;
    } else if (failing > 0) {
      overall_status = 'failing';
      honestAssessment = `${failing} check(s) failed on commit ${shortSha}. Human reviewer must inspect failure logs before merge.`;
    } else if (pending > 0) {
      overall_status = 'pending';
      honestAssessment = `${pending} check(s) are still pending/in-progress on commit ${shortSha}. Final review requires check completion.`;
    } else if (passing === checks.length) {
      overall_status = 'passing';
      honestAssessment = `All ${passing} retrieved CI check(s) passed on commit ${shortSha}.`;
    } else {
      overall_status = 'mixed';
      honestAssessment = `${passing} passing, ${skipped} skipped/neutral out of ${checks.length} checks.`;
    }

    return {
      head_sha: headSha,
      collected_at: new Date().toISOString(),
      summary: {
        total: checks.length,
        passing,
        failing,
        pending,
        skipped,
        overall_status,
      },
      checks,
      honest_assessment: honestAssessment,
    };
  }

  /**
   * Deterministically assemble the reviewer route
   */
  generateReviewerRoute(
    pr: PullRequestMetadata,
    changeMap: ChangeMap,
    verification: VerificationEvidence,
    linkedContext: LinkedContext
  ): ReviewerRouteStep[] {
    const steps: ReviewerRouteStep[] = [];
    let stepNum = 1;

    // Step 1: High severity review signals (security, auth, migrations)
    const highSignals = changeMap.investigation_signals.filter((s) => s.severity === 'high');
    if (highSignals.length > 0) {
      const paths = highSignals.map((s) => s.file_path).filter((p): p is string => Boolean(p));
      steps.push({
        step_number: stepNum++,
        title: 'Inspect High-Risk Boundaries First',
        target_paths: paths.length > 0 ? paths : ['Security-sensitive modules'],
        what_to_look_for: highSignals.map((s) => s.title).join('; '),
        evidence_source: highSignals.map((s) => s.evidence_reference).join(' | '),
      });
    }

    // Step 2: Core application logic modifications
    const appLogicFiles = changeMap.categories.application_logic;
    if (appLogicFiles.length > 0) {
      const topAppFiles = appLogicFiles
        .sort((a, b) => b.changes - a.changes)
        .slice(0, 4)
        .map((f) => f.filename);

      steps.push({
        step_number: stepNum++,
        title: 'Review Core Application Logic',
        target_paths: topAppFiles,
        what_to_look_for:
          'Inspect functional changes, error handling, algorithm changes, and potential side-effects on existing behavior.',
        evidence_source: `${appLogicFiles.length} application logic file(s) changed (+${appLogicFiles.reduce((acc, f) => acc + f.additions, 0)}/-${appLogicFiles.reduce((acc, f) => acc + f.deletions, 0)})`,
      });
    }

    // Step 3: Test coverage & regression verification
    const testFiles = changeMap.categories.tests;
    if (testFiles.length > 0) {
      steps.push({
        step_number: stepNum++,
        title: 'Verify Test Coverage & Assertions',
        target_paths: testFiles.slice(0, 3).map((f) => f.filename),
        what_to_look_for:
          'Ensure tests cover newly introduced edge cases, happy paths, and error states rather than trivial assertions.',
        evidence_source: `${testFiles.length} test file(s) modified or added`,
      });
    } else if (appLogicFiles.length > 0) {
      steps.push({
        step_number: stepNum++,
        title: 'Validate Missing Test Coverage',
        target_paths: appLogicFiles.slice(0, 3).map((f) => f.filename),
        what_to_look_for:
          'Ask author to supply unit/integration tests for modified application logic.',
        evidence_source: '0 test files detected in pull request diff',
      });
    }

    // Step 4: Verification / CI Evidence review
    if (verification.summary.failing > 0) {
      steps.push({
        step_number: stepNum++,
        title: 'Resolve CI Failures',
        target_paths: ['GitHub Actions / CI Logs'],
        what_to_look_for: `Investigate ${verification.summary.failing} failing check(s) before proceeding with code approval.`,
        evidence_source: verification.honest_assessment,
      });
    } else if (verification.summary.total === 0) {
      steps.push({
        step_number: stepNum++,
        title: 'Confirm CI & Build Status',
        target_paths: ['Repository CI Configuration'],
        what_to_look_for:
          'No automated checks found. Run local build and test suites to verify that branch builds cleanly.',
        evidence_source: 'Empty check run response for head commit',
      });
    }

    // Step 5: Linked issues & context
    if (linkedContext.explicit_issue_references.length > 0) {
      steps.push({
        step_number: stepNum++,
        title: 'Validate Linked Issue Resolution',
        target_paths: linkedContext.explicit_issue_references.map((r) => r.reference),
        what_to_look_for:
          'Confirm that the changes directly satisfy the acceptance criteria or bug report of the referenced issue.',
        evidence_source: `Referenced issue(s): ${linkedContext.explicit_issue_references.map((r) => r.reference).join(', ')}`,
      });
    }

    return steps.slice(0, 5);
  }

  /**
   * Synthesize clean intent summary
   */
  synthesizeIntent(pr: PullRequestMetadata, changeMap: ChangeMap): string {
    const parts: string[] = [];
    if (pr.title) {
      parts.push(`PR "${pr.title}"`);
    }

    const { category_counts } = changeMap;
    const catDescriptions: string[] = [];
    if (category_counts.application_logic > 0) {
      catDescriptions.push(`${category_counts.application_logic} logic file(s)`);
    }
    if (category_counts.tests > 0) {
      catDescriptions.push(`${category_counts.tests} test file(s)`);
    }
    if (category_counts.config_dependencies > 0) {
      catDescriptions.push(`${category_counts.config_dependencies} config/dependency file(s)`);
    }
    if (category_counts.documentation > 0) {
      catDescriptions.push(`${category_counts.documentation} doc file(s)`);
    }

    const scopeDesc = catDescriptions.length > 0 ? catDescriptions.join(', ') : `${changeMap.total_files} file(s)`;
    const churn = `(+${changeMap.total_additions}/-${changeMap.total_deletions})`;

    const summary = `${parts.join('')} introduces changes across ${scopeDesc} ${churn} targeting '${pr.base_branch}' from '${pr.head_branch}'.`;
    return summary;
  }

  /**
   * Assemble full ReviewDossier
   */
  assembleDossier(
    pr: PullRequestMetadata,
    changeMap: ChangeMap,
    verification: VerificationEvidence,
    linkedContext: LinkedContext
  ): ReviewDossier {
    const changeIntent = this.synthesizeIntent(pr, changeMap);
    const reviewerRoute = this.generateReviewerRoute(pr, changeMap, verification, linkedContext);

    const verifiedFacts = [
      `PR #${pr.number} by @${pr.author} is currently ${pr.state}${pr.is_draft ? ' (Draft)' : ''}.`,
      `Head commit ${pr.head_sha} targets branch '${pr.base_branch}'.`,
      `Examined ${changeMap.total_files} changed files (+${changeMap.total_additions}/-${changeMap.total_deletions}).`,
      `Retrieved ${verification.summary.total} CI check(s) with status: ${verification.summary.overall_status}.`,
    ];

    const heuristicSignals = changeMap.investigation_signals.map(
      (s) => `[${s.severity.toUpperCase()}] ${s.title}: ${s.explanation}`
    );

    const unverifiedHypotheses = linkedContext.hypotheses.map(
      (h) => `${h.description} (${h.rationale})`
    );

    const missingOrUnavailable: string[] = [];
    if (changeMap.is_file_list_truncated) {
      missingOrUnavailable.push('File list truncated at 100 files.');
    }
    if (verification.summary.total === 0) {
      missingOrUnavailable.push('No CI check results available on commit head.');
    }
    if (!pr.description || pr.description.trim().length === 0) {
      missingOrUnavailable.push('Pull request body/description is empty.');
    }

    return {
      pr,
      change_intent: changeIntent,
      change_map_summary: {
        total_files: changeMap.total_files,
        additions: changeMap.total_additions,
        deletions: changeMap.total_deletions,
        category_counts: changeMap.category_counts,
      },
      review_signals: changeMap.investigation_signals,
      verification,
      linked_context: linkedContext,
      reviewer_route: reviewerRoute,
      evidence_coverage: {
        pr_metadata_examined: true,
        files_examined: changeMap.total_files,
        files_truncated: changeMap.is_file_list_truncated,
        checks_retrieved: verification.summary.total > 0,
        commits_examined: linkedContext.explicit_issue_references.length,
        missing_or_unavailable: missingOrUnavailable,
      },
      confidence_and_limits: {
        verified_facts: verifiedFacts,
        heuristic_signals: heuristicSignals,
        unverified_hypotheses: unverifiedHypotheses,
      },
    };
  }
}
