import { ExecutionContext, z } from '@nitrostack/core';
import { ValidatedTool as Tool } from '../../lib/validated-tool.js';
import { daysAgo, store } from '../../store/store.js';
import {
  assertsCompletion,
  looksLikeBlocker,
  scoreSentiment,
  splitClaims,
} from '../../lib/text.js';
import type { EODReport } from '../../store/types.js';
import {
  DEMO_TEAM,
  REALISTIC_SCRIPTS,
  REALISTIC_TEAM,
} from './realistic-seed.js';

export type SeedScale = 'realistic' | 'demo';

/**
 * Demo scaffolding.
 *
 * Several GroundTruth signals only mean anything across days — a blocker is
 * unremarkable on day one and urgent on day three; a confidence slide only
 * reads as a slide if there is something to slide from. Seeding history makes
 * those visible without waiting a week.
 *
 * The four employees are deliberately different cases, including one where the
 * evidence looks bad but the explanation is innocent. An agent that alerts on
 * all four is doing it wrong, and this data is what exposes that.
 */

const STAGING_BLOCKER =
  'Still blocked on the staging database credentials, waiting on the infra team';

/** day 0 is the most recent seeded day (yesterday by default). */
interface SeedDay {
  employeeId: string;
  text: string;
  confidence: number;
}

/**
 * Case A — Aarav: claims completion daily, same blocker three days running,
 * confidence sliding. This is the escalation the demo is built around.
 * Case B — Divya: healthy and consistent. Should produce no alert.
 * Case C — Karthik: real work that leaves almost no commit trail (review,
 * pairing, design). Low match score, innocent explanation. Should NOT alert.
 * Case D — Meera: no claim mismatch at all, but visibly wearing down. The
 * signal here is the person, not the code.
 */
function seedScript(dayOffset: number): SeedDay[] {
  const aaravByDay = [
    {
      text: `Finished the login module and wired up session handling. ${STAGING_BLOCKER}.`,
      confidence: 2,
    },
    {
      text: `Completed the token refresh flow. ${STAGING_BLOCKER}.`,
      confidence: 3,
    },
    {
      text: `Wrapped up the auth middleware. ${STAGING_BLOCKER}.`,
      confidence: 3,
    },
    {
      text: 'Started on the auth middleware, reading through the existing session code.',
      confidence: 4,
    },
  ];

  const divyaByDay = [
    {
      text: 'Completed the digest dashboard widget and opened a PR for review.',
      confidence: 5,
    },
    {
      text: 'Shipped the severity chip component and merged the layout fixes.',
      confidence: 5,
    },
    {
      text: 'Built out the report form and pushed the first pass of the styling.',
      confidence: 4,
    },
    {
      text: 'Set up the widget scaffolding and got the dev server running.',
      confidence: 4,
    },
  ];

  const karthikByDay = [
    {
      text: 'Spent most of today reviewing PRs and pairing with Divya on the widget layout.',
      confidence: 4,
    },
    {
      text: 'Wrote the design doc for the alerting flow, mostly discussion and diagrams today.',
      confidence: 4,
    },
    {
      text: 'Interviewing candidates for the backend role, plus a long architecture call.',
      confidence: 4,
    },
    {
      text: 'Reviewed the auth approach with Aarav and sketched the data model on the whiteboard.',
      confidence: 4,
    },
  ];

  const meeraByDay = [
    {
      text: 'Regression suite is still failing intermittently and I am struggling to keep up with the queue. Feeling pretty exhausted.',
      confidence: 2,
    },
    {
      text: 'Wrote more test cases but the flaky suite is overwhelming, spent the day rerunning things.',
      confidence: 2,
    },
    {
      text: 'Worked through the regression backlog, slower than I wanted.',
      confidence: 3,
    },
    {
      text: 'Finished the smoke test checklist and filed three bugs.',
      confidence: 4,
    },
  ];

  const pick = (arr: Array<{ text: string; confidence: number }>) =>
    arr[Math.min(dayOffset, arr.length - 1)];

  return [
    { employeeId: 'emp-1', ...pick(aaravByDay) },
    { employeeId: 'emp-2', ...pick(divyaByDay) },
    { employeeId: 'emp-3', ...pick(karthikByDay) },
    { employeeId: 'emp-4', ...pick(meeraByDay) },
  ];
}

