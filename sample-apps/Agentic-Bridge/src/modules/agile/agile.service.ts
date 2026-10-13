/**
 * Product Synchronizer + Scrum Analyst.
 *
 * Both halves read live enterprise systems — Jira Agile REST for sprint state,
 * Slack for the spoken record — and fall back to the bundled fixtures under
 * `data/` when those are not configured. Which one produced a given answer is
 * always reported on the result as `dataSource`, because a demo that silently
 * substitutes mock data for real data is worse than one that has none.
 *
 * `BRIDGE_DATA_MODE` decides the policy:
 *   auto    (default) live when configured, fixture otherwise, fixture on failure
 *   live    live only — a missing or broken integration is an error
 *   fixture never touch the network
 *
 * The transcript parser is the interesting half, and it is deliberately
 * source-agnostic. It segments a transcript into individual utterances,
 * extracts the technologies each one is about, and classifies whether the
 * speaker is adopting, rejecting, freezing or mandating. Slack is rendered into
 * the layout it already reads, so going live changed no classification code.
 */
import { Injectable } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';
import { WorkspaceService } from '../../shared/services/workspace.service.js';
import { SemanticService } from '../../shared/services/semantic.service.js';
import { JiraClient } from './jira.client.js';
import { SlackClient } from './chat.client.js';
import {
  JiraSprintSchema,
  type JiraSprint,
  type MeetingDecision,
  type MeetingTranscript,
} from '../../shared/schemas/index.js';

/**
 * Speakers whose word is authoritative when a conflict is scored.
 *
 * The fixture-specific names stay as a fallback so the bundled demo keeps its
 * behaviour; real deployments name their own people through the env vars, since
 * a hardcoded `fairbanks` means nothing in anyone else's Slack.
 */
const AUTHORITY_HINTS: { pattern: RegExp; authority: MeetingDecision['authority'] }[] = [
  { pattern: /\(eng lead\)|fairbanks/i, authority: 'lead' },
  { pattern: /\(ops\)|brandt/i, authority: 'ops' },
];

export type DataSource = 'jira-live' | 'slack-live' | 'fixture';
export type DataMode = 'auto' | 'live' | 'fixture';

/** A payload plus the provenance of where it actually came from. */
export interface Sourced<T> {
  value: T;
  dataSource: DataSource;
  /** Set when the fixture was used because the integration is unconfigured. */
  configurationHint?: string;
  /** Set when a live call was attempted and failed. */
  warning?: string;
}

function dataMode(): DataMode {
  const raw = process.env.BRIDGE_DATA_MODE?.trim().toLowerCase();
  return raw === 'live' || raw === 'fixture' ? raw : 'auto';
}

/** Names configured as authoritative, matched case-insensitively as substrings. */
function namesFrom(variable: string): string[] {
  return (process.env[variable] ?? '')
    .split(',')
    .map((n) => n.trim().toLowerCase())
    .filter(Boolean);
}

@Injectable({ deps: [WorkspaceService, SemanticService, JiraClient, SlackClient] })
export class AgileService {
  constructor(
    private workspace: WorkspaceService,
    private semantic: SemanticService,
    private jira: JiraClient,
    private slack: SlackClient
  ) {}

  private dataFile(name: string, override?: string): string {
    if (override) {
      const resolved = path.resolve(override);
      if (!fs.existsSync(resolved)) throw new Error(`File not found: ${resolved}`);
      return resolved;
    }
    const file = path.join(this.workspace.dataRoot, name);
    if (!fs.existsSync(file)) {
      throw new Error(
        `Missing fixture ${file}. This tool reads mocked enterprise data from data/. ` +
          `Pass "source" to point at a different file.`
      );
    }
    return file;
  }

  /**
   * The active sprint, live from Jira when possible.
   *
   * An explicit `source` is an operator override and always wins: it means
   * "read this file", so no network call is made.
   */
  async loadSprint(source?: string, boardId?: string): Promise<Sourced<JiraSprint>> {
    const mode = dataMode();

    if (source || mode === 'fixture') {
      return { value: this.sprintFixture(source), dataSource: 'fixture' };
    }

    const live = await this.jira.fetchActiveSprint(boardId);
    if (live.ok) return { value: live.sprint, dataSource: 'jira-live' };

    if (mode === 'live') {
      // The operator demanded live data; quietly serving mock data would be a
      // lie, and this is the one mode where failing is the correct outcome.
      throw new Error(`BRIDGE_DATA_MODE=live but Jira could not be read. ${live.reason}`);
    }

    return live.kind === 'unconfigured'
      ? { value: this.sprintFixture(), dataSource: 'fixture', configurationHint: live.reason }
      : {
          value: this.sprintFixture(),
          dataSource: 'fixture',
          warning: `Live Jira call failed, so the bundled fixture was used instead. ${live.reason}`,
        };
  }

