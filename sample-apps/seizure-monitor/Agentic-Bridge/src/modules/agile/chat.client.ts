/**
 * Slack client — the Scrum Analyst's live data source.
 *
 * This replaces the Microsoft Teams transcript fixture. Teams would mean Graph,
 * which means an app registration, an admin consent flow and a
 * RSC/OnlineMeetingTranscript permission before a single message arrives;
 * Slack means one bot token and one GET. For reading the last N messages of a
 * channel, the Graph ceremony buys nothing.
 *
 * The important design decision is what this returns. It does NOT re-implement
 * decision extraction — it renders the channel into exactly the transcript
 * layout `AgileService.parseTranscript` already parses:
 *
 *     Slack — #aurora-billing
 *     Wednesday, 23 July 2026
 *     Attendees: D. Fairbanks, K. Brandt, P. Narang
 *
 *     [10:04] D. Fairbanks: we are NOT introducing Redis...
 *
 * Everything valuable downstream — utterance segmentation, entity extraction,
 * adopt/reject/freeze/mandate classification, authority weighting, the conflict
 * engine — is reused untouched. Swapping the source is a rendering problem, not
 * a rewrite.
 */
import { Injectable } from '@nitrostack/core';
import { fetchJson, describeHttpFailure } from '../../shared/services/http.util.js';

const SLACK_API = 'https://slack.com/api';
const DEFAULT_LIMIT = 50;
/** Slack caps conversations.history at 1000; ours is a demo-shaped window. */
const MAX_LIMIT = 200;

export interface SlackConfig {
  token: string;
  channelId: string;
  limit: number;
}

export type ChatFetch =
  | { ok: true; transcript: string; sourceName: string; messageCount: number; channelName: string }
  | { ok: false; kind: 'unconfigured' | 'error'; reason: string };

interface SlackMessage {
  type?: string;
  subtype?: string;
  user?: string;
  bot_id?: string;
  username?: string;
  text?: string;
  ts?: string;
}

interface SlackEnvelope<T> {
  ok?: boolean;
  error?: string;
  [key: string]: unknown;
}

@Injectable()
export class SlackClient {
  /** displayName cache, keyed by Slack user id. Lives for the process. */
  private readonly userNames = new Map<string, string>();

  config(): SlackConfig | null {
    const token = process.env.SLACK_BOT_TOKEN?.trim();
    const channelId = process.env.SLACK_CHANNEL_ID?.trim();
    if (!token || !channelId) return null;

    const requested = Number(process.env.SLACK_MESSAGE_LIMIT ?? DEFAULT_LIMIT);
    const limit = Number.isFinite(requested) ? Math.min(Math.max(1, requested), MAX_LIMIT) : DEFAULT_LIMIT;
    return { token, channelId, limit };
  }

  get configured(): boolean {
    return this.config() !== null;
  }

  missing(): string[] {
    const gaps: string[] = [];
    if (!process.env.SLACK_BOT_TOKEN?.trim()) gaps.push('SLACK_BOT_TOKEN');
    if (!process.env.SLACK_CHANNEL_ID?.trim()) gaps.push('SLACK_CHANNEL_ID');
    return gaps;
  }

  configurationHint(): string {
    return (
      `Live Slack is not configured — set ${this.missing().join(', ')} in .env. ` +
      `Create a bot at api.slack.com/apps with the channels:history, groups:history and ` +
      `users:read scopes, invite it to the channel, then use its xoxb- token. ` +
      `SLACK_CHANNEL_ID is the C… id from the channel's "Copy link".`
    );
  }

  /** Read the channel and render it as a transcript. Never throws. */
  async fetchTranscript(channelOverride?: string, limitOverride?: number): Promise<ChatFetch> {
    const config = this.config();
    if (!config) return { ok: false, kind: 'unconfigured', reason: this.configurationHint() };

    const channelId = channelOverride?.trim() || config.channelId;
    const limit = Math.min(Math.max(1, limitOverride ?? config.limit), MAX_LIMIT);

    const history = await this.call<{ messages?: SlackMessage[] }>(config.token, 'conversations.history', {
      channel: channelId,
      limit: String(limit),
    });
    if (!history.ok) return { ok: false, kind: 'error', reason: history.reason };

    // Slack returns newest-first; a transcript reads forwards.
    const messages = (history.data.messages ?? [])
      .filter((m) => this.isUtterance(m))
      .reverse();

    if (!messages.length) {
      return {
        ok: false,
        kind: 'error',
        reason:
          `Slack channel ${channelId} returned no readable messages. ` +
          `Confirm the bot is a member of the channel and that it has read scope.`,
      };
    }

    const channelName = await this.channelName(config.token, channelId);
    await this.primeUserNames(config.token, messages);

    return {
      ok: true,
      transcript: this.render(channelName, messages),
      sourceName: `Slack #${channelName}`,
      channelName,
      messageCount: messages.length,
    };
  }

