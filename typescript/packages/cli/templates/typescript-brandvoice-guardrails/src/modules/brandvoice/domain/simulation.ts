/**
 * Copyright 2025 Nitrostack Inc
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  HARD_LIMITS,
  PROFANITY_TERMS,
  PROMISE_PHRASES,
  SLANG_TERMS,
  VOICE_BANDS,
} from './limits.js';
import type { Command, Message, ToneScore } from './types.js';

// ---------------------------------------------------------------------------
// Tone scorer
// Deterministic and offline: the same text always gets the same score. Swap it for a
// classifier model later; the guardrail only needs the numbers it returns.
// ---------------------------------------------------------------------------

const escape = (term: string) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Matches a term as whole words, so `hell` does not match `hello`. */
const matcher = (term: string) => new RegExp(`(?<![\\w'])${escape(term)}(?![\\w'])`, 'gi');

const SLANG = SLANG_TERMS.map((term) => [term, matcher(term)] as const);
const PROFANITY = PROFANITY_TERMS.map(matcher);
const PROMISES = PROMISE_PHRASES.map(matcher);

/** Scores a draft: voice, slang (0–10), profanity count and binding promises. */
export function scoreText(raw: string): ToneScore {
  const text = raw.replace(/[‘’]/g, "'");
  const terms = SLANG.filter(([, re]) => text.match(re)).map(([term]) => term);
  const slang = Math.min(HARD_LIMITS.slangScale, terms.length);
  const profanity = PROFANITY.reduce((n, re) => n + (text.match(re)?.length ?? 0), 0);
  const promise = PROMISES.some((re) => text.match(re));
  const voice = VOICE_BANDS.find(([, min]) => slang >= min)![0];
  return { voice, slang, profanity, promise, terms };
}

/** Total people reached by a set of messages. */
export const totalReach = (messages: Message[]) =>
  messages.reduce((total, m) => total + m.reach, 0);

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

export interface Projection {
  /** The full message list as it would look after the command runs. */
  rows: Message[];
  /** IDs of messages the command creates or changes. */
  affected: string[];
}

/**
 * Projects the effect of a command without touching the input list. Guardrails evaluate
 * the projection; only an allowed operation installs it as the team's new state.
 *
 * @param nextId Allocates an ID for each message the command creates.
 */
export function simulate(messages: Message[], command: Command, nextId: () => string): Projection {
  const rows = structuredClone(messages);
  const affected: string[] = [];

  const add = (row: Omit<Message, 'id' | 'previous' | keyof ToneScore>) => {
    const id = nextId();
    const { terms: _terms, ...score } = scoreText(row.text);
    rows.push({ ...row, ...score, id, previous: [] });
    affected.push(id);
  };

  switch (command.tool) {
    case 'send_reply': {
      const a = command.args;
      add({
        name: 'Reply to ' + a.customer,
        type: 'reply',
        channel: a.channel,
        audience: 'direct',
        text: a.text,
        reach: 1,
        status: 'sent',
        detail: a.customer,
      });
      break;
    }

    case 'publish_post': {
      const a = command.args;
      add({
        name: a.title,
        type: 'post',
        channel: a.channel,
        audience: a.audience,
        text: a.text,
        reach: a.followers,
        status: 'published',
        detail: a.followers.toLocaleString('en-US') + ' followers',
      });
      break;
    }

    case 'schedule_campaign': {
      const a = command.args;
      add({
        name: a.name,
        type: 'campaign',
        channel: a.channel,
        audience: a.audience,
        text: a.text,
        reach: a.recipients,
        status: 'scheduled',
        detail: a.recipients.toLocaleString('en-US') + ' recipients',
      });
      break;
    }

    default: {
      // Operations on an existing message.
      const a = command.args;
      const row = rows.find((r) => r.id === a.messageId);
      const matches =
        !!row && (!('messageType' in a) || (row.type === a.messageType && row.audience === a.audience));
      if (!row || !matches) throw new Error('Message unavailable');
      affected.push(row.id);

      if (command.tool === 'boost_message') row.reach = command.args.reach;
      if (command.tool === 'retract_message') rows.splice(rows.indexOf(row), 1);
      if (command.tool === 'edit_message') {
        const { terms: _terms, ...score } = scoreText(command.args.text);
        row.previous.push(row.text);
        Object.assign(row, score, { text: command.args.text });
      }
    }
  }

  return { rows, affected };
}
