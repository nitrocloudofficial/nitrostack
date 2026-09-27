/**
 * TriageService — the autonomous queue sweep.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS THE STRONGEST AGENTIC CLAIM IN THE PRODUCT
 * ---------------------------------------------------------------------------
 * `agent_investigate` is one agent examining one file. Impressive, but a human
 * with enough hours could do it. This is the part a human cannot do: the agent
 * investigates EVERY pending application, then correlates the results ACROSS the
 * whole queue to find rings that are invisible from any single file.
 *
 * The distinction matters. Reviewing application 2001 tells you its phone number
 * is reused. Reviewing 2002, 2003 and 2004 separately tells you the same thing
 * three more times. Only the cross-queue correlation tells you those four files
 * are one operation — and that finding does not exist in any individual review,
 * which is precisely why manual queue processing misses it.
 *
 * ---------------------------------------------------------------------------
 * WORK-ORDER OUTPUT, NOT A REPORT
 * ---------------------------------------------------------------------------
 * The output is ordered so that row 1 is genuinely the file an officer should
 * open first. `priority` is assigned after sorting on (escalation, then score,
 * then cluster size) — an isolated 80 is less urgent than a clustered 65,
 * because the clustered one implicates people not yet under review.
 *
 * ---------------------------------------------------------------------------
 * SEQUENTIAL ON PURPOSE
 * ---------------------------------------------------------------------------
 * Applications are swept one at a time, not with Promise.all. The tools mutate
 * shared singletons (PipelineStateService keyed by applicationId), and the LLM
 * planner path would fire N concurrent completions into a rate limit. Nine
 * applications complete in well under a second deterministically; concurrency
 * would buy noise and cost correctness.
 */
import { Injectable } from '@nitrostack/core';
import type { ExecutionContext } from '@nitrostack/core';
import type { TriageResult, TriageRow } from '../../../contracts/index.js';
import { TriageResultSchema } from '../../../contracts/index.js';
import { ApplicationService } from '../../pipeline/services/application.service.js';
import { GraphService } from '../../pipeline/services/graph.service.js';
import { AgentRunnerService } from './agent-runner.service.js';

/** Sweep budget per application. Lower than a focused run: breadth over depth. */
export const TRIAGE_STEP_BUDGET = 12;

@Injectable({ deps: [ApplicationService, GraphService, AgentRunnerService] })
export class TriageService {
  constructor(
    private readonly applications: ApplicationService,
    private readonly graph: GraphService,
    private readonly runner: AgentRunnerService
  ) {}

  /**
   * Sweep the queue.
   *
   * @param applicationIds restrict the sweep; defaults to every seeded
   *        application. A demo usually wants all of them.
   */
  async sweep(options: {
    applicationIds?: string[];
    ctx?: ExecutionContext;
    maxApplications?: number;
  }): Promise<TriageResult> {
    const startedAt = new Date();

    const candidates = (options.applicationIds ?? this.applications.getIds()).filter((id) =>
      this.applications.has(id)
    );
    const limit = Math.max(1, options.maxApplications ?? candidates.length);
    const targets = candidates.slice(0, limit);

    const rows: TriageRow[] = [];

    for (const applicationId of targets) {
      // A single application failing must not abort the sweep — the officer still
      // needs the other eight rows. The failure surfaces as a row that demands
      // review rather than as a missing row nobody notices.
      try {
        const run = await this.runner.run({
          applicationId,
          goal: 'triage_queue',
          maxSteps: TRIAGE_STEP_BUDGET,
          ...(options.ctx ? { ctx: options.ctx } : {}),
        });

        const application = this.applications.getApplication(applicationId);
        const clusterSize = this.graph.getLinkedApplicationIds(applicationId).length + 1;

        rows.push({
          applicationId,
          applicantName: application.fullName,
          applicationType: application.applicationType,
          riskScore: run.riskScore,
          band: this.bandFor(run.riskScore),
          recommendation: run.handoff?.recommendation ?? 'escalate',
          // Replaced by the real rank after sorting; a placeholder is required
          // because TriageRowSchema types priority as a positive integer.
          priority: 1,
          headline: this.headline(run.handoff?.rationale ?? '', run.riskScore, clusterSize),
          clusterSize,
          requiresSeniorReview: run.handoff?.requiresSeniorReview ?? true,
          runId: run.runId,
        });
      } catch (error) {
        const name = this.applications.has(applicationId)
          ? this.applications.getApplication(applicationId).fullName
          : applicationId;

        rows.push({
          applicationId,
          applicantName: name,
          applicationType: 'unknown',
          riskScore: null,
          band: null,
          recommendation: 'escalate',
          priority: 1,
          headline:
            `Automated triage FAILED for this application: ` +
            `${error instanceof Error ? error.message : String(error)}. Needs manual review — ` +
            `a failed check is not a passed check.`,
          clusterSize: 1,
          requiresSeniorReview: true,
          runId: 'failed',
        });
      }
    }

    const queue = this.prioritise(rows);
    const finishedAt = new Date();

    const candidateResult: TriageResult = {
      queue,
      processed: queue.length,
      escalated: queue
        .filter((r) => r.recommendation === 'escalate' || r.requiresSeniorReview)
        .map((r) => r.applicationId),
      detectedRings: this.detectRings(targets),
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      totalDurationMs: finishedAt.getTime() - startedAt.getTime(),
    };

    const parsed = TriageResultSchema.safeParse(candidateResult);
    if (!parsed.success) {
      throw new Error(
        'TriageService produced an off-contract TriageResult:\n' +
          JSON.stringify(parsed.error.format(), null, 2)
      );
    }

    return parsed.data;
  }

