import { Injectable, ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { AgileService } from './agile.service.js';
import { StoreService } from '../../shared/services/store.service.js';
import type { JiraTicket, KnowledgeFact } from '../../shared/schemas/index.js';

/**
 * Both tools read a live system by default and accept the same escape hatches:
 * `source` forces a local file (and skips the network entirely), while the
 * per-tool selectors below override what the `.env` points at.
 */
const SourceSchema = z.object({
  source: z
    .string()
    .optional()
    .describe(
      'Absolute path to a local file to read instead of calling the live API. ' +
        'Omit to use the configured integration, or the bundled fixture when none is configured.'
    ),
});

const JiraSchema = SourceSchema.extend({
  board_id: z
    .string()
    .optional()
    .describe('Jira board id to read. Overrides JIRA_BOARD_ID; omit to use the configured or first visible board.'),
});

const ChatSchema = SourceSchema.extend({
  channel_id: z
    .string()
    .optional()
    .describe('Slack channel id (C…) to read. Overrides SLACK_CHANNEL_ID.'),
  limit: z
    .number()
    .min(1)
    .max(200)
    .optional()
    .describe('How many recent messages to scan for decisions. Defaults to SLACK_MESSAGE_LIMIT, or 50.'),
});

/**
 * Collapse a sprint into done / in-progress / to-do.
 *
 * Jira lets every project invent its own status names, but every status belongs
 * to one of three workflow categories, and that is the distinction an agent
 * needs: what is already shipped, what a human is holding right now, and what is
 * unclaimed. Matching on category keywords rather than exact strings means this
 * survives "In Review", "Blocked", "Ready for QA" and the rest.
 */
function groupByWorkflowState(issues: JiraTicket[]) {
  const list = (items: { key: string }[]) => items.map((i) => i.key).join(', ');
  const bucket = (status: string): 'done' | 'inProgress' | 'toDo' => {
    if (/done|closed|resolved|shipped|complete/i.test(status)) return 'done';
    if (/progress|review|testing|qa|blocked|doing|started/i.test(status)) return 'inProgress';
    return 'toDo';
  };

  const summarise = (issue: JiraTicket) => ({
    key: issue.key,
    status: issue.status,
    summary: issue.summary,
    assignee: issue.assignee ?? 'unassigned',
  });

  const done = issues.filter((i) => bucket(i.status) === 'done').map(summarise);
  const inProgress = issues.filter((i) => bucket(i.status) === 'inProgress').map(summarise);
  const toDo = issues.filter((i) => bucket(i.status) === 'toDo').map(summarise);

  return {
    counts: { done: done.length, inProgress: inProgress.length, toDo: toDo.length },
    done,
    inProgress,
    toDo,
    guidance: [
      inProgress.length
        ? `${list(inProgress)} ${inProgress.length === 1 ? 'is' : 'are'} being worked right now — ` +
          `do not generate code that collides with ${inProgress.length === 1 ? 'it' : 'them'}.`
        : 'Nothing is in flight.',
      toDo.length ? `${list(toDo)} ${toDo.length === 1 ? 'is' : 'are'} unclaimed.` : 'Nothing is unclaimed.',
    ].join(' '),
  };
}

@Injectable({ deps: [AgileService, StoreService] })
export class AgileTools {
  constructor(
    private agile: AgileService,
    private store: StoreService
  ) {}

  @Tool({
    name: 'fetch_sprint_goals',
    title: 'Fetch sprint goals (Jira)',
    description:
      'Product Synchronizer. Calls the Jira Agile REST API for the active sprint, its goal and ' +
      'every issue with status and assignee, so the AI knows what humans are already working on ' +
      'and does not generate code that collides with in-flight work. Requires JIRA_BASE_URL, ' +
      'JIRA_EMAIL and JIRA_API_TOKEN; without them it returns the bundled Aurora fixture and ' +
      'says so in `dataSource`. Always check `dataSource` before treating the result as real.',
    inputSchema: JiraSchema,
    examples: {
      request: {},
      response: {
        dataSource: 'jira-live',
        sprint: { name: 'Sprint 41 - Invoice Read Path', state: 'active' },
        issueCount: 6,
        backlog: {
          counts: { done: 1, inProgress: 3, toDo: 2 },
          guidance: 'AUR-4471, AUR-4480 are being worked right now — do not generate code that collides with them.',
        },
        inFlight: [{ key: 'AUR-4471', status: 'In Progress', assignee: 'p.narang' }],
      },
    },
  })
  async fetchSprintGoals(input: { source?: string; board_id?: string }, ctx: ExecutionContext) {
    const sourced = await this.agile.loadSprint(input.source, input.board_id);
    const sprint = sourced.value;
    ctx.logger.info('Product Synchronizer fetched sprint', {
      sprint: sprint.sprint.name,
      issues: sprint.issues.length,
      dataSource: sourced.dataSource,
    });

    const inFlight = sprint.issues.filter((i) => !/done|closed/i.test(i.status));
    const backlog = groupByWorkflowState(sprint.issues);

    const facts: KnowledgeFact[] = [
      {
        id: 'agile:sprint',
        agent: 'product-synchronizer',
        category: 'agile',
        title: `Active sprint: ${sprint.sprint.name}`,
        detail:
          `Goal: ${sprint.sprint.goal ?? 'not stated'}. ` +
          `Runs ${sprint.sprint.startDate ?? '?'} → ${sprint.sprint.endDate ?? '?'}. ` +
          `${inFlight.length} of ${sprint.issues.length} issues still open.`,
        evidence: [`${sprint.board} board (${sourced.dataSource})`],
        weight: 5,
      },
      ...inFlight.map<KnowledgeFact>((issue) => ({
        id: `agile:issue:${issue.key}`,
        agent: 'product-synchronizer',
        category: 'agile',
        title: `${issue.key} (${issue.status}) — ${issue.summary}`,
        detail:
          `${issue.description} ` +
          `Owner: ${issue.assignee ?? 'unassigned'}.` +
          (issue.labels.length ? ` Labels: ${issue.labels.join(', ')}.` : ''),
        evidence: [issue.key],
        weight: issue.status.toLowerCase().includes('progress') ? 4 : 3,
      })),
    ];

    this.store.clearAgentFacts('product-synchronizer');
    this.store.addFacts(facts);

    return {
      // Leading the payload, not buried in it: an agent that acts on mock
      // sprint data believing it is live will collide with real work.
      dataSource: sourced.dataSource,
      configurationHint: sourced.configurationHint,
      warning: sourced.warning,
      board: sprint.board,
      sprint: sprint.sprint,
      issueCount: sprint.issues.length,
      // The backlog collapsed to the three states a coding agent actually cares
      // about: shipped (safe to build on), being worked (do not touch), and
      // queued (fair game). Jira workflows name these a dozen different ways,
      // so they are mapped by category rather than by exact status string.
      backlog,
      inFlight: inFlight.map((i) => ({
        key: i.key,
        status: i.status,
        assignee: i.assignee,
        summary: i.summary,
        storyPoints: i.storyPoints,
      })),
      issues: sprint.issues,
    };
  }

  @Tool({
    name: 'fetch_meeting_transcripts',
    title: 'Fetch team decisions (Slack)',
    description:
      'Scrum Analyst. Reads the most recent messages from the team Slack channel and parses them ' +
      'into structured decisions. Each utterance is segmented, its technology entities extracted, ' +
      'and its intent classified as adopt / reject / freeze / mandate. This surfaces the unwritten ' +
      'verbal decisions that contradict the ticket tracker — the tribal knowledge an LLM would ' +
      'otherwise never see. Requires SLACK_BOT_TOKEN and SLACK_CHANNEL_ID; without them it returns ' +
      'the bundled Aurora transcript fixture and says so in `dataSource`.',
    inputSchema: ChatSchema,
    examples: {
      request: {},
      response: {
        dataSource: 'slack-live',
        title: 'Slack — #aurora-billing',
        decisionCount: 14,
        bindingDirectives: [
          { speaker: 'D. Fairbanks', polarity: 'reject', entities: ['redis'], text: 'we are NOT introducing Redis…' },
        ],
      },
    },
  })
  async fetchMeetingTranscripts(
    input: { source?: string; channel_id?: string; limit?: number },
    ctx: ExecutionContext
  ) {
    const sourced = await this.agile.loadTranscript(input.source, input.channel_id, input.limit);
    const transcript = sourced.value;
    const binding = this.agile.bindingDirectives(transcript);
    ctx.logger.info('Scrum Analyst parsed transcript', {
      decisions: transcript.decisions.length,
      binding: binding.length,
      dataSource: sourced.dataSource,
    });

    const facts: KnowledgeFact[] = [
      {
        id: 'consensus:meeting',
        agent: 'scrum-analyst',
        category: 'consensus',
        title: `Human consensus: ${transcript.title}`,
        detail:
          `${transcript.occurredAt ?? 'undated'}. ` +
          `${transcript.attendees.length} attendees. ` +
          `${binding.length} binding directive(s) extracted from ${transcript.decisions.length} utterances.`,
        evidence: [transcript.source],
        weight: 4,
      },
      ...binding.slice(0, 10).map<KnowledgeFact>((d) => ({
        id: `consensus:${d.id}`,
        agent: 'scrum-analyst',
        category: 'consensus',
        title: `${d.polarity.toUpperCase()}${d.entities.length ? `: ${d.entities.join(', ')}` : ''} — ${d.speaker ?? 'unknown'}`,
        detail: `"${d.text}" (${d.timestamp ?? '?'}, authority: ${d.authority})`,
        evidence: [transcript.source],
        weight: d.authority === 'lead' || d.authority === 'ops' ? 5 : 3,
      })),
    ];

    this.store.clearAgentFacts('scrum-analyst');
    this.store.addFacts(facts);

    return {
      dataSource: sourced.dataSource,
      configurationHint: sourced.configurationHint,
      warning: sourced.warning,
      source: transcript.source,
      title: transcript.title,
      occurredAt: transcript.occurredAt,
      attendees: transcript.attendees,
      decisionCount: transcript.decisions.length,
      bindingDirectives: binding.map((d) => ({
        id: d.id,
        timestamp: d.timestamp,
        speaker: d.speaker,
        authority: d.authority,
        polarity: d.polarity,
        entities: d.entities,
        text: d.text,
      })),
      decisions: transcript.decisions,
    };
  }
}
