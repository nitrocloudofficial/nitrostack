import { Widget, ExecutionContext, z } from '@nitrostack/core';
import { ValidatedTool as Tool } from '../../lib/validated-tool.js';
import { store, today } from '../../store/store.js';
import {
  assertsCompletion,
  groupBlockerRuns,
  looksLikeBlocker,
  scoreSentiment,
  splitClaims,
} from '../../lib/text.js';
import type { EODReport, ExtractedClaim } from '../../store/types.js';

export class EodTools {
  @Tool({
    name: 'open_eod_form',
    description:
      'Open the end-of-day report form so an employee can write their update. ' +
      'Renders an interactive form; submitting it calls submit_eod_report.',
    inputSchema: z.object({
      employeeId: z
        .string()
        .optional()
        .describe('Pre-select this employee (id, name, or GitHub username)'),
    }),
  })
  @Widget('eod-form')
  async openEodForm(input: { employeeId?: string }, ctx: ExecutionContext) {
    ctx.logger.info('Opening EOD form');

    const employees = store.listEmployees().map((e) => ({
      id: e.id,
      name: e.name,
      role: e.role,
    }));

    const selected = input.employeeId
      ? store.resolveEmployee(input.employeeId)
      : undefined;

    return {
      date: today(),
      employees,
      selectedEmployeeId: selected?.id ?? employees[0]?.id ?? null,
    };
  }

  @Tool({
    name: 'submit_eod_report',
    description:
      "Record an employee's end-of-day report for a date. Stores the raw text and " +
      'immediately pre-parses it into candidate claims and blockers. ' +
      'Resubmitting for the same date replaces the earlier report.',
    inputSchema: z.object({
      employeeId: z
        .string()
        .describe('Employee id, full name, or GitHub username'),
      reportText: z
        .string()
        .min(3)
        .describe('Free-text report: what they worked on, and anything blocking them'),
      confidence: z
        .number()
        .int()
        .min(1)
        .max(5)
        .default(3)
        .describe('Self-reported confidence, 1 (struggling) to 5 (on track)'),
      date: z
        .string()
        .optional()
        .describe('Date in YYYY-MM-DD format. Defaults to today.'),
    }),
  })
  async submitEodReport(
    input: {
      employeeId: string;
      reportText: string;
      confidence: number;
      date?: string;
    },
    ctx: ExecutionContext,
  ) {
    const employee = store.resolveEmployee(input.employeeId);
    if (!employee) {
      throw new Error(
        `No employee matches "${input.employeeId}". Read the team://employees resource for valid ids.`,
      );
    }

    const date = input.date ?? today();
    const extraction = extractFrom(input.reportText);

    const report: EODReport = {
      id: `rep-${employee.id}-${date}`,
      employeeId: employee.id,
      date,
      rawText: input.reportText,
      confidence: input.confidence,
      submittedAt: new Date().toISOString(),
      ...extraction,
    };

    store.addReport(report);

    ctx.logger.info('EOD report stored', {
      employee: employee.name,
      date,
      claims: extraction.claims.length,
      blockers: extraction.blockers.length,
      sentiment: extraction.sentiment,
    });

    return {
      stored: true,
      reportId: report.id,
      employee: { id: employee.id, name: employee.name, role: employee.role },
      date,
      confidence: input.confidence,
      ...extraction,
      nextStep:
        `Run crosscheck_activity for ${employee.name} on ${date} to verify these claims against GitHub.`,
    };
  }

  @Tool({
    name: 'generate_daily_digest',
    description:
      "Build the manager's digest for a team on a date: every submitted report, its cross-check " +
      'result, open alerts, and who has not reported yet. Rows are ordered by how much attention ' +
      'they appear to need. Use this after reviewing individual submissions.',
    inputSchema: z.object({
      teamId: z
        .string()
        .default('team-platform')
        .describe('Team id, e.g. team-platform'),
      date: z
        .string()
        .optional()
        .describe('Date in YYYY-MM-DD format. Defaults to today.'),
    }),
  })
  @Widget('team-digest')
  async generateDailyDigest(
    input: { teamId: string; date?: string },
    ctx: ExecutionContext,
  ) {
    const date = input.date ?? today();

    if (store.listEmployees(input.teamId).length === 0) {
      throw new Error(
        `No employees on team "${input.teamId}". Read team://employees to see the roster.`,
      );
    }

    const { rows, summary } = buildTeamDigest(input.teamId, date);

    ctx.logger.info('Generated daily digest', {
      teamId: input.teamId,
      date,
      submitted: summary.submitted,
      total: summary.headcount,
      openAlerts: summary.openAlerts,
    });

    return { teamId: input.teamId, date, summary, rows };
  }

