import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';

// ─── Canonical shape of a findings_board entry ────────────────────────────────
// ALL agents (Analyst, Skeptic) and the widget depend on this shape exactly.
// Do NOT change any field names without team consensus.
export interface HeadlineEntry {
  source: string;
  text: string;
  url: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentiment_score: number; // -1.0 to 1.0
  published_at?: string;   // ISO8601 — optional, present when available
}

export interface FindingsBoardEntry {
  ticker: string;
  timestamp: string;                    // ISO8601, when Scout wrote this entry
  headlines: HeadlineEntry[];
  narrative_summary: string;            // 1–2 sentence plain-language summary
  mention_velocity: 'spiking' | 'steady' | 'declining';
  narrative_entropy?: 'low' | 'medium' | 'high'; // added by detect_narrative_shift
}

// ─── Persistence helpers ───────────────────────────────────────────────────────
// Uses a local JSON file as the shared state store (the "blackboard").
// In production this would be a DB; for hackathon demo, the file is fine.

const DATA_DIR = path.join(process.cwd(), 'src', 'data', 'runtime');
const BOARD_FILE = path.join(DATA_DIR, 'findings-board.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readBoard(): Record<string, FindingsBoardEntry[]> {
  ensureDataDir();
  if (!fs.existsSync(BOARD_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(BOARD_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function writeBoard(board: Record<string, FindingsBoardEntry[]>) {
  ensureDataDir();
  fs.writeFileSync(BOARD_FILE, JSON.stringify(board, null, 2), 'utf-8');
}

// ─── Exported helpers (used by scout.tools.ts to write) ───────────────────────
export function writeFinding(entry: FindingsBoardEntry): void {
  const board = readBoard();
  if (!board[entry.ticker]) board[entry.ticker] = [];
  // Keep the latest 10 entries per ticker to avoid unbounded growth
  board[entry.ticker].unshift(entry);
  board[entry.ticker] = board[entry.ticker].slice(0, 10);
  writeBoard(board);
}

export function readLatestFinding(ticker: string): FindingsBoardEntry | null {
  const board = readBoard();
  const entries = board[ticker] || [];
  return entries[0] ?? null;
}

export function readAllFindings(ticker?: string): FindingsBoardEntry[] {
  const board = readBoard();
  if (ticker) return board[ticker] || [];
  return Object.values(board).flat();
}

// ─── MCP Resource definitions ─────────────────────────────────────────────────
export class FindingsBoardResources {
  /**
   * findings_board://latest/{ticker}
   * Returns the most recent Scout finding for a single ticker.
   * Primary read point for the Analyst agent.
   */
  @Resource({
    uri: 'findings_board://latest/{ticker}',
    name: 'Findings Board — Latest Entry',
    description:
      'Returns the most recent Scout finding for a given ticker. ' +
      'This is the primary read point for the Analyst agent. ' +
      'Shape: FindingsBoardEntry (ticker, timestamp, headlines[], narrative_summary, mention_velocity, narrative_entropy).',
    mimeType: 'application/json',
    examples: {
      response: {
        contents: [{
          uri: 'findings_board://latest/TSLA',
          mimeType: 'application/json',
          text: JSON.stringify({
            ticker: 'TSLA',
            timestamp: '2025-07-24T14:00:00Z',
            headlines: [
              {
                source: 'Reuters',
                text: 'Tesla Cybertruck deliveries hit 50,000 units',
                url: 'https://reuters.com/tesla',
                sentiment: 'positive',
                sentiment_score: 0.71
              }
            ],
            narrative_summary: 'Tesla delivery milestone coverage is broadly positive with institutional focus.',
            mention_velocity: 'spiking',
            narrative_entropy: 'low'
          }, null, 2)
        }]
      }
    }
  })
  async getLatestFinding(uri: string, ctx: ExecutionContext) {
    // Extract ticker from URI pattern findings_board://latest/TICKER
    const ticker = uri.replace('findings_board://latest/', '').toUpperCase();
    ctx.logger.info('findings_board: read latest', { ticker, uri });

    const entry = readLatestFinding(ticker);
    if (!entry) {
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ error: `No findings yet for ticker ${ticker}. Run scan_trending_topics first.` }, null, 2)
        }]
      };
    }

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(entry, null, 2)
      }]
    };
  }

  /**
   * findings_board://history/{ticker}
   * Returns the last 10 Scout findings for a ticker.
   * Used by Skeptic's recycled-content check and the widget's timeline view.
   */
  @Resource({
    uri: 'findings_board://history/{ticker}',
    name: 'Findings Board — History',
    description:
      'Returns the last 10 Scout findings for a given ticker (newest first). ' +
      'Used by the Skeptic agent for recycled-content detection and by the widget for timeline display.',
    mimeType: 'application/json',
    examples: {
      response: {
        contents: [{
          uri: 'findings_board://history/AAPL',
          mimeType: 'application/json',
          text: '{ "ticker": "AAPL", "entries": [ ...last 10 FindingsBoardEntry... ] }'
        }]
      }
    }
  })
  async getFindingsHistory(uri: string, ctx: ExecutionContext) {
    const ticker = uri.replace('findings_board://history/', '').toUpperCase();
    ctx.logger.info('findings_board: read history', { ticker, uri });

    const entries = readAllFindings(ticker);

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({ ticker, entries }, null, 2)
      }]
    };
  }

  /**
   * findings_board://all
   * Returns a snapshot of the entire board across all tickers.
   * Used by the widget to render the full live dashboard.
   */
  @Resource({
    uri: 'findings_board://all',
    name: 'Findings Board — All Tickers',
    description:
      'Returns all Scout findings across all tracked tickers. ' +
      'Used by the Next.js widget to populate the full live dashboard.',
    mimeType: 'application/json',
    examples: {
      response: {
        contents: [{
          uri: 'findings_board://all',
          mimeType: 'application/json',
          text: '{ "entries": [ ...all FindingsBoardEntry items... ] }'
        }]
      }
    }
  })
  async getAllFindings(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('findings_board: read all', { uri });
    const entries = readAllFindings();

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({ entries, last_updated: new Date().toISOString() }, null, 2)
      }]
    };
  }
}