/**
 * Creates `days` of prior history for the whole team.
 * Shared by the seed tool and the boot-time auto-seed.
 */
export function seedHistory(
  days: number,
  includeToday: boolean,
  scale: SeedScale = 'realistic',
): string[] {
  store.clearOperationalData();
  store.setRoster(scale === 'demo' ? DEMO_TEAM : REALISTIC_TEAM);

  const created: string[] = [];
  const startOffset = includeToday ? 0 : 1;

  for (let i = 0; i < days; i++) {
    const date = daysAgo(startOffset + i);

    // dayOffset 0 is the most recent seeded day.
    const entries =
      scale === 'demo'
        ? seedScript(i).map((e) => ({
            employeeId: e.employeeId,
            text: e.text,
            confidence: e.confidence,
          }))
        : Object.entries(REALISTIC_SCRIPTS).flatMap(([employeeId, script]) => {
            // A shorter script repeats its last entry, so a long window still reads
            // sensibly. null means no report that day — itself a signal.
            const entry = script[Math.min(i, script.length - 1)];
            return entry ? [{ employeeId, ...entry }] : [];
          });

    for (const entry of entries) {
      const employee = store.getEmployee(entry.employeeId);
      if (!employee) continue;

      const sentences = splitClaims(entry.text);
      const blockers = sentences.filter(looksLikeBlocker);

      store.addReport({
        id: `rep-${employee.id}-${date}`,
        employeeId: employee.id,
        date,
        rawText: entry.text,
        confidence: entry.confidence,
        submittedAt: new Date(`${date}T18:30:00`).toISOString(),
        claims: sentences
          .filter((s) => !blockers.includes(s))
          .map((text) => ({ text, assertsCompletion: assertsCompletion(text) })),
        blockers,
        sentiment: scoreSentiment(entry.text),
      });
      created.push(`${date}:${employee.id}`);
    }
  }

  return created;
}

export class DemoTools {
  @Tool({
    name: 'seed_demo_data',
    description:
      'Populate several days of prior EOD reports for the whole team, so trend and ' +
      'blocker-recurrence signals have history to work against. Use this once when ' +
      "setting up a demo. By default it leaves today's reports empty so a live " +
      'submission can be made on stage. Replaces any existing reports, cross-checks, and alerts.',
    inputSchema: z.object({
      days: z
        .number()
        .int()
        .min(1)
        .max(7)
        .default(5)
        .describe('How many prior days of history to create'),
      scale: z
        .enum(['realistic', 'demo'])
        .default('realistic')
        .describe(
          'realistic: 12 people across two teams, the size at which ranking, search and ' +
            'team questions mean anything. demo: the original four, each making one ' +
            'distinct point, sized for a short screen recording.',
        ),
      includeToday: z
        .boolean()
        .default(false)
        .describe(
          "Also create today's reports. Leave false so you can submit today's live during a demo.",
        ),
    }),
  })
  async seedDemoData(
    input: { days: number; includeToday: boolean; scale: SeedScale },
    ctx: ExecutionContext,
  ) {
    const created = seedHistory(input.days, input.includeToday, input.scale);
    const startOffset = input.includeToday ? 0 : 1;

    ctx.logger.info('Seeded demo history', {
      scale: input.scale,
      days: input.days,
      reports: created.length,
      includeToday: input.includeToday,
    });

    return {
      seeded: true,
      scale: input.scale,
      headcount: store.listEmployees().length,
      teams: [...new Set(store.listEmployees().map((e) => e.teamId))],
      days: input.days,
      reportsCreated: created.length,
      dateRange: {
        from: daysAgo(startOffset + input.days - 1),
        to: daysAgo(startOffset),
      },
      todayLeftEmpty: !input.includeToday,
      narratives: [
        'Aarav Menon — claims completed work daily, same staging-credentials blocker every day, confidence sliding. The escalation case.',
        'Divya Raghavan — consistent and healthy. Should produce no alert.',
        'Karthik Iyer — review, pairing, and design work that leaves almost no commits. Low match score with an innocent explanation; alerting here would be a false positive.',
        'Meera Nair — no claim mismatch, but confidence and tone are deteriorating. A signal about the person rather than the code.',
      ],
      nextStep: input.includeToday
        ? 'Run review_team_day to have the agent work through all four.'
        : "Submit today's report via open_eod_form, then run review_eod_submission.",
    };
  }

