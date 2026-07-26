/**
 * signal-log.resource.ts — STUB for Person 2
 *
 * Person 2 owns this file. Shape locked in planning.md Section 3.
 * Do NOT change the SignalLogEntry interface without team consensus.
 *
 * This stub exposes the Resource URI patterns so the widget (Person 4)
 * can build against them immediately with mock data.
 */

import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';

// ─── Canonical shape — DO NOT MODIFY without team consensus ───────────────────
export interface SignalLogEntry {
  ticker: string;
  timestamp: string;                                      // ISO8601
  price_reaction: 'already_moved' | 'moving_now' | 'not_yet_reacted';
  signal_score: number;                                   // 0–100
  signal_direction: 'bullish' | 'bearish' | 'neutral';
  reasoning: string;                                      // plain-language, cites findings_board
}

// ─── Persistence helpers (Person 2 implements these) ──────────────────────────
const DATA_DIR = path.join(process.cwd(), 'src', 'data', 'runtime');
const LOG_FILE = path.join(DATA_DIR, 'signal-log.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readLog(): Record<string, SignalLogEntry[]> {
  ensureDataDir();
  if (!fs.existsSync(LOG_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8')); } catch { return {}; }
}

export function writeSignal(entry: SignalLogEntry): void {
  const log = readLog();
  if (!log[entry.ticker]) log[entry.ticker] = [];
  log[entry.ticker].unshift(entry);
  log[entry.ticker] = log[entry.ticker].slice(0, 10);
  ensureDataDir();
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2), 'utf-8');
}

export function readLatestSignal(ticker: string): SignalLogEntry | null {
  const log = readLog();
  return log[ticker]?.[0] ?? null;
}

// ─── Resource definitions ──────────────────────────────────────────────────────
export class SignalLogResources {
  @Resource({
    uri: 'signal_log://latest/{ticker}',
    name: 'Signal Log — Latest Entry',
    description:
      'Returns the most recent Analyst signal for a given ticker. ' +
      'Skeptic agent reads this. Shape: SignalLogEntry. ' +
      '[Person 2 implements the Analyst tools that write here]',
    mimeType: 'application/json',
    examples: {
      response: {
        contents: [{
          uri: 'signal_log://latest/TSLA',
          mimeType: 'application/json',
          text: JSON.stringify({
            ticker: 'TSLA',
            timestamp: '2025-07-24T14:10:00Z',
            price_reaction: 'not_yet_reacted',
            signal_score: 72,
            signal_direction: 'bullish',
            reasoning: 'Findings board shows 3 positive headlines, mention_velocity: spiking, narrative_entropy: low. Price data shows no movement yet. Combined score: +72 bullish.'
          }, null, 2)
        }]
      }
    }
  })
  async getLatestSignal(uri: string, ctx: ExecutionContext) {
    const ticker = uri.replace('signal_log://latest/', '').toUpperCase();
    ctx.logger.info('signal_log: read latest', { ticker });
    const entry = readLatestSignal(ticker);
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: entry
          ? JSON.stringify(entry, null, 2)
          : JSON.stringify({ error: `No signal yet for ${ticker}. Run Analyst agent first.` }, null, 2)
      }]
    };
  }

  @Resource({
    uri: 'signal_log://all',
    name: 'Signal Log — All Tickers',
    description: 'Returns all Analyst signals across all tracked tickers. Used by widget Panel 2.',
    mimeType: 'application/json',
    examples: { response: { contents: [{ uri: 'signal_log://all', mimeType: 'application/json', text: '{ "entries": [...] }' }] } }
  })
  async getAllSignals(uri: string, ctx: ExecutionContext) {
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
