import { Injectable } from '@nitrostack/core';
import {
  ConfidenceLevel,
  ExtractResult,
  Person,
} from '../../common/types.js';
import { addDays, todayISO } from '../../common/dates.js';
import { PARTICIPANTS_FIXTURE } from './fixtures/participants.fixture.js';

export interface ExtractInput {
  transcript_id: string;
  transcript_text: string;
  meeting_date: string;
  participants?: Person[];
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const MARKERS: Array<{ level: ConfidenceLevel; regex: RegExp }> = [
  { level: 'aspirational', regex: /^(we should|maybe we should|we should probably|we might want to|it might be good to)\b/i },
  { level: 'hedged', regex: /^(i(?:'ll| will) try|i(?:'ll| will) attempt|i(?:'ll| will) see if|i'll do my best)\b/i },
  { level: 'committed', regex: /^(i(?:'ll| will) )/i },
];

@Injectable({ deps: [] })
export class IngestionService {
  async extract(input: ExtractInput): Promise<ExtractResult[]> {
    const provider = this.resolveProvider();
    if (provider) {
      try {
        const viaLlm =
          provider === 'openrouter'
            ? await this.extractWithOpenRouter(input)
            : await this.extractWithAnthropic(input);
        if (viaLlm.length > 0) {
          return viaLlm;
        }
      } catch {
        // fall through to the deterministic extractor
      }
    }
    return this.extractDeterministic(input);
  }

  resolveProvider(): 'anthropic' | 'openrouter' | null {
    const forced = (process.env.LLM_PROVIDER || 'auto').toLowerCase();
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
    const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
    if (forced === 'anthropic') {
      return hasAnthropic ? 'anthropic' : null;
    }
    if (forced === 'openrouter') {
      return hasOpenRouter ? 'openrouter' : null;
    }
    if (forced === 'none') {
      return null;
    }
    if (hasAnthropic) {
      return 'anthropic';
    }
    if (hasOpenRouter) {
      return 'openrouter';
    }
    return null;
  }

  private buildExtractionPrompt(input: ExtractInput): string {
    return `Extract every commitment made in this meeting transcript. A commitment is a specific promise by one participant to deliver something concrete, usually with an explicit "by <date>" deadline.

For each commitment return ONLY an object with these fields:
- owner: name of the person making the promise (exact spelling from the transcript)
- beneficiary: who receives it, e.g. "Acme Logistics" (use "Internal" if it stays inside the company)
- beneficiary_type: "external" or "internal"
- what: a short noun phrase describing the deliverable, e.g. "Send the vendor report to Acme Logistics"
- text_raw: the exact spoken sentence containing the promise
- confidence_level: "committed" if an unqualified "I will/I'll", "hedged" if qualified with "try", "aspirational" if a wish like "we should probably"
- due_date: the resolved deadline as YYYY-MM-DD (resolve relative dates like "by Friday" against the meeting date)

Meeting date: ${input.meeting_date}
Return ONLY a JSON array. No markdown, no commentary.

Transcript:
${input.transcript_text}`;
  }

  private async extractWithAnthropic(input: ExtractInput): Promise<ExtractResult[]> {
    const roster = input.participants && input.participants.length > 0 ? input.participants : PARTICIPANTS_FIXTURE;
    const model = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';
    const prompt = this.buildExtractionPrompt(input);

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY as string,
        'anthropic-version': '2023-06-01',
      },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!resp.ok) {
      throw new Error(`Anthropic API ${resp.status}: ${await resp.text()}`);
    }

    const body = (await resp.json()) as { content: Array<{ type: string; text?: string }> };
    const text = body.content.map((b) => (b.type === 'text' && b.text ? b.text : '')).join('');
    return this.parseLlmResponse(text, input, roster);
  }

  private async extractWithOpenRouter(input: ExtractInput): Promise<ExtractResult[]> {
    const roster = input.participants && input.participants.length > 0 ? input.participants : PARTICIPANTS_FIXTURE;
    const model = process.env.OPENROUTER_MODEL ?? 'meta-llama/llama-3.1-8b-instruct:free';
    const prompt = this.buildExtractionPrompt(input);

    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.OPENROUTER_API_KEY as string}`,
      },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!resp.ok) {
      throw new Error(`OpenRouter API ${resp.status}: ${await resp.text()}`);
    }

    const body = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = body.choices?.[0]?.message?.content ?? '';
    return this.parseLlmResponse(text, input, roster);
  }

  private parseLlmResponse(text: string, input: ExtractInput, roster: Person[]): ExtractResult[] {
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map((c: any) => this.normalize(c, input, roster));
  }

  extractDeterministic(input: ExtractInput): ExtractResult[] {
    const roster = input.participants && input.participants.length > 0 ? input.participants : PARTICIPANTS_FIXTURE;
    const meeting = input.meeting_date || todayISO();
    const results: ExtractResult[] = [];
    const lines = input.transcript_text.split(/\r?\n/);

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) {
        continue;
      }
      const turn = line.match(/^([A-Za-z][A-Za-z .'-]*):\s*(.+)$/);
      if (!turn) {
        continue;
      }
      const speakerName = turn[1].trim();
      const speech = turn[2].trim();

      const marker = MARKERS.find((m) => m.regex.test(speech));
      if (!marker) {
        continue;
      }

      const rest = speech.replace(marker.regex, '').trim().replace(/^to\s+/i, '');
      const { what, byExpr } = this.splitByClause(rest);
      const dueDate = byExpr ? this.resolveDate(byExpr, meeting) : '';
      const owner = this.resolveOwner(speakerName, roster);
      const beneficiary = this.extractBeneficiary(rest, roster);

      results.push({
        meeting_id: input.transcript_id,
        text_raw: speech,
        owner,
        beneficiary,
        what: what || speech,
        due_date: dueDate,
        confidence_level: marker.level,
        confidence_phrase: speech,
      });
    }
    return results;
  }

  private normalize(raw: any, input: ExtractInput, roster: Person[]): ExtractResult {
    const owner = this.resolveOwner(raw.owner, roster);
    const level: ConfidenceLevel = ['committed', 'hedged', 'aspirational'].includes(raw.confidence_level)
      ? raw.confidence_level
      : 'committed';
    let due = typeof raw.due_date === 'string' ? raw.due_date : '';
    const match = due.match(/^\d{4}-\d{2}-\d{2}$/);
    if (!match) {
      due = '';
    }
    return {
      meeting_id: input.transcript_id,
      text_raw: raw.text_raw ?? '',
      owner,
      beneficiary: {
        name: raw.beneficiary ?? 'Internal',
        type: raw.beneficiary_type === 'external' ? 'external' : 'internal',
      },
      what: raw.what ?? raw.text_raw ?? '',
      due_date: due,
      confidence_level: level,
      confidence_phrase: raw.text_raw ?? '',
    };
  }

  private splitByClause(s: string): { what: string; byExpr: string | null } {
    const byIdx = s.toLowerCase().lastIndexOf(' by ');
    if (byIdx > 0) {
      const what = s.slice(0, byIdx).trim().replace(/[.,;]+$/, '');
      const byExpr = s.slice(byIdx + 4).trim().replace(/[.,;]+$/, '');
      return { what, byExpr: byExpr || null };
    }
    return { what: s.trim().replace(/[.,;]+$/, ''), byExpr: null };
  }

  private resolveDate(expr: string, meetingDate: string): string {
    const e = expr.toLowerCase().trim();
    if (e === 'today') {
      return meetingDate;
    }
    if (e === 'tomorrow') {
      return addDays(meetingDate, 1);
    }
    if (/^next week/.test(e)) {
      return addDays(meetingDate, 7);
    }
    if (/^end of week/.test(e)) {
      const d = new Date(meetingDate + 'T00:00:00Z');
      const days = (5 - d.getUTCDay() + 7) % 7 || 7;
      return addDays(meetingDate, days);
    }
    if (/^end of month/.test(e)) {
      const d = new Date(meetingDate + 'T00:00:00Z');
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
    }
    const iso = e.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
      return `${iso[1]}-${iso[2]}-${iso[3]}`;
    }
    const month = e.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?/);
    if (month) {
      const mi = MONTHS.indexOf(month[1]);
      const day = parseInt(month[2], 10);
      const base = new Date(meetingDate + 'T00:00:00Z');
      let year = base.getUTCFullYear();
      if (mi < base.getUTCMonth() || (mi === base.getUTCMonth() && day < base.getUTCDate())) {
        year += 1;
      }
      const resolved = new Date(Date.UTC(year, mi, day));
      if (!isNaN(resolved.getTime())) {
        return resolved.toISOString().slice(0, 10);
      }
    }
    const weekday = e.match(/(sun|mon|tue|wed|thu|fri|sat)[a-z]*/);
    if (weekday) {
      const target = WEEKDAYS.indexOf(weekday[1]);
      const base = new Date(meetingDate + 'T00:00:00Z');
      for (let i = 1; i <= 7; i++) {
        const next = new Date(base.getTime());
        next.setUTCDate(base.getUTCDate() + i);
        if (next.getUTCDay() === target) {
          return next.toISOString().slice(0, 10);
        }
      }
    }
    return '';
  }

  private extractBeneficiary(rest: string, roster: Person[]): { name: string; type: 'internal' | 'external' } {
    const match = rest.match(/\bto\s+(?:the\s+|our\s+)?([A-Z][A-Za-z0-9&' .-]+)/);
    if (!match) {
      return { name: 'Internal', type: 'internal' };
    }
    const name = match[1].trim().replace(/[.,;]+$/, '');
    const isRoster = roster.some((p) => p.name.toLowerCase() === name.toLowerCase());
    return { name, type: isRoster ? 'internal' : 'external' };
  }

  private resolveOwner(name: string, roster: Person[]): Person {
    const person = roster.find((p) => p.name.toLowerCase() === name.toLowerCase());
    if (person) {
      if (!this.demoMode) {
        return person;
      }
      const fixture = PARTICIPANTS_FIXTURE.find((p) => p.name.toLowerCase() === person.name.toLowerCase());
      return fixture ? { ...fixture, email: person.email ?? fixture.email, slack_id: person.slack_id ?? fixture.slack_id } : person;
    }
    if (this.demoMode) {
      const fixture = PARTICIPANTS_FIXTURE.find((p) => p.name.toLowerCase() === name.toLowerCase());
      if (fixture) {
        return fixture;
      }
    }
    return { name };
  }

  private get demoMode(): boolean {
    return !(
      process.env.SLACK_BOT_TOKEN ||
      (process.env.EMAIL_IMAP_USER && process.env.EMAIL_IMAP_HOST) ||
      process.env.LINEAR_API_KEY
    );
  }
}
