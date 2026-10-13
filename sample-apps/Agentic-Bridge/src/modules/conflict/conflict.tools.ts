import { Injectable, ToolDecorator as Tool, Widget, ExecutionContext, z, UseGuards } from '@nitrostack/core';
import { AdminGuard } from '../../shared/security/admin.guard.js';
import { ConflictService, DRIFT_THRESHOLD, CONTRADICTION_THRESHOLD } from './conflict.service.js';
import { AgileService } from '../agile/agile.service.js';
import { StoreService } from '../../shared/services/store.service.js';
import { ConflictResolutionSchema } from '../../shared/schemas/index.js';

@Injectable({ deps: [ConflictService, AgileService, StoreService] })
export class ConflictTools {
  constructor(
    private conflicts: ConflictService,
    private agile: AgileService,
    private store: StoreService
  ) {}

  @Tool({
    name: 'detect_conflicts',
    title: 'Detect context conflicts',
    description:
      'Cross-references the live Jira sprint against the team chat record (Slack, or the bundled ' +
      'transcript fixture) and raises a conflict ' +
      'wherever the written ticket and the spoken decision disagree. Scores every pair on two ' +
      'axes: cosine ALIGNMENT (are they about the same thing?) and decision DIVERGENCE (do they ' +
      'choose differently?). A contradiction is high alignment plus high divergence — the case ' +
      'a similarity threshold alone provably cannot catch. Emits an interactive resolution widget.',
    inputSchema: z.object({
      jira_source: z
        .string()
        .optional()
        .describe('Read this local file instead of calling Jira. Omit to use the live sprint.'),
      transcript_source: z
        .string()
        .optional()
        .describe('Read this local file instead of calling Slack. Omit to use the live channel.'),
    }),
    // Studio renders this payload in the widget preview before the tool is ever
    // run, so it must be a faithful sample of the real return shape — not a
    // summary. Omitting sourceA/sourceB previously crashed the preview outright.
    examples: {
      request: {},
      response: {
        conflictCount: 1,
        openCount: 1,
        thresholds: { driftBelow: 0.7, contradictionAtOrAbove: 0.6 },
        sources: {
          jira: 'AUR / Sprint 41 - Invoice Read Path',
          chat: 'Slack — #aurora-billing',
          jiraDataSource: 'jira-live',
          chatDataSource: 'slack-live',
        },
        conflicts: [
          {
            id: 'conflict-AUR-4471-decision-3',
            kind: 'contradiction',
            topic: 'redis, memcached, cache',
            similarity: 0.2073,
            divergence: 1,
            status: 'open',
            recommendation: 'b',
            recommendationReason:
              'source B explicitly rejects "redis", which source A adopts. The meeting statement is more recent and came from the lead.',
            sourceA: {
              origin: 'Jira',
              ref: 'AUR-4471',
              text: 'Introduce a Redis cache in front of the invoice read path — replace the Memcached wrapper in server/middleware/cache.js with a Redis client.',
            },
            sourceB: {
              origin: 'Microsoft Teams',
              ref: 'Sprint 41 Daily Scrum 10:04 D. Fairbanks',
              text: 'So the decision is: we are NOT introducing Redis. We stay on Memcached and we optimise the existing wrapper instead.',
            },
          },
        ],
        nextStep: 'Resolve each conflict in the widget, or call resolve_conflict with the conflict_id.',
      },
    },
  })
  @Widget('conflict-resolver')
  @UseGuards(AdminGuard)
  async detectConflicts(
    input: { jira_source?: string; transcript_source?: string },
    ctx: ExecutionContext
  ) {
    const sprintSource = await this.agile.loadSprint(input.jira_source);
    const transcriptSource = await this.agile.loadTranscript(input.transcript_source);
    const sprint = sprintSource.value;
    const transcript = transcriptSource.value;

    const conflicts = this.conflicts.detect(sprint, transcript);
    const open = conflicts.filter((c) => c.status === 'open');

    ctx.logger.info('Conflict detection complete', {
      total: conflicts.length,
      open: open.length,
    });

    return {
      conflictCount: conflicts.length,
      openCount: open.length,
      thresholds: { driftBelow: DRIFT_THRESHOLD, contradictionAtOrAbove: CONTRADICTION_THRESHOLD },
      sources: {
        jira: `${sprint.board} / ${sprint.sprint.name}`,
        chat: transcript.title,
        // A conflict between two fixtures is a demo; between two live systems
        // it is a finding. The reader needs to know which one this is.
        jiraDataSource: sprintSource.dataSource,
        chatDataSource: transcriptSource.dataSource,
      },
      configurationHints: [sprintSource.configurationHint, transcriptSource.configurationHint].filter(Boolean),
      warnings: [sprintSource.warning, transcriptSource.warning].filter(Boolean),
      conflicts,
      nextStep: open.length
        ? 'Resolve each conflict in the widget, or call resolve_conflict with the conflict_id.'
        : 'No open conflicts. Safe to synthesize the CLAUDE.md manifest.',
    };
  }

