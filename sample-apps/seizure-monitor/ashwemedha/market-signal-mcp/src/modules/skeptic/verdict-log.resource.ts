/**
 * verdict-log.resource.ts — STUB for Person 3
 *
 * Person 3 owns this file. Shape locked in planning.md Section 3.
 * Do NOT change the VerdictLogEntry interface without team consensus.
 *
 * This stub exposes the Resource URI patterns so the widget (Person 4)
 * can build against them immediately with mock data.
 */

import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';

// ─── Canonical shape — DO NOT MODIFY without team consensus ───────────────────
export interface VerdictLogEntry {
  ticker: string;
  timestamp: string;                                      // ISO8601
  challenges_raised: string[];
  credibility_check: 'pass' | 'flagged';
  recycled_content_check: 'pass' | 'flagged';
  volume_context_check: 'organic' | 'explained_by_calendar_event';
  final_verdict: 'confirmed_signal' | 'weakened_signal' | 'rejected_signal';
  verdict_reasoning: string;                              // plain-language explanation
}

// ─── Persistence helpers (Person 3 implements tool logic on top of these) ─────
const DATA_DIR = path.join(process.cwd(), 'src', 'data', 'runtime');
const LOG_FILE = path.join(DATA_DIR, 'verdict-log.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readLog(): Record<string, VerdictLogEntry[]> {
  ensureDataDir();
  if (!fs.existsSync(LOG_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8')); } catch { return {}; }
}

export function writeVerdict(entry: VerdictLogEntry): void {
  const log = readLog();
  if (!log[entry.ticker]) log[entry.ticker] = [];
  log[entry.ticker].unshift(entry);
  log[entry.ticker] = log[entry.ticker].slice(0, 10);
  ensureDataDir();
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2), 'utf-8');
}

export function readLatestVerdict(ticker: string): VerdictLogEntry | null {
  const log = readLog();
  return log[ticker]?.[0] ?? null;
}

// ─── Resource definitions ──────────────────────────────────────────────────────
export class VerdictLogResources {
  @Resource({
    uri: 'verdict_log://latest/{ticker}',
    name: 'Verdict Log — Latest Entry',
    description:
      'Returns the most recent Skeptic verdict for a given ticker. ' +
      'Widget Panel 3 reads this. Shape: VerdictLogEntry. ' +
      '[Person 3 implements the Skeptic tools that write here]',
    mimeType: 'application/json',
    examples: {
      response: {
        contents: [{
          uri: 'verdict_log://latest/BTC',
          mimeType: 'application/json',
          text: JSON.stringify({
            ticker: 'BTC',
            timestamp: '2025-07-24T14:20:00Z',
            challenges_raised: ['High narrative entropy detected (retail hype vocabulary)', 'Reddit source has low credibility rating'],
            credibility_check: 'flagged',
            recycled_content_check: 'pass',
            volume_context_check: 'organic',
            final_verdict: 'weakened_signal',
            verdict_reasoning: 'Signal weakened by 2 flags: low-credibility source and high hype vocabulary ratio. Underlying ETF inflow data is real but overstated by viral chatter.'
          }, null, 2)
        }]
      }
    }
  })
  async getLatestVerdict(uri: string, ctx: ExecutionContext) {
    const ticker = uri.replace('verdict_log://latest/', '').toUpperCase();
    ctx.logger.info('verdict_log: read latest', { ticker });
    const entry = readLatestVerdict(ticker);
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: entry
          ? JSON.stringify(entry, null, 2)
          : JSON.stringify({ error: `No verdict yet for ${ticker}. Run Skeptic agent first.` }, null, 2)
      }]
    };
  }

  @Resource({
    uri: 'verdict_log://all',
    name: 'Verdict Log — All Tickers',
    description: 'Returns all Skeptic verdicts across all tracked tickers. Used by widget Panel 3.',
    mimeType: 'application/json',
    examples: { response: { contents: [{ uri: 'verdict_log://all', mimeType: 'application/json', text: '{ "entries": [...] }' }] } }
  })
  async getAllVerdicts(uri: string, ctx: ExecutionContext) {
    const log = readLog();
    const entries = Object.values(log).flat();
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({ entries, last_updated: new Date().toISOString() }, null, 2)
      }]
    };
  }
}
