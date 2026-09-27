import { SlackMessage } from '../common/types.js';

const API = 'https://slack.com/api/';
const CACHE_TTL_MS = 30_000;
const MAX_PAGES = 5;

interface ChannelInfo {
  id: string;
  name: string;
}

export interface SlackSearchInput {
  query_terms: string[];
  since: string;
  channel_hint?: string;
  participant_slack_id?: string;
}

export class SlackProvider {
  private token = process.env.SLACK_BOT_TOKEN ?? '';
  private configured = (process.env.SLACK_EVIDENCE_CHANNELS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  private channelCache: { channels: ChannelInfo[]; fetched: number } | null = null;
  private historyCache = new Map<string, { messages: SlackMessage[]; fetched: number }>();
  private userNames = new Map<string, string>();

  get enabled(): boolean {
    return !!this.token;
  }

  private async get(path: string, params: Record<string, string>): Promise<any> {
    const url = new URL(`${API}${path}`);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
    const resp = await fetch(url.toString(), {
      headers: { authorization: `Bearer ${this.token}` },
      signal: AbortSignal.timeout(15000),
    });
    const body = (await resp.json()) as any;
    if (!body.ok) {
      throw new Error(`Slack ${path} failed: ${body.error ?? resp.status}`);
    }
    return body;
  }

  private async post(path: string, payload: Record<string, unknown>): Promise<any> {
    const resp = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.token}`,
        'content-type': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify(payload),
    });
    const body = (await resp.json()) as any;
    if (!body.ok) {
      throw new Error(`Slack ${path} failed: ${body.error ?? resp.status}`);
    }
    return body;
  }

  private async listChannels(): Promise<ChannelInfo[]> {
    const channels: ChannelInfo[] = [];
    let cursor = '';
    for (let page = 0; page < MAX_PAGES; page++) {
      const params: Record<string, string> = { types: 'public_channel,private_channel', limit: '200' };
      if (cursor) {
        params.cursor = cursor;
      }
      const body = await this.get('conversations.list', params);
      for (const c of body.channels ?? []) {
        if (c.name && c.id) {
          channels.push({ id: c.id, name: c.name });
        }
      }
      cursor = body.response_metadata?.next_cursor ?? '';
      if (!cursor) {
        break;
      }
    }
    return channels;
  }

  /** Resolve the configured channel names/ids to real Slack channel ids. */
  private async fetchChannels(): Promise<ChannelInfo[]> {
    if (this.channelCache && Date.now() - this.channelCache.fetched < CACHE_TTL_MS) {
      return this.channelCache.channels;
    }

    let all: ChannelInfo[] = [];
    try {
      all = await this.listChannels();
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('missing_scope') || msg.includes('no_permission')) {
        console.error('[SlackProvider] add channels:read + groups:read scopes so channel names can be resolved');
      }
      // fall back to treating entries as raw ids below
    }

    const byName = new Map(all.map((c) => [c.name.toLowerCase(), c]));
    const resolved: ChannelInfo[] = [];

    for (const entry of this.configured) {
      const lower = entry.toLowerCase();
      const byNameHit = byName.get(lower);
      if (byNameHit) {
        resolved.push(byNameHit);
        continue;
      }
      const idHit = all.find((c) => c.id === entry);
      if (idHit) {
        resolved.push(idHit);
        continue;
      }
      try {
        const info = await this.get('conversations.info', { channel: entry });
        resolved.push({ id: entry, name: info.channel?.name ?? entry });
      } catch (err) {
        // entry is not a name or an id we can resolve — skip it
        console.error(`[SlackProvider] channel "${entry}" unresolvable: ${(err as Error).message}`);
      }
    }

    this.channelCache = { channels: resolved, fetched: Date.now() };
    return resolved;
  }

  private async resolveAuthorName(userId: string): Promise<string> {
    if (!userId) {
      return '';
    }
    const cached = this.userNames.get(userId);
    if (cached !== undefined) {
      return cached;
    }
    let name = userId;
    try {
      const info = await this.get('users.info', { user: userId });
      name = info.user?.real_name ?? info.user?.name ?? userId;
    } catch {
      // keep the user id as a fallback name
    }
    this.userNames.set(userId, name);
    return name;
  }

  private async fetchHistory(channelId: string): Promise<SlackMessage[]> {
    const cached = this.historyCache.get(channelId);
    if (cached && Date.now() - cached.fetched < CACHE_TTL_MS) {
      return cached.messages;
    }
    const messages: SlackMessage[] = [];
    let cursor = '';
    for (let page = 0; page < MAX_PAGES; page++) {
      const params: Record<string, string> = { channel: channelId, limit: '200' };
      if (cursor) {
        params.cursor = cursor;
      }
      const body = await this.get('conversations.history', params);
      for (const m of body.messages ?? []) {
        if (!m.text || m.type !== 'message' || m.text.startsWith('<!')) {
          continue;
        }
        const authorId = m.user ?? m.bot_id ?? '';
        const tsSec = parseFloat(m.ts);
        const date = new Date(tsSec * 1000).toISOString().slice(0, 10);
        messages.push({
          message_id: `${channelId}:${m.ts}`,
          channel: channelId,
          author: authorId ? await this.resolveAuthorName(authorId) : '',
          author_slack_id: authorId || undefined,
          text: m.text,
          timestamp: date,
        });
      }
      cursor = body.response_metadata?.next_cursor ?? '';
      if (!cursor) {
        break;
      }
    }
    this.historyCache.set(channelId, { messages, fetched: Date.now() });
    return messages;
  }

  async search(input: SlackSearchInput): Promise<SlackMessage[]> {
    const sinceTs = new Date(`${input.since}T00:00:00Z`).getTime();
    const channels = await this.fetchChannels();
    const matched: SlackMessage[] = [];
    for (const ch of channels) {
      if (input.channel_hint && !ch.name.toLowerCase().includes(input.channel_hint.toLowerCase())) {
        continue;
      }
      const history = await this.fetchHistory(ch.id);
      for (const m of history) {
        if (new Date(`${m.timestamp}T00:00:00Z`).getTime() < sinceTs) {
          continue;
        }
        if (input.participant_slack_id && m.author_slack_id !== input.participant_slack_id) {
          continue;
        }
        const haystack = m.text.toLowerCase();
        if (!input.query_terms.some((t) => t && haystack.includes(t.toLowerCase()))) {
          continue;
        }
        matched.push({ ...m, channel: ch.name });
      }
    }
    return matched;
  }

  async postDm(userId: string, text: string): Promise<string> {
    const body = await this.post('chat.postMessage', { channel: userId, text });
    return body.ts ?? '';
  }
}
