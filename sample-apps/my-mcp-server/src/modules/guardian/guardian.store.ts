/**
 * Data access for the BitWiserAI.
 *
 * All datasets are fabricated mock data shipped as JSON under `src/data/`. They are read from
 * disk once and cached in memory. The decision log is the only mutable dataset: it lives in
 * memory for the session and is best-effort appended to `logs/decision-log.jsonl`.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/**
 * The JSON datasets are not TypeScript modules, so they are not emitted into `dist/` by the
 * compiler. Resolve against every plausible location so the same code works when run from
 * source (dev) and from the build output (prod), regardless of the working directory.
 */
function resolveDataFile(fileName: string): string {
  const candidates = [
    path.join(process.cwd(), 'src', 'data', fileName),
    path.join(process.cwd(), 'dist', 'data', fileName),
    path.join(process.cwd(), 'data', fileName),
    path.join(HERE, '..', '..', 'data', fileName),
    path.join(HERE, '..', '..', '..', 'src', 'data', fileName)
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error(
    `Guardian dataset "${fileName}" not found. Looked in:\n  ${candidates.join('\n  ')}`
  );
}

function loadJson<T>(fileName: string): T {
  return JSON.parse(fs.readFileSync(resolveDataFile(fileName), 'utf-8')) as T;
}

function memo<T>(load: () => T): () => T {
  let cached: T | undefined;
  return () => (cached ??= load());
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Holding {
  symbol: string;
  name: string;
  sector: string;
  quantity: number;
  avg_price: number;
  purchase_date: string;
  thesis: string;
  /** Present only on F&O-style instruments (options/futures); absent on plain equity. */
  instrument_type?: 'option' | 'future';
  option_type?: 'CE' | 'PE';
  underlying?: string;
  strike_price?: number;
  lot_size?: number;
  expiry_date?: string;
}

export interface Portfolio {
  user_id: string;
  currency: string;
  as_of: string;
  profile: {
    display_name: string;
    experience: string;
    started_investing: string;
    stated_horizon_years: number;
    stated_goal: string;
    monthly_contribution: number;
  };
  cash: number;
  holdings: Holding[];
}

export interface Quote {
  price: number;
  day_change_pct: number;
  week_change_pct: number;
  year_change_pct: number;
}

export interface MarketEvent {
  id: string;
  date: string;
  type: string;
  scope: string;
  headline: string;
  summary: string;
  affects_sectors: string[];
  affects_symbols: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  flags?: string[];
}

export interface MarketData {
  as_of: string;
  quotes: Record<string, Quote>;
  indices: Record<string, { day_change_pct: number; week_change_pct: number }>;
  sector_moves: Record<string, number>;
  events: MarketEvent[];
}

export interface BiasSignal {
  id: string;
  weight: number;
  description: string;
  phrases: string[];
}

export interface BiasPattern {
  id: 'panic_sell' | 'fomo_buy' | 'herd_follow';
  label: string;
  description: string;
  historical_key: string;
  reflection_focus: string;
  gate: BiasSignal;
  signals: BiasSignal[];
}

export interface BiasDictionary {
  version: string;
  thresholds: { intervene: number; watch: number };
  patterns: BiasPattern[];
  deliberation_markers: { penalty: number; description: string; phrases: string[] };
  informational_markers: { description: string; phrases: string[] };
  banned_advice_phrases: { description: string; phrases: string[] };
}

export interface HistoricalCase {
  id: string;
  case: string;
  event_types: string[];
  note?: string;
  [key: string]: unknown;
}

export interface HistoricalPatternGroup {
  label: string;
  aggregate: Record<string, unknown> & { plain_language: string; sample_size: number };
  cases: HistoricalCase[];
}

export type HistoricalPatterns = Record<string, HistoricalPatternGroup> & {
  _disclaimer: string;
};

export interface TradeHistoryEntry {
  decision_id: string;
  logged_at: string;
  user_intent: string;
  detected_pattern: string | null;
  confidence: number | null;
  user_decision: string;
  symbols?: string[];
  event_type?: string | null;
  outcome_note?: string;
  outcome?: 'worse_than_waiting' | 'better_than_waiting' | 'better_than_acting' | 'neutral' | 'not_applicable';
}

export interface TradeHistory {
  user_id: string;
  entries: TradeHistoryEntry[];
}

export interface WaitOutcome {
  wait: string;
  sample_size: number;
  share_better_after_waiting: number;
  share_worse_after_waiting: number;
  median_move_pct: number;
  worst_case_move_pct: number;
}

export interface WaitWindow {
  event_type: string;
  label: string;
  outcomes: WaitOutcome[];
  plain_language: string;
  direction_note?: string;
}

export interface WaitOutcomes {
  _disclaimer: string;
  _compliance_note: string;
  windows: WaitWindow[];
}

export interface SymbolSentiment {
  retail_net_flow: 'net_selling' | 'net_buying' | 'balanced';
  share_selling_24h: number;
  share_buying_24h: number;
  mention_volume_24h: number;
  mention_change_pct: number;
  crowd_mood: string;
  crowd_note: string;
}

export interface HerdSentiment {
  _compliance_note: string;
  as_of: string;
  market_wide: {
    fear_greed_index: number;
    label: string;
    scale_note: string;
    retail_net_flow: string;
    share_of_accounts_trading_today: number;
    vs_typical_day: string;
  };
  symbols: Record<string, SymbolSentiment>;
  crowding_thresholds: { crowded: number; elevated: number; note: string };
}

// ---------------------------------------------------------------------------
// Cached dataset accessors
// ---------------------------------------------------------------------------

export const getPortfolio = memo(() => loadJson<Portfolio>('portfolio.json'));
export const getMarketData = memo(() => loadJson<MarketData>('market-events.json'));
export const getBiasDictionary = memo(() => loadJson<BiasDictionary>('bias-signal-patterns.json'));
export const getHistoricalPatterns = memo(() => loadJson<HistoricalPatterns>('historical-patterns.json'));
export const getTradeHistory = memo(() => loadJson<TradeHistory>('trade-history.json'));
export const getWaitOutcomes = memo(() => loadJson<WaitOutcomes>('wait-outcomes.json'));
export const getHerdSentiment = memo(() => loadJson<HerdSentiment>('herd-sentiment.json'));

export const DATA_DISCLAIMER =
  'All portfolio, price and historical figures in this server are fabricated mock data for demonstration. Nothing here is investment advice.';

// ---------------------------------------------------------------------------
// Live data overlay (shared with the Express backend via logs/*.json)
// ---------------------------------------------------------------------------

const LIVE_QUOTES_PATH = path.join(process.cwd(), 'logs', 'live-quotes.json');
const PORTFOLIO_STATE_PATH = path.join(process.cwd(), 'logs', 'portfolio-state.json');

export interface LiveQuoteOverride {
  symbol: string;
  price: number;
  day_change_pct: number;
  mode: 'live' | 'simulated' | 'mock' | 'error';
  updated_at: string;
}

/**
 * Reads the live-quotes snapshot that the Express backend (src/backend/live-quotes.ts)
 * continuously writes to disk. The MCP server has no long-lived process of its own to hold a
 * Finnhub WebSocket connection open between tool calls, so it reads the latest known tick from
 * the shared file instead of running a second, duplicate connection. Not memoized — this must
 * re-read on every call since the file changes every couple of seconds.
 */
export function getLiveQuoteOverride(symbol: string): LiveQuoteOverride | null {
  try {
    if (!fs.existsSync(LIVE_QUOTES_PATH)) return null;
    const all: LiveQuoteOverride[] = JSON.parse(fs.readFileSync(LIVE_QUOTES_PATH, 'utf-8'));
    return all.find((q) => q.symbol === symbol.toUpperCase()) ?? null;
  } catch {
    return null;
  }
}

/**
 * Reads the mutable portfolio overlay the Express backend's trade execution endpoint maintains
 * (src/backend/portfolio-state.ts), so a trade made through the web app shows up here too. Returns
 * null if no trade has ever been executed — callers fall back to the static portfolio.json holdings
 * and cash in that case, which is the original, pre-trading behaviour.
 */
export function getPortfolioStateOverride(): { cash: number; holdings: Holding[] } | null {
  try {
    if (!fs.existsSync(PORTFOLIO_STATE_PATH)) return null;
    const state = JSON.parse(fs.readFileSync(PORTFOLIO_STATE_PATH, 'utf-8'));
    return { cash: state.cash, holdings: state.holdings };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Decision log (mutable)
// ---------------------------------------------------------------------------

export interface DecisionLogEntry {
  decision_id: string;
  logged_at: string;
  user_id: string;
  user_intent: string;
  detected_pattern: string | null;
  confidence: number | null;
  context_shown: Record<string, unknown>;
  user_decision: string;
  user_note?: string;
}

const LOG_PATH = path.join(process.cwd(), 'logs', 'decision-log.jsonl');

/**
 * Rehydrate from the durable JSONL copy on boot.
 *
 * Without this, every restart silently wiped the visible decision log back to empty even though
 * the file on disk still had every prior entry — "it was there a minute ago" for no reason other
 * than the process having been bounced. Loading it back in also lets nextDecisionId() continue
 * past whatever is already on disk instead of restarting at DEC-0001 and colliding with entries
 * that already used that id.
 */
function loadPersistedDecisions(): DecisionLogEntry[] {
  if (!fs.existsSync(LOG_PATH)) return [];
  const lines = fs.readFileSync(LOG_PATH, 'utf-8').split('\n').filter((l) => l.trim());
  const entries: DecisionLogEntry[] = [];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line));
    } catch {
      /* skip a corrupt line rather than fail the whole load */
    }
  }
  return entries;
}

const decisionLog: DecisionLogEntry[] = loadPersistedDecisions();

let decisionCounter = decisionLog.reduce((max, e) => {
  const n = Number(e.decision_id?.replace(/^DEC-/, ''));
  return Number.isFinite(n) ? Math.max(max, n) : max;
}, 0);

export function nextDecisionId(): string {
  decisionCounter += 1;
  return `DEC-${String(decisionCounter).padStart(4, '0')}`;
}

export function appendDecision(entry: DecisionLogEntry): DecisionLogEntry {
  decisionLog.push(entry);

  // Best-effort durable copy. A failure here must never break the tool call — the in-memory
  // log, now seeded from this same file at boot, is the source of truth for the running process.
  try {
    const logDir = path.dirname(LOG_PATH);
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(LOG_PATH, `${JSON.stringify(entry)}\n`, 'utf-8');
  } catch {
    /* non-fatal */
  }

  return entry;
}

export function readDecisionLog(): DecisionLogEntry[] {
  return [...decisionLog];
}
