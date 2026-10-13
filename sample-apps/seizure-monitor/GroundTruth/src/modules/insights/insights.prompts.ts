import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';
import { daysAgo, store, today } from '../../store/store.js';

export class InsightsPrompts {
  @Prompt({
    name: 'ask_about_team',
    description:
      'Answer a manager\'s open question about their team from the stored reports — ' +
      '"what is blocking the mobile team this week?", "is anyone struggling?", ' +
      '"who has not reported since Monday?"',
    arguments: [
      {
        name: 'question',
        description: 'The manager\'s question, in plain English',
        required: true,
      },
      {
        name: 'teamId',
        description: 'Team to scope the answer to, e.g. team-platform',
        required: false,
      },
    ],
  })
  async askAboutTeam(
    args: { question: string; teamId?: string },
    ctx: ExecutionContext,
  ) {
    const teamId = args.teamId ?? 'team-platform';
    const team = store.listEmployees(teamId);

    ctx.logger.info('Issuing ask_about_team prompt', {
      teamId,
      question: args.question,
    });

    const roster = team
      .map((e) => `- ${e.name} (${e.id}), ${e.role}`)
      .join('\n');

    return [
      {
        role: 'user' as const,
        content: `A manager of team ${teamId} asks:

> ${args.question}

Today is ${today()}. One week ago was ${daysAgo(7)}.

Team:
${roster}

Answer from the stored data, not from assumption. The tools available to you:
- \`search_reports\` — find reports by keyword, person, date range, or blockers-only. Start here for most questions.
- \`analyze_wellbeing_trend\` — confidence and tone across days, plus blockers that keep recurring. Use this for anything about how people are coping or holding up.
- \`generate_daily_digest\` — the state of a single day across the team.
- \`crosscheck_activity\` — verify one person's claims against GitHub, if the question is about whether work actually happened.

How to answer well:
- Lead with the direct answer in one or two sentences. The manager asked a question; answer it before explaining how you found out.
- Cite specifics — who, which date, and the actual wording from the report. A manager cannot act on "some people seem blocked".
- Keyword search is literal. If a query returns nothing, try a synonym or widen the range before reporting that nothing exists. "No results" and "it did not happen" are different claims, and only one of them is usually true.
- If the data genuinely cannot answer the question, say exactly that and say what is missing. Do not fill the gap with a plausible guess.
- Do not raise alerts from this prompt. This is a question being answered, not a review being run — the manager is already looking.`,
      },
    ];
  }
}
