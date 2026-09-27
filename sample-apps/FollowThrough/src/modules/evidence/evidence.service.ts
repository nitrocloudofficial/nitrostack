import { Injectable, OnModuleInit } from '@nitrostack/core';
import { StoreService } from '../store/store.service.js';
import { SLACK_FIXTURE, SlackFixtureEntry } from './mock-data/slack.fixture.js';
import { EMAIL_FIXTURE, EmailFixtureEntry } from './mock-data/email.fixture.js';
import { SlackProvider } from '../../providers/slack.js';
import { EmailProvider } from '../../providers/email.js';
import {
  Commitment,
  EmailMessage,
  EvidenceEntry,
  SlackMessage,
} from '../../common/types.js';
import { addDays } from '../../common/dates.js';
import { DONE_THRESHOLD, scoreEvidence, tokenize } from '../../common/matching.js';

export interface SlackSearchInput {
  query_terms: string[];
  channel_hint?: string;
  participant_slack_id?: string;
  since: string;
}

export interface EmailSearchInput {
  query_terms: string[];
  to_domain_hint?: string;
  since: string;
}

export interface FulfillmentResult {
  fulfilled: boolean;
  evidence: EvidenceEntry[];
  best_score: number;
}

@Injectable({ deps: [StoreService] })
export class EvidenceService implements OnModuleInit {
  private slackProvider = new SlackProvider();
  private emailProvider = new EmailProvider();
  private slackMessages: SlackMessage[] = [];
  private emailMessages: EmailMessage[] = [];

  constructor(private store: StoreService) {}

  onModuleInit(): void {
    this.refreshMessages();
  }

  refreshMessages(): void {
    const today = this.store.getVirtualToday();
    this.slackMessages = SLACK_FIXTURE.map((m: SlackFixtureEntry) => ({
      message_id: m.message_id,
      channel: m.channel,
      author: m.author,
      author_slack_id: m.author_slack_id,
      text: m.text,
      timestamp: addDays(today, m.day_offset),
    }));
    this.emailMessages = EMAIL_FIXTURE.map((m: EmailFixtureEntry) => ({
      message_id: m.message_id,
      from: m.from,
      to: m.to,
      subject: m.subject,
      body: m.body,
      timestamp: addDays(today, m.day_offset),
    }));
  }

  async searchSlack(input: SlackSearchInput): Promise<SlackMessage[]> {
    if (this.slackProvider.enabled) {
      return this.slackProvider.search(input);
    }
    this.refreshMessages();
    const since = new Date(input.since + 'T00:00:00Z').getTime();
    return this.slackMessages.filter((m) => {
      if (new Date(m.timestamp + 'T00:00:00Z').getTime() < since) {
        return false;
      }
      if (input.channel_hint && !m.channel.toLowerCase().includes(input.channel_hint.toLowerCase())) {
        return false;
      }
      if (input.participant_slack_id && m.author_slack_id !== input.participant_slack_id) {
        return false;
      }
      const haystack = m.text.toLowerCase();
      return input.query_terms.some((t) => t && haystack.includes(t.toLowerCase()));
    });
  }

  async searchEmail(input: EmailSearchInput): Promise<EmailMessage[]> {
    if (this.emailProvider.canSearch) {
      return this.emailProvider.search(input);
    }
    this.refreshMessages();
    const since = new Date(input.since + 'T00:00:00Z').getTime();
    return this.emailMessages.filter((m) => {
      if (new Date(m.timestamp + 'T00:00:00Z').getTime() < since) {
        return false;
      }
      if (input.to_domain_hint && !m.to.toLowerCase().includes(input.to_domain_hint.toLowerCase())) {
        return false;
      }
      const haystack = `${m.subject} ${m.body}`.toLowerCase();
      return input.query_terms.some((t) => t && haystack.includes(t.toLowerCase()));
    });
  }

  buildQueryTerms(commitment: Commitment): string[] {
    const terms = new Set<string>();
    for (const t of tokenize(commitment.what)) {
      terms.add(t);
    }
    for (const t of tokenize(commitment.beneficiary.name)) {
      terms.add(t);
    }
    return Array.from(terms);
  }

  async checkFulfilled(commitment: Commitment): Promise<FulfillmentResult> {
    const terms = this.buildQueryTerms(commitment);
    const since = commitment.created_at;
    const evidence: EvidenceEntry[] = [];
    let bestScore = 0;

    const [slackMatches, emailMatches] = await Promise.all([
      this.searchSlack({ query_terms: terms, since }),
      this.searchEmail({ query_terms: terms, since }),
    ]);

    for (const m of slackMatches) {
      const authorMatches =
        m.author_slack_id === commitment.owner.slack_id ||
        m.author.toLowerCase() === commitment.owner.name.toLowerCase();
      const score = scoreEvidence(commitment.what, m.text, authorMatches);
      if (score > bestScore) {
        bestScore = score;
      }
      evidence.push({
        source: 'slack',
        ref: m.message_id,
        summary: `#${m.channel} \u2014 ${m.author}: "${m.text}"`,
        matched_score: Number(score.toFixed(2)),
      });
    }

    for (const m of emailMatches) {
      const authorMatches = m.from.toLowerCase() === commitment.owner.email?.toLowerCase();
      const score = scoreEvidence(commitment.what, `${m.subject} ${m.body}`, authorMatches);
      if (score > bestScore) {
        bestScore = score;
      }
      evidence.push({
        source: 'email',
        ref: m.message_id,
        summary: `To: ${m.to} \u2014 "${m.subject}"`,
        matched_score: Number(score.toFixed(2)),
      });
    }

    const strong = evidence.filter((e) => e.matched_score >= DONE_THRESHOLD);
    return {
      fulfilled: strong.length > 0,
      evidence,
      best_score: Number(bestScore.toFixed(2)),
    };
  }
}