  @Tool({
    name: 'resolve_conflict',
    title: 'Resolve a conflict',
    description:
      'Records the administrator\'s authoritative decision on a detected conflict and resumes ' +
      'the paused swarm run. The chosen directive is written into the knowledge base at the ' +
      'highest weight, so it outranks anything the parsers inferred and lands verbatim in ' +
      'CLAUDE.md. Called by the conflict-resolver widget buttons, or directly.',
    inputSchema: ConflictResolutionSchema,
    examples: {
      request: { conflict_id: 'conflict-AUR-4471-decision-3', chosen: 'b', resolved_by: 'admin' },
      // `remainingOpen` is not a real field on this response — it only appears in
      // the log line. The widget reads conflicts/openCount, so advertise those.
      response: {
        resolved: true,
        conflictCount: 1,
        openCount: 0,
        conflict: {
          id: 'conflict-AUR-4471-decision-3',
          status: 'resolved',
          resolution: {
            chosen: 'b',
            directive: 'Authoritative: Microsoft Teams. Stay on Memcached; no Redis in the PCI zone.',
            resolvedBy: 'admin',
            resolvedAt: '2026-07-25T10:12:00.000Z',
          },
        },
        nextStep: 'All conflicts resolved — run synthesize_claude_md to write the manifest.',
      },
    },
  })
  @Widget('conflict-resolver')
  @UseGuards(AdminGuard)
  async resolveConflict(
    input: { conflict_id: string; chosen: 'a' | 'b' | 'custom'; directive?: string; resolved_by?: string },
    ctx: ExecutionContext
  ) {
    const updated = this.conflicts.resolve(
      input.conflict_id,
      input.chosen,
      input.directive,
      input.resolved_by ?? 'admin'
    );

    const all = this.store.all('conflicts');
    const open = all.filter((c) => c.status === 'open');

    // Resuming the paused run is the whole point of the human-in-the-loop step.
    let resumedRun: string | undefined;
    const run = this.store.latestRun();
    if (run && run.status === 'awaiting-resolution' && !open.length) {
      this.store.upsert('runs', { ...run, status: 'completed', finishedAt: new Date().toISOString() });
      resumedRun = run.id;
    }

    ctx.logger.info('Conflict resolved', {
      conflict: input.conflict_id,
      chosen: input.chosen,
      remainingOpen: open.length,
      resumedRun,
    });

    return {
      resolved: true,
      conflict: updated,
      conflictCount: all.length,
      openCount: open.length,
      conflicts: all,
      resumedRun,
      nextStep: open.length
        ? `${open.length} conflict(s) still open.`
        : 'All conflicts resolved — run synthesize_claude_md to regenerate the manifest.',
    };
  }

  @Tool({
    name: 'list_conflicts',
    title: 'List conflicts',
    description:
      'Returns every detected conflict with its current status and any recorded resolution. ' +
      'Useful for auditing which context decisions a human validated versus which the machine inferred.',
    inputSchema: z.object({
      only_open: z.boolean().default(false).describe('Return only unresolved conflicts'),
    }),
    // Mirrors a real post-resolution payload, so the widget preview shows the
    // interesting state (a human ruling on record) rather than an empty list.
    examples: {
      request: { only_open: false },
      response: {
        conflictCount: 1,
        openCount: 0,
        conflicts: [
          {
            id: 'conflict-AUR-4471-decision-2',
            kind: 'contradiction',
            topic: 'redis, memcached, cache',
            similarity: 0.2073,
            divergence: 1,
            status: 'resolved',
            recommendation: 'b',
            recommendationReason:
              'source B explicitly rejects "redis", which source A adopts. The meeting statement is more recent and came from ops.',
            sourceA: {
              origin: 'Jira',
              ref: 'AUR-4471',
              text: 'Introduce a Redis cache in front of the invoice read path — replace the Memcached wrapper in server/middleware/cache.js with a Redis client.',
            },
            sourceB: {
              origin: 'Microsoft Teams',
              ref: 'Sprint 41 Daily Scrum 10:03 K. Brandt',
              text: 'Ops will not approve Redis in the PCI zone. That was ADR-014 in 2023 and nothing has changed.',
            },
            resolution: {
              chosen: 'b',
              directive: 'Authoritative: Microsoft Teams. Ops will not approve Redis in the PCI zone; stay on Memcached.',
              resolvedBy: 'administrator',
              resolvedAt: '2026-07-25T10:12:00.000Z',
            },
          },
        ],
      },
    },
  })
  @Widget('conflict-resolver')
  async listConflicts(input: { only_open?: boolean }) {
    const all = this.store.all('conflicts');
    const conflicts = input.only_open ? all.filter((c) => c.status === 'open') : all;
    return {
      conflictCount: conflicts.length,
      openCount: all.filter((c) => c.status === 'open').length,
      conflicts,
    };
  }
}