  /** The team's spoken record, live from Slack when possible. */
  async loadTranscript(source?: string, channelId?: string, limit?: number): Promise<Sourced<MeetingTranscript>> {
    const mode = dataMode();

    if (source || mode === 'fixture') {
      return { value: this.transcriptFixture(source), dataSource: 'fixture' };
    }

    const live = await this.slack.fetchTranscript(channelId, limit);
    if (live.ok) {
      // Same parser, same classifier, different origin.
      return { value: this.parseTranscript(live.sourceName, live.transcript), dataSource: 'slack-live' };
    }

    if (mode === 'live') {
      throw new Error(`BRIDGE_DATA_MODE=live but Slack could not be read. ${live.reason}`);
    }

    return live.kind === 'unconfigured'
      ? { value: this.transcriptFixture(), dataSource: 'fixture', configurationHint: live.reason }
      : {
          value: this.transcriptFixture(),
          dataSource: 'fixture',
          warning: `Live Slack call failed, so the bundled fixture was used instead. ${live.reason}`,
        };
  }

  private sprintFixture(source?: string): JiraSprint {
    const file = this.dataFile('mock-jira-sprint.json', source);
    const raw: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
    // Validate at the boundary: a malformed fixture fails loudly here rather
    // than producing a confusing error three layers downstream.
    return JiraSprintSchema.parse(raw);
  }

  private transcriptFixture(source?: string): MeetingTranscript {
    const file = this.dataFile('mock-teams-transcript.txt', source);
    const raw = fs.readFileSync(file, 'utf8');
    return this.parseTranscript(path.basename(file), raw);
  }

  /** Which live integrations are wired up. Surfaced by the health check and tools. */
  integrationStatus() {
    return {
      mode: dataMode(),
      jira: { configured: this.jira.configured, hint: this.jira.configured ? undefined : this.jira.configurationHint() },
      slack: { configured: this.slack.configured, hint: this.slack.configured ? undefined : this.slack.configurationHint() },
    };
  }

  parseTranscript(sourceName: string, raw: string): MeetingTranscript {
    const lines = raw.split('\n');
    const title = lines.find((l) => l.trim().length > 0)?.trim() ?? sourceName;
    const occurredAt = lines.find((l) => /^\w+day,/.test(l.trim()))?.trim();
    const attendeesLine = lines.find((l) => /^attendees:/i.test(l.trim()));
    const attendees = attendeesLine
      ? attendeesLine.replace(/^attendees:\s*/i, '').split(',').map((a) => a.trim()).filter(Boolean)
      : [];

    const decisions: MeetingDecision[] = [];
    let current: { timestamp?: string; speaker?: string; parts: string[] } | null = null;

    const flush = () => {
      if (!current || !current.parts.length) return;
      const text = current.parts.join(' ').replace(/\s+/g, ' ').trim();
      if (text.length >= 15) {
        const signal = this.semantic.analyseDecision(text);
        decisions.push({
          id: `decision-${decisions.length + 1}`,
          timestamp: current.timestamp,
          speaker: current.speaker,
          text,
          entities: signal.entities,
          polarity: signal.polarity,
          authority: this.authorityOf(current.speaker, attendees),
        });
      }
      current = null;
    };

    for (const line of lines) {
      // `[10:04] D. Fairbanks: text` starts a new utterance.
      const header = line.match(/^\s*\[(\d{1,2}:\d{2})\]\s*([^:]{2,40}):\s*(.*)$/);
      if (header) {
        flush();
        current = { timestamp: header[1], speaker: header[2].trim(), parts: header[3] ? [header[3]] : [] };
        continue;
      }
      // Continuation lines belong to the utterance above.
      if (current && line.trim() && /^\s{4,}/.test(line)) {
        current.parts.push(line.trim());
      } else if (current && !line.trim()) {
        flush();
      }
    }
    flush();

    return {
      source: sourceName,
      title,
      occurredAt,
      attendees,
      decisions,
      rawLineCount: lines.length,
    };
  }

  /**
   * How much weight a speaker's decision carries.
   *
   * Configured names win, because "the lead" is a fact about an organisation
   * and cannot be inferred from the text. The regex hints are the fallback that
   * keeps the bundled Aurora fixture behaving as before.
   */
  private authorityOf(speaker: string | undefined, attendees: string[]): MeetingDecision['authority'] {
    if (!speaker) return 'unknown';
    const context = `${speaker} ${attendees.find((a) => a.includes(speaker.split(' ').pop() ?? '')) ?? ''}`;
    const haystack = context.toLowerCase();

    if (namesFrom('BRIDGE_AUTHORITY_LEADS').some((name) => haystack.includes(name))) return 'lead';
    if (namesFrom('BRIDGE_AUTHORITY_OPS').some((name) => haystack.includes(name))) return 'ops';

    for (const hint of AUTHORITY_HINTS) {
      if (hint.pattern.test(context)) return hint.authority;
    }
    return 'engineer';
  }

  /**
   * Decisions that carry a directive an agent must obey, ranked by how binding
   * they are. These become "Current Human Alignment" rules in CLAUDE.md.
   */
  bindingDirectives(transcript: MeetingTranscript): MeetingDecision[] {
    const weight: Record<MeetingDecision['polarity'], number> = {
      reject: 4, freeze: 4, mandate: 3, adopt: 2, neutral: 0,
    };
    const authorityBoost: Record<MeetingDecision['authority'], number> = {
      lead: 2, ops: 2, engineer: 1, unknown: 0,
    };
    return transcript.decisions
      .filter((d) => d.polarity !== 'neutral')
      .sort((a, b) => weight[b.polarity] + authorityBoost[b.authority] - (weight[a.polarity] + authorityBoost[a.authority]));
  }
}
