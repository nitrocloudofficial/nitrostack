/**
 * Jira Agile REST client — the Product Synchronizer's live data source.
 *
 * Two calls, in this order:
 *   GET /rest/agile/1.0/board/{boardId}/sprint?state=active   → the sprint
 *   GET /rest/agile/1.0/sprint/{sprintId}/issue               → its issues
 *
 * plus an optional board lookup when the operator has not pinned one. That is
 * the whole integration: no SDK, no OAuth dance, no webhook receiver. An API
 * token and basic auth is what Atlassian documents for server-to-server reads,
 * and it is the only thing that fits in a `.env`.
 *
 * The output is the existing `JiraSprint` shape, which matters more than it
 * looks: the conflict engine, the manifest and every persona already consume
 * it, so making the data real changes nothing downstream.
 */
import { Injectable } from '@nitrostack/core';
import { fetchJson, basicAuth, describeHttpFailure, type HttpFailure } from '../../shared/services/http.util.js';
import { JiraSprintSchema, type JiraSprint, type JiraTicket } from '../../shared/schemas/index.js';

/** Issues fetched per sprint. Beyond this a sprint is not a sprint. */
const MAX_ISSUES = 100;

/**
 * Story points live in a custom field whose id differs per Jira site. The
 * default is the most common one; sites that differ set the env var. We also
 * sniff the usual alternates, because "story points silently missing" is a
 * worse failure than one extra key lookup.
 */
const STORY_POINT_FIELDS = ['customfield_10016', 'customfield_10026', 'customfield_10004'];

export interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  boardId?: string;
  projectKey?: string;
}

export type JiraFetch =
  | { ok: true; sprint: JiraSprint; boardId: number; boardName: string }
  | { ok: false; kind: 'unconfigured' | 'error'; reason: string };

interface JiraBoard {
  id: number;
  name: string;
  location?: { projectKey?: string };
}

interface JiraSprintPayload {
  id: number;
  name: string;
  state: string;
  startDate?: string;
  endDate?: string;
  goal?: string;
}

interface JiraIssuePayload {
  key: string;
  fields: Record<string, unknown> & {
    summary?: string;
    description?: unknown;
    labels?: string[];
    updated?: string;
    status?: { name?: string };
    assignee?: { displayName?: string; emailAddress?: string };
    issuetype?: { name?: string };
  };
}

@Injectable()
export class JiraClient {
  /**
   * Credentials, if all three are present.
   *
   * `JIRA_BASE_URL` is the name this repository already uses for the pipeline's
   * `update_jira` effect; `JIRA_DOMAIN` is accepted as an alias so a bare
   * hostname works too. One integration, one set of variables.
   */
  config(): JiraConfig | null {
    const raw = (process.env.JIRA_BASE_URL || process.env.JIRA_DOMAIN || '').trim();
    const email = process.env.JIRA_EMAIL?.trim();
    const apiToken = process.env.JIRA_API_TOKEN?.trim();
    if (!raw || !email || !apiToken) return null;

    const baseUrl = (/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).replace(/\/+$/, '');
    return {
      baseUrl,
      email,
      apiToken,
      boardId: process.env.JIRA_BOARD_ID?.trim() || undefined,
      projectKey: process.env.JIRA_PROJECT_KEY?.trim() || undefined,
    };
  }

  get configured(): boolean {
    return this.config() !== null;
  }

  /** Which variables are still missing, for the "configure me" message. */
  missing(): string[] {
    const gaps: string[] = [];
    if (!(process.env.JIRA_BASE_URL || process.env.JIRA_DOMAIN)?.trim()) gaps.push('JIRA_BASE_URL');
    if (!process.env.JIRA_EMAIL?.trim()) gaps.push('JIRA_EMAIL');
    if (!process.env.JIRA_API_TOKEN?.trim()) gaps.push('JIRA_API_TOKEN');
    return gaps;
  }

  configurationHint(): string {
    const gaps = this.missing();
    return (
      `Live Jira is not configured — set ${gaps.join(', ')} in .env ` +
      `(and optionally JIRA_BOARD_ID to pin a board, or JIRA_PROJECT_KEY to disambiguate). ` +
      `The API token comes from id.atlassian.com → Security → API tokens.`
    );
  }