  /**
   * Compose the transcript. Every line here exists because the parser looks for
   * it: the title line, the `\w+day,` date line, the `Attendees:` line and the
   * `[HH:MM] Speaker: text` utterance headers.
   */
  private render(channelName: string, messages: SlackMessage[]): string {
    const speakers = [...new Set(messages.map((m) => this.speakerOf(m)))];
    const firstTs = Number(messages[0]?.ts ?? 0) * 1000;
    const dateLine = new Date(firstTs || Date.now()).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const lines = [
      `Slack — #${channelName}`,
      dateLine,
      `Attendees: ${speakers.join(', ')}`,
      '',
    ];

    for (const message of messages) {
      const time = new Date(Number(message.ts) * 1000).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      // One message per line: the parser treats a blank line as an utterance
      // boundary, and embedded newlines would split one decision into several.
      const text = this.plainText(message.text ?? '').replace(/\s*\n\s*/g, ' ').trim();
      if (!text) continue;
      lines.push(`[${time}] ${this.speakerOf(message)}: ${text}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * A speaker label the parser's `[^:]{2,40}` header pattern will accept:
   * colons removed, length clamped, never shorter than two characters.
   */
  private speakerOf(message: SlackMessage): string {
    const raw =
      (message.user && this.userNames.get(message.user)) ||
      message.username ||
      (message.bot_id ? `bot ${message.bot_id}` : undefined) ||
      message.user ||
      'unknown';
    const cleaned = raw.replace(/:/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
    return cleaned.length >= 2 ? cleaned : `user ${cleaned}`.trim();
  }

  /** Joins, leaves, pins and other channel chrome are not decisions. */
  private isUtterance(message: SlackMessage): boolean {
    if (message.type && message.type !== 'message') return false;
    if (message.subtype && message.subtype !== 'bot_message' && message.subtype !== 'thread_broadcast') {
      return false;
    }
    return Boolean(message.text?.trim());
  }

  /** Resolve every distinct author once, in parallel. */
  private async primeUserNames(token: string, messages: SlackMessage[]): Promise<void> {
    const ids = [...new Set(messages.map((m) => m.user).filter((id): id is string => !!id))].filter(
      (id) => !this.userNames.has(id)
    );

    await Promise.all(
      ids.map(async (id) => {
        const info = await this.call<{ user?: { real_name?: string; profile?: { display_name?: string }; name?: string } }>(
          token,
          'users.info',
          { user: id }
        );
        if (!info.ok) return; // fall back to the raw id rather than failing the read
        const user = info.data.user;
        const name = user?.profile?.display_name || user?.real_name || user?.name;
        if (name) this.userNames.set(id, name);
      })
    );
  }

  private async channelName(token: string, channelId: string): Promise<string> {
    const info = await this.call<{ channel?: { name?: string } }>(token, 'conversations.info', {
      channel: channelId,
    });
    return (info.ok && info.data.channel?.name) || channelId;
  }

  /**
   * One Slack Web API call.
   *
   * Slack answers HTTP 200 with `{ ok: false, error: "not_in_channel" }`, so a
   * transport-level success is not a success. That second check is where most
   * real Slack integration bugs live, which is why it is handled once here.
   */
  private async call<T>(
    token: string,
    method: string,
    params: Record<string, string>
  ): Promise<{ ok: true; data: T } | { ok: false; reason: string }> {
    const query = new URLSearchParams(params).toString();
    const result = await fetchJson<SlackEnvelope<T>>(
      `${SLACK_API}/${method}?${query}`,
      { headers: { Authorization: `Bearer ${token}` } },
      { label: `Slack ${method}` }
    );

    if (!result.ok) return { ok: false, reason: describeHttpFailure(result.failure) };
    if (result.data?.ok === false) {
      return { ok: false, reason: `Slack ${method} refused the request: ${this.explainSlackError(result.data.error)}` };
    }
    return { ok: true, data: result.data as T };
  }

  /** Slack's error slugs are terse; say what to actually do about each. */
  private explainSlackError(error?: string): string {
    switch (error) {
      case 'not_in_channel':
        return 'not_in_channel — invite the bot to the channel (/invite @your-bot).';
      case 'channel_not_found':
        return 'channel_not_found — check SLACK_CHANNEL_ID; it should be the C… id, not the #name.';
      case 'invalid_auth':
      case 'not_authed':
        return `${error} — SLACK_BOT_TOKEN is missing or wrong. It should start with xoxb-.`;
      case 'missing_scope':
        return 'missing_scope — add channels:history (and groups:history for private channels) and reinstall the app.';
      case 'ratelimited':
        return 'ratelimited — Slack is throttling; retry shortly.';
      default:
        return error ?? 'unknown error';
    }
  }

  /**
   * Slack markup → the plain prose the semantic layer expects.
   * `<@U123>` mentions resolve to names when we already know them.
   */
  private plainText(text: string): string {
    return text
      .replace(/<@([UW][A-Z0-9]+)(\|[^>]*)?>/g, (_m, id: string) => `@${this.userNames.get(id) ?? id}`)
      .replace(/<#C[A-Z0-9]+\|([^>]+)>/g, '#$1')
      .replace(/<(https?:\/\/[^>|]+)\|([^>]+)>/g, '$2')
      .replace(/<(https?:\/\/[^>]+)>/g, '$1')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/[ \t]+/g, ' ')
      .trim();
  }
}
