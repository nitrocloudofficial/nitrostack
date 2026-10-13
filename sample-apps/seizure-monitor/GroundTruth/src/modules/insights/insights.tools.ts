import { Widget, ExecutionContext, z } from '@nitrostack/core';
import { ValidatedTool as Tool } from '../../lib/validated-tool.js';
import { daysAgo, store, today } from '../../store/store.js';
import { groupBlockerRuns, tokenize } from '../../lib/text.js';
import type { EODReport } from '../../store/types.js';

/**
 * Cross-cutting analysis over stored reports.
 *
 * Same discipline as everywhere else in this project: these tools compute
 * signals — slopes, streaks, recurrences, matches — and never conclude. The
 * agent reading them decides what, if anything, to do.
 */

type Direction = 'improving' | 'steady' | 'declining';

interface TrendPoint {
  date: string;
  submitted: boolean;
  confidence: number | null;
  sentiment: string | null;
  blockerCount: number;
}

export class InsightsTools {
  @Tool({
    name: 'analyze_wellbeing_trend',
    description:
      'Track confidence, tone, and blockers per person across recent days to surface early ' +
      'burnout signals — the kind that never show up in a single day\'s report. ' +
      'Returns a per-day series plus computed signals (confidence slope, consecutive negative days, ' +
      'blockers that keep recurring, missed submissions). ' +
      'These are signals, not conclusions: a two-day dip after a hard release is normal, ' +
      'while a slow four-day slide with a stuck blocker usually is not. Reason about which you are seeing.',
    inputSchema: z.object({
      teamId: z
        .string()
        .default('team-platform')
        .describe('Team to analyse. Ignored when employeeId is given.'),
      employeeId: z
        .string()
        .optional()
        .describe('Restrict to one person (id, name, or GitHub username)'),
      days: z
        .number()
        .int()
        .min(2)
        .max(30)
        .default(7)
        .describe('How many days back to include, counting today'),
    }),
  })
  @Widget('wellbeing-trend')
  async analyzeWellbeingTrend(
    input: { teamId: string; employeeId?: string; days: number },
    ctx: ExecutionContext,
  ) {
    const dates: string[] = [];
    for (let i = input.days - 1; i >= 0; i--) dates.push(daysAgo(i));

    const employees = input.employeeId
      ? [store.resolveEmployee(input.employeeId)].filter(
          (e): e is NonNullable<typeof e> => Boolean(e),
        )
      : store.listEmployees(input.teamId);

    if (employees.length === 0) {
      throw new Error(
        input.employeeId
          ? `No employee matches "${input.employeeId}".`
          : `No employees on team "${input.teamId}".`,
      );
    }

    ctx.logger.info('Analysing wellbeing trend', {
      employees: employees.length,
      days: input.days,
    });

    const people = employees.map((employee) => {
      const reports = new Map<string, EODReport>();
      for (const date of dates) {
        const r = store.getReport(employee.id, date);
        if (r) reports.set(date, r);
      }

      const series: TrendPoint[] = dates.map((date) => {
        const r = reports.get(date);
        return {
          date,
          submitted: Boolean(r),
          confidence: r?.confidence ?? null,
          sentiment: r?.sentiment ?? null,
          blockerCount: r?.blockers?.length ?? 0,
        };
      });

      const scored = series.filter(
        (p): p is TrendPoint & { confidence: number } => p.confidence !== null,
      );

      // Slope over submitted days only, so a missed day doesn't read as a crash.
      const confidenceDelta =
        scored.length >= 2
          ? scored[scored.length - 1].confidence - scored[0].confidence
          : 0;

      const direction: Direction =
        confidenceDelta <= -1 ? 'declining' : confidenceDelta >= 1 ? 'improving' : 'steady';

      // Longest run of negative tone ending on the most recent submitted day.
      let consecutiveNegative = 0;
      for (let i = scored.length - 1; i >= 0; i--) {
        if (scored[i].sentiment === 'negative') consecutiveNegative++;
        else break;
      }

      // Blockers appearing on two or more days, grouped by meaning rather than
      // exact wording, so a reworded blocker still reads as the same problem.
      const blockerEntries = dates.flatMap((date) =>
        (reports.get(date)?.blockers ?? []).map((blocker) => ({ date, blocker })),
      );
      const recurringBlockers = groupBlockerRuns(blockerEntries)
        .filter((r) => r.dates.length >= 2)
        .map((r) => ({ blocker: r.blocker, days: r.dates.length, dates: r.dates }))
        .sort((a, b) => b.days - a.days);

      const signals: string[] = [];
      if (direction === 'declining') {
        signals.push(
          `Confidence fell ${Math.abs(confidenceDelta)} point(s) across the window, from ${scored[0].confidence} to ${scored[scored.length - 1].confidence}.`,
        );
      }
      if (consecutiveNegative >= 2) {
        signals.push(`Tone has read negative ${consecutiveNegative} submitted days running.`);
      }
      for (const r of recurringBlockers) {
        signals.push(`Blocker unresolved across ${r.days} days: "${r.blocker}".`);
      }
      const missed = series.filter((p) => !p.submitted).length;
      if (missed > 0) {
        signals.push(`${missed} of ${input.days} days have no report.`);
      }
      if (signals.length === 0) {
        signals.push('No trend signals — confidence and tone are holding steady.');
      }

      const latest = scored[scored.length - 1];

      return {
        employee: {
          id: employee.id,
          name: employee.name,
          role: employee.role,
        },
        series,
        currentConfidence: latest?.confidence ?? null,
        currentSentiment: latest?.sentiment ?? null,
        confidenceDelta,
        direction,
        consecutiveNegativeDays: consecutiveNegative,
        recurringBlockers,
        missedDays: missed,
        signals,
      };
    });

    // Most concerning first, so the agent reads the important person first.
    const weight = (p: (typeof people)[number]) =>
      (p.direction === 'declining' ? 3 : 0) +
      p.consecutiveNegativeDays +
      p.recurringBlockers.reduce((sum, r) => sum + r.days, 0);
    people.sort((a, b) => weight(b) - weight(a));

    return {
      teamId: input.employeeId ? undefined : input.teamId,
      days: input.days,
      dateRange: { from: dates[0], to: dates[dates.length - 1] },
      people,
      reminder:
        'Signals only. A dip after a hard week is normal; decide whether what you see is a pattern worth raising, and say why.',
    };
  }