  @Tool({
    name: 'generate_org_digest',
    description:
      'The whole organisation on one date, across every team. Returns a per-team breakdown ' +
      'plus the individuals who need attention org-wide, worst first. ' +
      'Use this when you manage more than one team, or want to know which team is struggling ' +
      'rather than which person. For one team use generate_daily_digest, which returns every ' +
      'row rather than only the concerning ones.',
    inputSchema: z.object({
      date: z
        .string()
        .optional()
        .describe('Date in YYYY-MM-DD format. Defaults to today.'),
      teams: z
        .array(z.string())
        .optional()
        .describe('Restrict to these team ids. Omit for every team on the roster.'),
    }),
  })
  @Widget('org-digest')
  async generateOrgDigest(
    input: { date?: string; teams?: string[] },
    ctx: ExecutionContext,
  ) {
    const date = input.date ?? today();
    const allTeams = [...new Set(store.listEmployees().map((e) => e.teamId))];
    const teams = input.teams?.length
      ? allTeams.filter((t) => input.teams!.includes(t))
      : allTeams;

    if (teams.length === 0) {
      throw new Error(
        input.teams?.length
          ? `None of those teams exist. Known teams: ${allTeams.join(', ')}.`
          : 'No teams on the roster. Read team://employees.',
      );
    }

    const perTeam = teams.map((teamId) => ({
      teamId,
      ...buildTeamDigest(teamId, date),
    }));

    /*
     * A director does not want every row; they want to know which teams are fine
     * and which people are not. So this returns each team's shape but only the
     * individuals who cleared the attention threshold — everyone else is noise at
     * this altitude, and generate_daily_digest is there for the detail.
     */
    const needsAttention = perTeam
      .flatMap((t) => t.rows.map((r) => ({ teamId: t.teamId, ...r })))
      .filter((r) => r.attentionRank >= 40)
      .sort((a, b) => b.attentionRank - a.attentionRank);

    const totals = perTeam.reduce(
      (acc, t) => ({
        headcount: acc.headcount + t.summary.headcount,
        submitted: acc.submitted + t.summary.submitted,
        missing: acc.missing + t.summary.missing,
        verified: acc.verified + t.summary.verified,
        openAlerts: acc.openAlerts + t.summary.openAlerts,
        needsAttention: acc.needsAttention + t.summary.needsAttention,
      }),
      { headcount: 0, submitted: 0, missing: 0, verified: 0, openAlerts: 0, needsAttention: 0 },
    );

    ctx.logger.info('Generated org digest', {
      date,
      teams: teams.length,
      headcount: totals.headcount,
      needsAttention: totals.needsAttention,
    });

    return {
      date,
      summary: totals,
      teams: perTeam
        .map((t) => {
          const worst = t.rows[0];
          return {
            teamId: t.teamId,
            summary: t.summary,
            // One line per team card: who to look at, and why.
            topConcern:
              worst && worst.attentionRank > 0
                ? {
                    name: worst.employee.name,
                    role: worst.employee.role,
                    attentionRank: worst.attentionRank,
                    reason:
                      worst.alerts[0]?.reason ??
                      (worst.recurringBlockers[0]
                        ? `Blocker on day ${worst.longestBlockerRun}: ${worst.recurringBlockers[0]}`
                        : worst.verdict === 'unsupported'
                          ? 'Claimed work is not supported by their GitHub activity'
                          : !worst.submitted
                            ? 'No report submitted'
                            : null),
                  }
                : null,
          };
        })
        // Struggling teams first.
        .sort((a, b) => b.summary.needsAttention - a.summary.needsAttention),
      needsAttention,
      reminder:
        needsAttention.length === 0
          ? 'Nobody crossed the attention threshold today. That is a real answer, not an empty result.'
          : 'These are the people whose day did not look routine. Read the reason before acting.',
    };
  }
}

/**
 * Builds one team's digest rows and summary.
 * Shared by the team and org digests so the two can never disagree.
 */
