/**
 * Mutable portfolio state — paper trading only.
 *
 * portfolio.json is the fixed starting position. This module is the current, mutable one: it
 * loads a durable overlay from logs/portfolio-state.json (creating it from the static portfolio on
 * first run), and every executed trade mutates and re-persists it, so trades survive a restart —
 * same rehydrate-on-boot pattern already used for the decision log, for the same reason.
 *
 * This never touches a real brokerage. There is no order routing, no account link, no real money —
 * "executing a trade" means adjusting this JSON file using the current (live or mock) quote.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface StateHolding {
  symbol: string;
  name: string;
  sector: string;
  quantity: number;
  avg_price: number;
  purchase_date: string;
  thesis: string;
  instrument_type?: string;
  option_type?: string;
  underlying?: string;
  strike_price?: number;
  lot_size?: number;
  expiry_date?: string;
}

export interface TradeRecord {
  trade_id: string;
  executed_at: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  price_mode: string;
  cash_after: number;
}

interface PortfolioState {
  cash: number;
  holdings: StateHolding[];
  trades: TradeRecord[];
}

const STATE_PATH = path.join(process.cwd(), 'logs', 'portfolio-state.json');

let state: PortfolioState | null = null;
let tradeCounter = 0;

function persist() {
  try {
    fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch {
    /* non-fatal — state stays correct in memory for this process even if the write fails */
  }
}

/** Must be called once at boot with the static portfolio's starting cash/holdings as the fallback. */
export function initPortfolioState(baseline: { cash: number; holdings: StateHolding[] }) {
  if (fs.existsSync(STATE_PATH)) {
    try {
      state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
      tradeCounter = state!.trades.reduce((max, t) => {
        const n = Number(t.trade_id.replace(/^TRD-/, ''));
        return Number.isFinite(n) ? Math.max(max, n) : max;
      }, 0);
      console.log(`💼 [PortfolioState] Restored from disk — ${state!.holdings.length} holdings, ${state!.trades.length} prior trade(s)`);
      return;
    } catch {
      console.error('💼 [PortfolioState] Existing state file is corrupt — reinitialising from the static portfolio');
    }
  }

  state = { cash: baseline.cash, holdings: structuredClone(baseline.holdings), trades: [] };
  persist();
  console.log('💼 [PortfolioState] Initialised fresh from src/data/portfolio.json');
}

function requireState(): PortfolioState {
  if (!state) throw new Error('Portfolio state not initialised — initPortfolioState() must run at server startup');
  return state;
}

export function getPortfolioState(): { cash: number; holdings: StateHolding[]; trades: TradeRecord[] } {
  const s = requireState();
  return { cash: s.cash, holdings: s.holdings, trades: s.trades };
}

export interface ExecuteTradeInput {
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  price_mode: string;
}

export interface ExecuteTradeResult {
  ok: boolean;
  error?: string;
  trade?: TradeRecord;
  cash: number;
  holding?: StateHolding;
}

/**
 * Restricted to symbols already in the portfolio — there is no live/simulated price source for an
 * arbitrary new ticker, and the whole point of this feature is real-time data for the positions
 * that are actually held, not a general trading platform.
 */
export function executeTrade(input: ExecuteTradeInput): ExecuteTradeResult {
  const s = requireState();
  const symbol = input.symbol.toUpperCase();

  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    return { ok: false, error: 'Quantity must be a positive number.', cash: s.cash };
  }
  if (!Number.isFinite(input.price) || input.price <= 0) {
    return { ok: false, error: 'No valid current price available for this symbol.', cash: s.cash };
  }

  const idx = s.holdings.findIndex((h) => h.symbol === symbol);

  if (input.side === 'sell') {
    if (idx === -1) {
      return { ok: false, error: `You do not hold ${symbol} — nothing to sell.`, cash: s.cash };
    }
    const holding = s.holdings[idx];
    if (input.quantity > holding.quantity) {
      return {
        ok: false,
        error: `Cannot sell ${input.quantity} of ${symbol} — only ${holding.quantity} held.`,
        cash: s.cash
      };
    }

    const proceeds = input.quantity * input.price;
    holding.quantity -= input.quantity;
    s.cash += proceeds;

    const fullyClosed = holding.quantity === 0;
    if (fullyClosed) s.holdings.splice(idx, 1);

    const trade = recordTrade(input, s.cash);
    persist();
    return { ok: true, trade, cash: s.cash, holding: fullyClosed ? undefined : holding };
  }

  // buy
  if (idx === -1) {
    return {
      ok: false,
      error: `${symbol} is not one of the tracked positions in this portfolio, so there is no live price to buy it at.`,
      cash: s.cash
    };
  }
  const holding = s.holdings[idx];
  const cost = input.quantity * input.price;
  if (cost > s.cash) {
    return {
      ok: false,
      error: `Insufficient cash — this would cost ${cost.toFixed(2)} but only ${s.cash.toFixed(2)} is available.`,
      cash: s.cash
    };
  }

  const newQuantity = holding.quantity + input.quantity;
  holding.avg_price = (holding.quantity * holding.avg_price + input.quantity * input.price) / newQuantity;
  holding.quantity = newQuantity;
  s.cash -= cost;

  const trade = recordTrade(input, s.cash);
  persist();
  return { ok: true, trade, cash: s.cash, holding };
}

function recordTrade(input: ExecuteTradeInput, cashAfter: number): TradeRecord {
  tradeCounter += 1;
  const trade: TradeRecord = {
    trade_id: `TRD-${String(tradeCounter).padStart(4, '0')}`,
    executed_at: new Date().toISOString(),
    symbol: input.symbol.toUpperCase(),
    side: input.side,
    quantity: input.quantity,
    price: input.price,
    price_mode: input.price_mode,
    cash_after: cashAfter
  };
  requireState().trades.push(trade);
  return trade;
}