  @Tool({
    name: 'reset_demo_data',
    description:
      'Delete all reports, cross-checks, and alerts. Use to get back to a clean slate ' +
      'between demo runs. Pass resetRoster to also restore the team list to its defaults, ' +
      'which is how you undo set_employee_github changes.',
    inputSchema: z.object({
      resetRoster: z
        .boolean()
        .default(false)
        .describe('Also restore the employee roster, discarding GitHub username edits'),
    }),
  })
  async resetDemoData(input: { resetRoster: boolean }, ctx: ExecutionContext) {
    store.clearOperationalData();
    if (input.resetRoster) store.resetRoster();

    ctx.logger.info('Demo data reset', { resetRoster: input.resetRoster });

    return {
      reset: true,
      rosterRestored: input.resetRoster,
      employeesKept: store.listEmployees().length,
      message: input.resetRoster
        ? 'Reports, cross-checks, and alerts cleared. Roster restored to defaults.'
        : 'Reports, cross-checks, and alerts cleared. Roster left as-is.',
    };
  }

  @Tool({
    name: 'set_employee_github',
    description:
      'Point an employee at a real GitHub identity so their commits can be verified. ' +
      'Use this during demo setup instead of editing the seed file, then re-run crosscheck_activity. ' +
      'Strongly recommended: also pass githubEmail, set to the output of `git config user.email` on ' +
      'the machine making the commits. GitHub only links a commit to an account when the commit email ' +
      'is registered there, so a mistyped git email makes commits invisible to a login-only lookup.',
    inputSchema: z.object({
      employeeId: z.string().describe('Employee id, full name, or current GitHub username'),
      githubUsername: z.string().describe('The GitHub login to attribute commits to'),
      githubEmail: z
        .string()
        .optional()
        .describe(
          'The git commit author email (from `git config user.email`). Lets attribution work even when the commit is not linked to the GitHub account.',
        ),
    }),
  })
  async setEmployeeGithub(
    input: { employeeId: string; githubUsername: string; githubEmail?: string },
    ctx: ExecutionContext,
  ) {
    const employee = store.resolveEmployee(input.employeeId);
    if (!employee) {
      throw new Error(
        `No employee matches "${input.employeeId}". Read team://employees for valid ids.`,
      );
    }

    const updated = store.setGithubIdentity(
      employee.id,
      input.githubUsername,
      input.githubEmail,
    );
    ctx.logger.info('Updated GitHub identity', {
      employee: employee.name,
      githubUsername: input.githubUsername,
      githubEmail: input.githubEmail ?? '(not set)',
    });

    return {
      updated: true,
      employee: { id: updated!.id, name: updated!.name },
      githubUsername: updated!.githubUsername,
      githubEmail: updated!.githubEmail ?? null,
      note: updated!.githubEmail
        ? 'Commits will be attributed by GitHub login or by this commit email.'
        : 'No commit email set — attribution relies on GitHub having linked the commit to this account. If crosscheck_activity finds no commits despite real activity, set githubEmail.',
    };
  }
}