  @Tool({
    name: 'get_employee_detail',
    description:
      "Everything on file for one person: every report in the window, what GitHub showed " +
      'against each, how long any blocker has run, their confidence and tone over time, and ' +
      'any alerts raised. Use this when a digest row raises a question and you need the ' +
      'history behind it — the digest answers who, this answers why.',
    inputSchema: z.object({
      employeeId: z
        .string()
        .describe('Employee id, full name, or GitHub username'),
      days: z
        .number()
        .int()
        .min(1)
        .max(30)
        .default(7)
        .describe('How many days back to include, counting today'),
    }),
  })
  @Widget('employee-detail')
  async getEmployeeDetail(
    input: { employeeId: string; days: number },
    ctx: ExecutionContext,
  ) {
    const employee = store.resolveEmployee(input.employeeId);
    if (!employee) {
      throw new Error(
        `No employee matches "${input.employeeId}". Read team://employees for valid ids.`,
      );
    }

    const dates: string[] = [];
    for (let i = input.days - 1; i >= 0; i--) dates.push(daysAgo(i));

    ctx.logger.info('Reading employee detail', {
      employee: employee.name,
      days: input.days,
    });

    const timeline = dates.map((date) => {
      const report = store.getReport(employee.id, date);
      const check = report ? store.getActivityCheck(report.id) : undefined;

      return {
        date,
        submitted: Boolean(report),
        reportText: report?.rawText ?? null,
        confidence: report?.confidence ?? null,
        sentiment: report?.sentiment ?? null,
        blockers: report?.blockers ?? [],
        claims: report?.claims ?? [],
        verified: Boolean(check),
        verdict: check?.verdict ?? null,
        matchScore: check?.matchScore ?? null,
        commits: check?.commits.map((c) => ({ sha: c.sha, message: c.message })) ?? [],
        pullRequests:
          check?.pullRequests.map((pr) => ({ number: pr.number, title: pr.title })) ?? [],
      };
    });

    // Newest first reads better in a detail view — you arrive asking about today.
    timeline.reverse();

    const blockerRuns = groupBlockerRuns(
      dates.flatMap((date) =>
        (store.getReport(employee.id, date)?.blockers ?? []).map((blocker) => ({
          date,
          blocker,
        })),
      ),
    )
      .map((r) => ({ blocker: r.blocker, days: r.dates.length, dates: r.dates }))
      .sort((a, b) => b.days - a.days);

    const submitted = timeline.filter((t) => t.submitted);
    const scored = submitted.filter((t) => t.confidence !== null);
    // Oldest-to-newest for the slope, since timeline is reversed for display.
    const confidenceDelta =
      scored.length >= 2
        ? (scored[0].confidence as number) - (scored[scored.length - 1].confidence as number)
        : 0;

    const verifiedRuns = submitted.filter((t) => t.verified);
    const unsupported = verifiedRuns.filter((t) => t.verdict === 'unsupported').length;

    const alerts = store
      .listAlerts(employee.teamId, true)
      .filter((a) => a.employeeId === employee.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((a) => ({
        id: a.id,
        date: a.date,
        severity: a.severity,
        reason: a.reason,
        resolved: a.resolved,
      }));

    return {
      employee: {
        id: employee.id,
        name: employee.name,
        role: employee.role,
        teamId: employee.teamId,
        githubUsername: employee.githubUsername,
      },
      window: { days: input.days, from: dates[0], to: dates[dates.length - 1] },
      summary: {
        reported: submitted.length,
        missed: input.days - submitted.length,
        verified: verifiedRuns.length,
        unsupportedDays: unsupported,
        currentConfidence: scored[0]?.confidence ?? null,
        confidenceDelta,
        longestBlockerRun: blockerRuns[0]?.days ?? 0,
        openAlerts: alerts.filter((a) => !a.resolved).length,
      },
      blockerRuns,
      alerts,
      timeline,
      reminder:
        'History, not a verdict. A quiet week and a struggling week look similar in ' +
        'aggregate — read the reports before concluding anything.',
    };
  }


  @Tool({
    name: 'generate_weekly_summary',
    description:
      'A week of a team rather than a day: who was consistently reliable, whose claims kept ' +
      'outrunning their activity, which blockers survived the week, and how reporting ' +
      'discipline held up. Answers a different question from the daily digest — that one asks ' +
      'who needs you today, this one asks what kind of week the team had. ' +
      'Counts and streaks are facts; what they mean is yours to judge.',
    inputSchema: z.object({
      teamId: z.string().default('team-platform').describe('Team id, e.g. team-platform'),
      days: z
        .number()
        .int()
        .min(3)
        .max(30)
        .default(7)
        .describe('Length of the window in days, counting today'),
    }),
  })
  async generateWeeklySummary(
    input: { teamId: string; days: number },
    ctx: ExecutionContext,
  ) {
    const team = store.listEmployees(input.teamId);
    if (team.length === 0) {
      throw new Error(
        `No employees on team "${input.teamId}". Read team://employees to see the roster.`,
      );
    }

    const dates: string[] = [];
    for (let i = input.days - 1; i >= 0; i--) dates.push(daysAgo(i));

    ctx.logger.info('Generating weekly summary', {
      teamId: input.teamId,
      days: input.days,
      headcount: team.length,
    });

    const people = team.map((employee) => {
      const reports = dates
        .map((date) => ({ date, report: store.getReport(employee.id, date) }))
        .filter((r): r is { date: string; report: NonNullable<typeof r.report> } =>
          Boolean(r.report),
        );

      const checks = reports
        .map((r) => store.getActivityCheck(r.report.id))
        .filter((c): c is NonNullable<typeof c> => Boolean(c));

      const confidences = reports.map((r) => r.report.confidence);
      const avgConfidence =
        confidences.length > 0
          ? Number(
              (confidences.reduce((a, b) => a + b, 0) / confidences.length).toFixed(1),
            )
          : null;

      const blockerRuns = groupBlockerRuns(
        reports.flatMap((r) =>
          (r.report.blockers ?? []).map((blocker) => ({ date: r.date, blocker })),
        ),
      ).sort((a, b) => b.dates.length - a.dates.length);

      const unsupportedDays = checks.filter((c) => c.verdict === 'unsupported').length;
      const consistentDays = checks.filter((c) => c.verdict === 'consistent').length;
      const negativeDays = reports.filter((r) => r.report.sentiment === 'negative').length;

      return {
        employee: { id: employee.id, name: employee.name, role: employee.role },
        reported: reports.length,
        missed: input.days - reports.length,
        verified: checks.length,
        consistentDays,
        unsupportedDays,
        negativeDays,
        avgConfidence,
        confidenceDelta:
          confidences.length >= 2 ? confidences[confidences.length - 1] - confidences[0] : 0,
        longestBlockerRun: blockerRuns[0]?.dates.length ?? 0,
        blockerRuns: blockerRuns
          .filter((r) => r.dates.length >= 2)
          .map((r) => ({ blocker: r.blocker, days: r.dates.length })),
      };
    });

    /*
     * Three lists rather than one ranking. A week is not a leaderboard: the
     * person who reported every day and delivered, the person whose claims kept
     * outrunning their commits, and the person who quietly stopped reporting are
     * three different conversations, and collapsing them into one score would
     * lose exactly the distinction a manager needs.
     */
    const claimsOutrunningWork = people
      .filter((p) => p.unsupportedDays > 0)
      .sort((a, b) => b.unsupportedDays - a.unsupportedDays);

    const stuck = people
      .filter((p) => p.longestBlockerRun >= 2)
      .sort((a, b) => b.longestBlockerRun - a.longestBlockerRun);

    const wearingDown = people
      .filter((p) => p.confidenceDelta <= -1 || p.negativeDays >= 2)
      .sort((a, b) => a.confidenceDelta - b.confidenceDelta);

    /*
     * Reliable means nothing is wrong, so it excludes anyone already named
     * elsewhere. Someone can deliver every day and still be wearing down —
     * that is a real and important combination — but listing them as reliable
     * beside a note that they are struggling gives a manager two contradictory
     * instructions and they will act on the reassuring one.
     */
    const concerning = new Set(
      [...claimsOutrunningWork, ...stuck, ...wearingDown].map((p) => p.employee.id),
    );
    const reliable = people
      .filter(
        (p) =>
          p.missed === 0 &&
          p.reported > 0 &&
          !concerning.has(p.employee.id),
      )
      .sort((a, b) => (b.avgConfidence ?? 0) - (a.avgConfidence ?? 0));

    const quiet = people.filter((p) => p.missed >= Math.ceil(input.days / 2));

    const totalPossible = team.length * input.days;
    const totalReported = people.reduce((sum, p) => sum + p.reported, 0);

    return {
      teamId: input.teamId,
      window: { days: input.days, from: dates[0], to: dates[dates.length - 1] },
      summary: {
        headcount: team.length,
        reportingRate: Number(((totalReported / totalPossible) * 100).toFixed(0)),
        reportsFiled: totalReported,
        reportsPossible: totalPossible,
        daysWithUnsupportedClaims: people.reduce((s, p) => s + p.unsupportedDays, 0),
        blockersSurvivingTheWeek: people.filter((p) => p.longestBlockerRun >= 3).length,
      },
      reliable: reliable.map((p) => ({
        name: p.employee.name,
        role: p.employee.role,
        reported: p.reported,
        avgConfidence: p.avgConfidence,
      })),
      claimsOutrunningWork: claimsOutrunningWork.map((p) => ({
        name: p.employee.name,
        role: p.employee.role,
        unsupportedDays: p.unsupportedDays,
        verified: p.verified,
      })),
      stuck: stuck.map((p) => ({
        name: p.employee.name,
        role: p.employee.role,
        longestBlockerRun: p.longestBlockerRun,
        blockers: p.blockerRuns,
      })),
      wearingDown: wearingDown.map((p) => ({
        name: p.employee.name,
        role: p.employee.role,
        confidenceDelta: p.confidenceDelta,
        negativeDays: p.negativeDays,
        avgConfidence: p.avgConfidence,
      })),
      quiet: quiet.map((p) => ({
        name: p.employee.name,
        role: p.employee.role,
        missed: p.missed,
      })),
      people,
      reminder:
        'Counts and streaks, not conclusions. A week with no unsupported claims and no ' +
        'lasting blockers is a good week and should be said plainly; do not manufacture a ' +
        'concern to fill a section.',
    };
  }


  @Tool({
    name: 'search_reports',
    description:
      'Search stored EOD reports by keyword, person, date range, or whether they mention blockers. ' +
      'Use this to answer open questions about the team — "what has been blocking the mobile work this week", ' +
      '"has anyone mentioned the staging database", "who reported on Monday". ' +
      'Matching is keyword-based, so try a couple of phrasings before concluding nothing exists.',
    inputSchema: z.object({
      query: z
        .string()
        .optional()
        .describe('Keywords to match against report text. Omit to list everything in range.'),
      employeeId: z
        .string()
        .optional()
        .describe('Restrict to one person (id, name, or GitHub username)'),
      teamId: z.string().optional().describe('Restrict to one team'),
      since: z
        .string()
        .optional()
        .describe('Earliest date, YYYY-MM-DD, inclusive'),
      until: z.string().optional().describe('Latest date, YYYY-MM-DD, inclusive'),
      blockersOnly: z
        .boolean()
        .default(false)
        .describe('Only return reports that flagged at least one blocker'),
      limit: z.number().int().min(1).max(100).default(25).describe('Maximum results'),
    }),
  })
  async searchReports(
    input: {
      query?: string;
      employeeId?: string;
      teamId?: string;
      since?: string;
      until?: string;
      blockersOnly: boolean;
      limit: number;
    },
    ctx: ExecutionContext,
  ) {
    const target = input.employeeId
      ? store.resolveEmployee(input.employeeId)
      : undefined;
    if (input.employeeId && !target) {
      throw new Error(`No employee matches "${input.employeeId}".`);
    }

    const queryTokens = input.query ? tokenize(input.query) : [];

    const matches = store
      .listReports()
      .filter((report) => {
        if (target && report.employeeId !== target.id) return false;
        if (input.teamId) {
          const emp = store.getEmployee(report.employeeId);
          if (emp?.teamId !== input.teamId) return false;
        }
        if (input.since && report.date < input.since) return false;
        if (input.until && report.date > input.until) return false;
        if (input.blockersOnly && (report.blockers?.length ?? 0) === 0) return false;
        if (queryTokens.length > 0) {
          const haystack = new Set(tokenize(report.rawText));
          if (!queryTokens.some((t) => haystack.has(t))) return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    // Counted before the limit is applied. Reporting the page size as the
    // result count told a manager asking "who mentioned staging" that exactly
    // 25 people did, with no hint that more existed — a confident wrong number
    // is worse than a long list.
    const totalMatches = matches.length;
    const page = matches
      .slice(0, input.limit)
      .map((report) => {
        const employee = store.getEmployee(report.employeeId);
        return {
          date: report.date,
          employee: employee
            ? { id: employee.id, name: employee.name, role: employee.role }
            : { id: report.employeeId, name: report.employeeId, role: 'unknown' },
          text: report.rawText,
          confidence: report.confidence,
          sentiment: report.sentiment ?? null,
          blockers: report.blockers ?? [],
          verified: Boolean(store.getActivityCheck(report.id)),
        };
      });

    const truncated = totalMatches > page.length;

    ctx.logger.info('Searched reports', {
      query: input.query ?? '(none)',
      matched: totalMatches,
      returned: page.length,
    });

    return {
      query: input.query ?? null,
      filters: {
        employee: target?.name ?? null,
        teamId: input.teamId ?? null,
        since: input.since ?? null,
        until: input.until ?? null,
        blockersOnly: input.blockersOnly,
      },
      // How many matched, and how many of those are in this response. They are
      // not the same number once a limit bites, and conflating them turns a
      // partial answer into a confident wrong one.
      resultCount: totalMatches,
      returnedCount: page.length,
      truncated,
      results: page,
      note:
        totalMatches === 0
          ? 'No reports matched. Keyword matching is literal — try a synonym, widen the date range, or drop the query to see what exists.'
          : truncated
            ? `Showing the ${page.length} most recent of ${totalMatches} matches. Raise \`limit\` to see the rest before drawing any conclusion about how widespread this is.`
            : undefined,
      today: today(),
    };
  }
}
