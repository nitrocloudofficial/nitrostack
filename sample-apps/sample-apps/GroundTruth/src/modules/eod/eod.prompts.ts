import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';
import { store, today } from '../../store/store.js';

/**
 * The agent loop lives here, as instructions — not as if-statements in a tool.
 *
 * This is deliberate. The tools in this project are all deterministic: they
 * fetch, diff, store, and notify. None of them decides whether something
 * matters. That judgement happens in the model reading these instructions,
 * which is what makes GroundTruth an agent rather than a report parser.
 */
export class EodPrompts {
  @Prompt({
    name: 'review_eod_submission',
    description:
      "Review one employee's end-of-day report: verify it against real GitHub activity, " +
      'decide whether it needs a manager, and act. This is the core GroundTruth agent loop.',
    arguments: [
      {
        name: 'employeeId',
        description: 'Employee id, full name, or GitHub username to review',
        required: true,
      },
      {
        name: 'date',
        description: 'Date to review in YYYY-MM-DD format. Defaults to today.',
        required: false,
      },
    ],
  })
  async reviewEodSubmission(
    args: { employeeId: string; date?: string },
    ctx: ExecutionContext,
  ) {
    const date = args.date ?? today();
    const employee = store.resolveEmployee(args.employeeId);
    const label = employee ? `${employee.name} (${employee.id})` : args.employeeId;

    ctx.logger.info('Issuing review_eod_submission prompt', {
      employee: label,
      date,
    });

    return [
      {
        role: 'user' as const,
        content: `Review the end-of-day report for ${label} on ${date}.

Work through this loop, and narrate each step out loud as you go — the reasoning is the point, not just the conclusion.

**1. Perceive.** Read the \`eod://reports/{employeeId}/{date}\` resource for this person and date. That gives you their report in their own words, plus the confidence and tone they attached to it. Read the words themselves rather than the parsed fields — a stored extraction cannot tell "finished the login module" from "still finishing the login module", and you can.

**2. Verify.** Call \`crosscheck_activity\` for the same employee and date — and pass a \`claims\` array you wrote yourself from the raw report text. The stored extraction splits on punctuation and matches keywords; it cannot tell "finished the login module" from "still finishing the login module", and it will merge or mangle anything conversational. You can read the sentence. Set \`assertsCompletion\` only where the person genuinely says the work is done.

**3. Reason.** Compare what they said against what GitHub shows, and state your reading plainly. Weigh it honestly:
   - Quote the actual commit and pull request counts from the \`crosscheck_activity\` output, and name the commits you are dismissing. Do not round activity down to "no commits" or "nothing" — the person reading this can see the same list you can, and understating it makes the whole review look careless. Commits on unrelated work are stronger evidence than an absence of commits, because absence has innocent explanations and misdirected effort does not.
   - A low match score on its own is not. Meetings, design work, pairing, code review, debugging, and work in an untracked repo all leave little or no commit trail. Say so when that is the likely explanation.
   - Check \`priorBlockers\` in the cross-check output. A blocker appearing for a second or third day is usually more urgent than a single day's mismatch, because it means someone has been stuck without anyone noticing.
   - Look at \`confidence\` and \`sentiment\` together. Low confidence or negative sentiment repeated across days is an early signal about the person, not the code.

**4. Decide.** Choose one, and say which you chose and why:
   - **Nothing to raise** — the report and the activity line up, or the gap has an obvious innocent explanation. Say this in one line and stop. Most days should end here.
   - **Worth noting** — a small gap, or a blocker on its first day. Call \`send_manager_alert\` with severity \`low\`.
   - **Raise at standup** — a clear unexplained discrepancy, or a blocker on its second day. Call \`send_manager_alert\` with severity \`medium\`.
   - **Needs attention today** — work reported as finished that plainly did not happen, a blocker persisting three or more days, or signs someone is struggling badly. Call \`send_manager_alert\` with severity \`high\`.

**5. Act.** If you decided to alert, call \`send_manager_alert\` now with a reason a manager can act on without re-reading anything: name the specific claim, the specific evidence, and what you want them to do. "Match score low" is not a reason. "Reported the login module as finished, but the only commit that day was a README edit and no PR was opened" is.

Do not inflate a minor gap into an alert to look thorough. An agent that stays quiet when nothing is wrong is more useful than one that cries wolf — a manager who learns to ignore these alerts is worse off than one who never had them.`,
      },
    ];
  }

  @Prompt({
    name: 'review_team_day',
    description:
      "Review an entire team's day: verify every submitted report, then produce the manager's digest. " +
      'Use this at end of day rather than reviewing one person at a time.',
    arguments: [
      {
        name: 'teamId',
        description: 'Team id, e.g. team-platform',
        required: false,
      },
      {
        name: 'date',
        description: 'Date in YYYY-MM-DD format. Defaults to today.',
        required: false,
      },
    ],
  })
  async reviewTeamDay(
    args: { teamId?: string; date?: string },
    ctx: ExecutionContext,
  ) {
    const teamId = args.teamId ?? 'team-platform';
    const date = args.date ?? today();
    const team = store.listEmployees(teamId);
    const submitted = team.filter((e) => store.getReport(e.id, date));

    ctx.logger.info('Issuing review_team_day prompt', {
      teamId,
      date,
      submitted: submitted.length,
      headcount: team.length,
    });

    const roster = team
      .map((e) => {
        const has = store.getReport(e.id, date) ? 'submitted' : 'no report yet';
        return `- ${e.name} (${e.id}), ${e.role} — ${has}`;
      })
      .join('\n');

    return [
      {
        role: 'user' as const,
        content: `Run the end-of-day review for team ${teamId} on ${date}.

Team roster and submission status:
${roster}

For each person who has submitted, run the full review loop: read their \`eod://reports/{employeeId}/{date}\` resource, then call \`crosscheck_activity\` passing the claims you read out of it, reason about whether the gap is real, and call \`send_manager_alert\` only where you judge it warranted. Narrate your reasoning for each person as you go.

Then call \`generate_daily_digest\` for ${teamId} on ${date} to render the manager's dashboard.

Finish with a short spoken summary for the manager: the one or two people who genuinely need their time today, and why. If nobody does, say that plainly — a quiet day is a real and useful answer.`,
      },
    ];
  }
}