  /**
   * Order the queue by genuine urgency, then stamp `priority`.
   *
   * The comparator is the product opinion, so it is worth stating explicitly:
   *
   *   1. Senior-review cases first. These are network findings — the officer's
   *      attention is worth most where the damage is widest.
   *   2. Then by risk score, descending.
   *   3. Then by cluster size, descending — between two equal scores, the one
   *      implicating more people is the one to open.
   *   4. Then by id, purely so the order is stable and a demo is reproducible.
   */
  private prioritise(rows: TriageRow[]): TriageRow[] {
    const ordered = [...rows].sort((a, b) => {
      if (a.requiresSeniorReview !== b.requiresSeniorReview) {
        return a.requiresSeniorReview ? -1 : 1;
      }
      const scoreDelta = (b.riskScore ?? -1) - (a.riskScore ?? -1);
      if (scoreDelta !== 0) return scoreDelta;

      const clusterDelta = b.clusterSize - a.clusterSize;
      if (clusterDelta !== 0) return clusterDelta;

      return a.applicationId.localeCompare(b.applicationId);
    });

    return ordered.map((row, index) => ({ ...row, priority: index + 1 }));
  }

  /**
   * Correlate across the swept set to surface multi-application rings.
   *
   * Uses GraphService.getAllClusters(), which computes connected components over
   * the shared-identifier edges of the ENTIRE pool. A cluster of 2+ that
   * intersects the swept set is reported once, deduplicated by membership — the
   * same ring must not appear four times because four of its members were swept.
   */
  private detectRings(sweptIds: readonly string[]): TriageResult['detectedRings'] {
    const swept = new Set(sweptIds);
    const seen = new Set<string>();
    const rings: TriageResult['detectedRings'] = [];

    for (const cluster of this.graph.getAllClusters()) {
      if (cluster.length < 2) continue;
      if (!cluster.some((id) => swept.has(id))) continue;

      const key = [...cluster].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);

      // Take the shared-signal vocabulary from any member's graph — the edge
      // reasons are cluster-wide, so one lookup describes the whole ring.
      const anchor = cluster[0] as string;
      const built = this.graph.buildGraph(anchor);
      const sharedSignals = built.clusterSummary.sharedSignalKinds;
      const names = cluster
        .filter((id) => this.applications.has(id))
        .map((id) => this.applications.getApplication(id).fullName);

      rings.push({
        applicationIds: [...cluster].sort(),
        size: cluster.length,
        sharedSignals,
        headline:
          `${cluster.length} applications (${names.join(', ')}) form one connected group linked by ` +
          `${sharedSignals.join(', ')}. No single-file review would surface this — it only exists ` +
          `when the queue is correlated as a whole.`,
      });
    }

    // Biggest ring first: it is the most consequential thing on the page.
    return rings.sort((a, b) => b.size - a.size);
  }

  private bandFor(score: number | null): 'low' | 'medium' | 'high' | null {
    if (score === null) return null;
    return score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low';
  }

  /** One line for the queue row. Falls back to a synthesised sentence. */
  private headline(rationale: string, score: number | null, clusterSize: number): string {
    const trimmed = rationale.trim();
    if (trimmed.length > 0) {
      // Queue rows are scanned, not read. First sentence only.
      const firstSentence = trimmed.split(/(?<=\.)\s/)[0] ?? trimmed;
      return firstSentence.length > 220 ? `${firstSentence.slice(0, 217)}...` : firstSentence;
    }

    return clusterSize > 1
      ? `Scored ${score ?? '?'}/100 and sits in a cluster of ${clusterSize}.`
      : `Scored ${score ?? '?'}/100 with no cross-application links.`;
  }
}