  /** Fetch the active sprint and its issues. Never throws. */
  async fetchActiveSprint(boardIdOverride?: string): Promise<JiraFetch> {
    const config = this.config();
    if (!config) return { ok: false, kind: 'unconfigured', reason: this.configurationHint() };

    const board = await this.resolveBoard(config, boardIdOverride ?? config.boardId);
    if (!board.ok) return board;

    const sprints = await this.get<{ values?: JiraSprintPayload[] }>(
      config,
      `/rest/agile/1.0/board/${board.id}/sprint?state=active`
    );
    if (!sprints.ok) {
      return {
        ok: false,
        kind: 'error',
        reason: this.explainBoardFailure(sprints.failure, board.id),
      };
    }

    const active = sprints.data.values?.[0];
    if (!active) {
      return {
        ok: false,
        kind: 'error',
        reason:
          `Board ${board.id} ("${board.name}") has no active sprint. Start one in Jira, ` +
          `or point JIRA_BOARD_ID at a board that has one.`,
      };
    }

    const issues = await this.get<{ issues?: JiraIssuePayload[] }>(
      config,
      `/rest/agile/1.0/sprint/${active.id}/issue?maxResults=${MAX_ISSUES}`
    );
    if (!issues.ok) {
      return { ok: false, kind: 'error', reason: `Jira sprint ${active.id}: ${describeHttpFailure(issues.failure)}` };
    }

    // Parse through the schema for the same reason the fixture path does: a
    // surprise from the API fails here, loudly, rather than three layers down.
    const sprint = JiraSprintSchema.parse({
      board: board.name,
      sprint: {
        id: active.id,
        name: active.name,
        state: active.state,
        startDate: active.startDate,
        endDate: active.endDate,
        goal: active.goal || undefined,
      },
      issues: (issues.data.issues ?? []).map((issue) => this.toTicket(issue)),
    } satisfies JiraSprint);

    return { ok: true, sprint, boardId: board.id, boardName: board.name };
  }

  /**
   * Pin down which board to read.
   *
   * An explicit id is used as-is. Otherwise we list boards, filtered by
   * JIRA_PROJECT_KEY when set, and take the first — reporting the choice, so a
   * multi-board site sees which one it got rather than wondering.
   */
  private async resolveBoard(
    config: JiraConfig,
    boardId?: string
  ): Promise<{ ok: true; id: number; name: string } | { ok: false; kind: 'error'; reason: string }> {
    if (boardId) {
      if (!/^\d+$/.test(boardId)) {
        return { ok: false, kind: 'error', reason: `JIRA_BOARD_ID must be numeric, got "${boardId}".` };
      }
      return { ok: true, id: Number(boardId), name: `board ${boardId}` };
    }

    const query = config.projectKey ? `?projectKeyOrId=${encodeURIComponent(config.projectKey)}` : '';
    const boards = await this.get<{ values?: JiraBoard[] }>(config, `/rest/agile/1.0/board${query}`);
    if (!boards.ok) {
      return {
        ok: false,
        kind: 'error',
        reason: `Could not list Jira boards: ${describeHttpFailure(boards.failure)}`,
      };
    }

    const first = boards.data.values?.[0];
    if (!first) {
      return {
        ok: false,
        kind: 'error',
        reason:
          `No Jira boards are visible to ${config.email}` +
          (config.projectKey ? ` in project ${config.projectKey}` : '') +
          `. Check the account's permissions, or set JIRA_BOARD_ID explicitly.`,
      };
    }
    return { ok: true, id: first.id, name: first.name };
  }

  private async get<T>(config: JiraConfig, endpoint: string) {
    return fetchJson<T>(
      `${config.baseUrl}${endpoint}`,
      { headers: { Authorization: basicAuth(config.email, config.apiToken) } },
      { label: 'Jira' }
    );
  }

  private explainBoardFailure(failure: HttpFailure, boardId: number): string {
    if (failure.status === 404) {
      return `Jira board ${boardId} does not exist or is not visible to this account. Check JIRA_BOARD_ID.`;
    }
    return `Jira board ${boardId}: ${describeHttpFailure(failure)}`;
  }

  private toTicket(issue: JiraIssuePayload): JiraTicket {
    const fields = issue.fields ?? {};
    return {
      key: issue.key,
      type: fields.issuetype?.name ?? 'Task',
      status: fields.status?.name ?? 'Unknown',
      assignee: fields.assignee?.displayName ?? fields.assignee?.emailAddress,
      summary: fields.summary ?? '',
      description: this.plainText(fields.description),
      labels: Array.isArray(fields.labels) ? fields.labels : [],
      storyPoints: this.storyPoints(fields),
      updated: fields.updated,
    };
  }

  private storyPoints(fields: Record<string, unknown>): number | undefined {
    const configured = process.env.JIRA_STORY_POINTS_FIELD?.trim();
    for (const key of configured ? [configured, ...STORY_POINT_FIELDS] : STORY_POINT_FIELDS) {
      const value = fields[key];
      if (typeof value === 'number') return value;
    }
    return undefined;
  }

  /**
   * Flatten a description to plain text.
   *
   * Jira Cloud returns Atlassian Document Format (a nested node tree) on v3 and
   * a plain string on v2/Server. The semantic layer downstream embeds this text
   * for conflict detection, so ADF markup leaking through would pollute the
   * vectors with structural noise.
   */
  private plainText(value: unknown): string {
    if (!value) return '';
    if (typeof value === 'string') return value.trim();

    const parts: string[] = [];
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      if (!node || typeof node !== 'object') return;
      const n = node as { type?: string; text?: string; content?: unknown };
      if (typeof n.text === 'string') parts.push(n.text);
      if (n.content) walk(n.content);
      // Block-level nodes become sentence breaks so paragraphs do not fuse.
      if (n.type === 'paragraph' || n.type === 'heading' || n.type === 'listItem') parts.push('\n');
    };
    walk(value);

    return parts.join('').replace(/\n{2,}/g, '\n').replace(/[ \t]+/g, ' ').trim();
  }
}