function buildTeamDigest(teamId: string, date: string) {
  const team = store.listEmployees(teamId);
  const openAlerts = store.listAlerts(teamId);

  const rows = team.map((employee) => {
    const report = store.getReport(employee.id, date);
    const check = report ? store.getActivityCheck(report.id) : undefined;
    const alerts = openAlerts.filter((a) => a.employeeId === employee.id);

    /*
     * Repeated blockers are the signal a manager most often misses, matched by
     * meaning rather than exact text. How long a blocker has run matters as much
     * as whether it repeated: day two is a delay, day five is a stall.
     */
    const runs = groupBlockerRuns(
      store
        .historyFor(employee.id, 7)
        .flatMap((r) => (r.blockers ?? []).map((blocker) => ({ date: r.date, blocker }))),
    ).filter((r) => r.dates.length >= 2 && r.dates.includes(date));

    const recurringBlockers = runs.map((r) => r.blocker);
    const longestBlockerRun = runs.reduce((max, r) => Math.max(max, r.dates.length), 0);

    return {
      employee: { id: employee.id, name: employee.name, role: employee.role },
      submitted: Boolean(report),
      reportText: report?.rawText ?? null,
      confidence: report?.confidence ?? null,
      sentiment: report?.sentiment ?? null,
      blockers: report?.blockers ?? [],
      recurringBlockers,
      longestBlockerRun,
      verified: Boolean(check),
      matchScore: check?.matchScore ?? null,
      verdict: check?.verdict ?? null,
      commitCount: check?.commits.length ?? null,
      prCount: check?.pullRequests.length ?? null,
      alerts: alerts.map((a) => ({ id: a.id, reason: a.reason, severity: a.severity })),
      attentionRank: rankAttention({
        submitted: Boolean(report),
        alerts: alerts.length,
        highestSeverity: alerts.reduce<'low' | 'medium' | 'high' | null>(
          (acc, a) =>
            a.severity === 'high' || acc === 'high'
              ? 'high'
              : a.severity === 'medium' || acc === 'medium'
                ? 'medium'
                : 'low',
          null,
        ),
        verdict: check?.verdict ?? null,
        longestBlockerRun,
        sentiment: report?.sentiment ?? null,
      }),
    };
  });

  rows.sort((a, b) => b.attentionRank - a.attentionRank);

  return {
    rows,
    summary: {
      headcount: rows.length,
      submitted: rows.filter((r) => r.submitted).length,
      missing: rows.filter((r) => !r.submitted).length,
      verified: rows.filter((r) => r.verified).length,
      openAlerts: openAlerts.length,
      needsAttention: rows.filter((r) => r.attentionRank >= 40).length,
    },
  };
}

/** Deterministic pre-parse of a report's free text. */
function extractFrom(rawText: string): {
  claims: ExtractedClaim[];
  blockers: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
} {
  const sentences = splitClaims(rawText);
  const blockers = sentences.filter(looksLikeBlocker);
  const claims: ExtractedClaim[] = sentences
    // A sentence that only describes a blocker isn't a claim of work done.
    .filter((s) => !blockers.includes(s))
    .map((text) => ({ text, assertsCompletion: assertsCompletion(text) }));

  return { claims, blockers, sentiment: scoreSentiment(rawText) };
}

/**
 * Orders digest rows so the manager reads the most consequential row first.
 * This is presentation ordering only — whether to alert is the agent's call.
 */
function rankAttention(input: {
  submitted: boolean;
  alerts: number;
  highestSeverity: 'low' | 'medium' | 'high' | null;
  verdict: string | null;
  longestBlockerRun: number;
  sentiment: string | null;
}): number {
  let score = 0;
  if (input.highestSeverity === 'high') score += 60;
  else if (input.highestSeverity === 'medium') score += 40;
  else if (input.highestSeverity === 'low') score += 20;

  /*
   * A blocker's weight grows with how long it has run. Treating day two and day
   * five the same is how someone stays stuck for a week inside a system built to
   * notice exactly that — and it let a five-day blocker sit below the
   * needs-attention threshold entirely.
   */
  if (input.longestBlockerRun >= 2) {
    score += 15 + Math.min(input.longestBlockerRun - 1, 4) * 10;
  }

  if (input.verdict === 'unsupported') score += 25;
  else if (input.verdict === 'partial') score += 15;
  if (input.sentiment === 'negative') score += 15;
  if (!input.submitted) score += 10;

  return score;
}
