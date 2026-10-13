/**
 * BidWiserAI — Backend API
 * Express REST server on port 3000.
 * Reuses the guardian logic already in the NitroStack modules.
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { initLiveQuotes, resolveQuote, getLiveStatus, getAllLiveQuotes, liveEvents } from './live-quotes.js';
import { initPortfolioState, getPortfolioState, executeTrade } from './portfolio-state.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Resolve the mock-data directory.
 *
 * Checked against several candidates rather than hardcoding one relative hop, because the
 * correct number of `..` depends on where this file is executed from (dist-backend/api.js,
 * src/backend/api.ts under a TS runner, or a different working directory). A single hardcoded
 * path is what produced the earlier ENOENT against 'Desktop/src/data'.
 */
const DATA_DIR = (() => {
  const candidates = [
    path.join(__dirname, '..', 'src', 'data'),        // dist-backend/api.js
    path.join(__dirname, '..', '..', 'src', 'data'),  // src/backend/api.ts
    path.join(process.cwd(), 'src', 'data'),          // launched from the project root
    path.join(process.cwd(), 'data')
  ];

  const found = candidates.find((dir) => fs.existsSync(path.join(dir, 'portfolio.json')));
  if (!found) {
    throw new Error(
      `Mock data directory not found. Looked in:\n  ${candidates.join('\n  ')}\n` +
        `Run the server from the project root, and make sure src/data/*.json exists.`
    );
  }
  return found;
})();

// ─── helpers ─────────────────────────────────────────────────────────────────

function loadJson<T>(file: string): T {
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) {
    throw new Error(`Dataset "${file}" is missing from ${DATA_DIR}`);
  }
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as T;
}

function memo<T>(fn: () => T): () => T {
  let cache: T | undefined;
  return () => (cache ??= fn());
}

const getPortfolio    = memo(() => loadJson<any>('portfolio.json'));
const getMarketData   = memo(() => loadJson<any>('market-events.json'));
const getBiasDict     = memo(() => loadJson<any>('bias-signal-patterns.json'));
const getHistorical   = memo(() => loadJson<any>('historical-patterns.json'));
const getTradeHistory = memo(() => loadJson<any>('trade-history.json'));
const getWaitOutcomes = memo(() => loadJson<any>('wait-outcomes.json'));
const getHerdData     = memo(() => loadJson<any>('herd-sentiment.json'));

// ─── decision log ─────────────────────────────────────────────────────────────

const LOG_PATH = path.join(process.cwd(), 'logs', 'decision-log.jsonl');

/**
 * Rehydrate from the durable JSONL copy on boot.
 *
 * Without this, restarting the server (which happens a lot during development — rebuilds,
 * crashes, port conflicts) silently reset the visible decision log to empty even though the file
 * on disk still had every prior entry. Also seeds decCounter past whatever id is already on disk
 * so a fresh boot cannot hand out a decision_id that collides with one already logged.
 */
function loadPersistedDecisions(): any[] {
  if (!fs.existsSync(LOG_PATH)) return [];
  const lines = fs.readFileSync(LOG_PATH, 'utf-8').split('\n').filter(l => l.trim());
  const entries: any[] = [];
  for (const line of lines) {
    try { entries.push(JSON.parse(line)); } catch { /* skip a corrupt line */ }
  }
  return entries;
}

const decisionLog: any[] = loadPersistedDecisions();

let decCounter = decisionLog.reduce((max, e) => {
  const n = Number(e.decision_id?.replace(/^DEC-/, ''));
  return Number.isFinite(n) ? Math.max(max, n) : max;
}, 0);

function nextId() {
  decCounter += 1;
  return `DEC-${String(decCounter).padStart(4, '0')}`;
}

function appendDecision(entry: any) {
  decisionLog.push(entry);
  try {
    fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
    fs.appendFileSync(LOG_PATH, JSON.stringify(entry) + '\n');
  } catch { /* non-fatal */ }
  return entry;
}

// ─── portfolio valuation ──────────────────────────────────────────────────────

function valuePortfolio() {
  const portfolio = getPortfolio(); // static: profile, currency, as_of, user_id — never mutated by trades
  const { holdings: currentHoldings, cash: currentCash } = getPortfolioState(); // mutable: moves with trades
  const { quotes } = getMarketData();

  const priced = currentHoldings.map((h: any) => {
    const mock = quotes[h.symbol] ?? {};
    const resolved = resolveQuote(h.symbol, mock.price ?? h.avg_price, mock.day_change_pct ?? 0);
    const mv = resolved.price * h.quantity;
    const cb = h.avg_price * h.quantity;
    return { h, price: resolved.price, day: resolved.day_change_pct, quote_mode: resolved.mode, mv, cb };
  });

  const invested = priced.reduce((s: number, p: any) => s + p.mv, 0);
  const total    = invested + currentCash;
  const totalCb  = priced.reduce((s: number, p: any) => s + p.cb, 0);

  const holdings = priced.map(({ h, price, day, quote_mode, mv, cb }: any) => ({
    ...h,
    current_price:       +price.toFixed(2),
    day_change_pct:      day,
    quote_mode,
    market_value:        +mv.toFixed(2),
    cost_basis:          +cb.toFixed(2),
    unrealized_gain:     +(mv - cb).toFixed(2),
    unrealized_gain_pct: +(((mv - cb) / cb) * 100).toFixed(2),
    weight_of_total:     +(mv / total).toFixed(4),
    weight_of_invested:  +(mv / invested).toFixed(4)
  }));

  const bySector = new Map<string, any[]>();
  for (const h of holdings) bySector.set(h.sector, [...(bySector.get(h.sector) ?? []), h]);

  const sector_breakdown = [...bySector.entries()]
    .map(([sector, hs]) => ({
      sector,
      market_value:    +hs.reduce((s: number, h: any) => s + h.market_value, 0).toFixed(2),
      weight_of_total: +hs.reduce((s: number, h: any) => s + h.market_value, 0) / total,
      symbols:         hs.map((h: any) => h.symbol)
    }))
    .sort((a: any, b: any) => b.market_value - a.market_value);

  const prevInvested = priced.reduce((s: number, p: any) => s + p.mv / (1 + p.day / 100), 0);
  const dayChangeValue = invested - prevInvested;
  // Trading can now genuinely empty the portfolio out (sell every position), so this can't assume
  // at least one holding exists the way it safely could when holdings were a static fixture.
  const largest = holdings.length
    ? holdings.reduce((a: any, b: any) => (b.weight_of_total > a.weight_of_total ? b : a))
    : null;

  return {
    user_id:   portfolio.user_id,
    currency:  portfolio.currency,
    as_of:     portfolio.as_of,
    profile:   portfolio.profile,
    holdings,
    sector_breakdown,
    totals: {
      invested_value:       +invested.toFixed(2),
      cash:                 currentCash,
      total_value:          +total.toFixed(2),
      total_cost_basis:     +totalCb.toFixed(2),
      unrealized_gain:      +(invested - totalCb).toFixed(2),
      unrealized_gain_pct:  totalCb ? +(((invested - totalCb) / totalCb) * 100).toFixed(2) : 0,
      day_change_value:     +dayChangeValue.toFixed(2),
      day_change_pct:       prevInvested ? +((dayChangeValue / prevInvested) * 100).toFixed(2) : 0
    },
    largest_position: largest ? { symbol: largest.symbol, weight_of_total: largest.weight_of_total } : null
  };
}

// ─── relevance scoring ────────────────────────────────────────────────────────

function scoreRelevance(event: any, snapshot: any) {
  const marketWide     = event.affects_sectors.includes('all');
  const namesItsSubject = event.scope === 'company' && event.affects_symbols.length > 0;

  const affected = snapshot.holdings
    .map((h: any) => {
      if (event.affects_symbols.includes(h.symbol)) return { holding: h, reason: 'named_directly' };
      if (namesItsSubject)                           return null;
      if (event.affects_sectors.includes(h.sector)) return { holding: h, reason: 'sector_match' };
      if (marketWide)                                return { holding: h, reason: 'market_wide' };
      return null;
    })
    .filter(Boolean);

  const exposureValue    = affected.reduce((s: number, a: any) => s + a.holding.market_value, 0);
  const exposureFraction = exposureValue / snapshot.totals.total_value;
  const hasDirect        = affected.some((a: any) => a.reason === 'named_directly');

  const score = exposureFraction === 0 ? 0 : Math.min(1, +(exposureFraction * 1.6 + (hasDirect ? 0.15 : 0)).toFixed(3));
  const band  = score >= 0.6 ? 'high' : score >= 0.25 ? 'medium' : score > 0 ? 'low' : 'noise';
  const driver =
    exposureFraction === 0          ? 'unrelated'
    : marketWide || ['market_wide','macro'].includes(event.scope) ? 'broad_market'
    : event.scope === 'company'     ? 'company_specific'
    :                                  'sector';

  const symbols = affected.map((a: any) => a.holding.symbol);

  const explanation =
    band === 'noise'
      ? `Nothing in your portfolio is exposed to this.`
      : `This touches ${symbols.length} of your ${snapshot.holdings.length} holdings (${symbols.join(', ')}) — ${(exposureFraction * 100).toFixed(1)}% of your total value.`;

  return {
    event_id:                event.id ?? 'AD-HOC',
    headline:                event.headline,
    date:                    event.date,
    relevance_band:          band,
    relevance_score:         score,
    driver,
    is_company_specific:     driver === 'company_specific',
    exposure_pct_of_portfolio: +exposureFraction.toFixed(4),
    exposure_value:          +exposureValue.toFixed(2),
    affected_holdings:       affected.map((a: any) => ({
      symbol:         a.holding.symbol,
      sector:         a.holding.sector,
      weight_of_total:a.holding.weight_of_total,
      match_reason:   a.reason,
      day_change_pct: a.holding.day_change_pct
    })),
    explanation,
    why_it_matters_or_not:
      band === 'noise'     ? 'No action on your side is implied — this is not about your money.'
      : driver === 'broad_market'   ? 'The move is market-wide. Everything is falling together — this says more about the macro backdrop than the businesses you own.'
      : driver === 'sector'         ? 'The move is sector-level. No company-specific news is attached to your holdings in this event.'
      :                               'This is company-specific news. Unlike a broad dip, this can genuinely change the reason for owning a position.'
  };
}

// ─── bias detection ───────────────────────────────────────────────────────────

function normalize(text: string) {
  return text.toLowerCase().replace(/[''ʼ]/g, "'").replace(/\s+/g, ' ').trim();
}

function matchPhrases(text: string, phrases: string[]): string[] {
  const hits: string[] = [];
  for (const phrase of phrases) {
    const p      = normalize(phrase);
    const prefix = /^[a-z0-9]/.test(p) ? '(?<![a-z0-9])' : '';
    const suffix = /[a-z0-9]$/.test(p) ? '(?![a-z0-9])' : '';
    const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`${prefix}${escaped}${suffix}`).test(text)) hits.push(phrase);
  }
  return hits;
}

function detectSignal(rawText: string) {
  const dict    = getBiasDict();
  const text    = normalize(rawText);
  const deliberation = matchPhrases(text, dict.deliberation_markers.phrases);
  const penalty      = deliberation.length > 0 ? dict.deliberation_markers.penalty : 0;

  const scores = dict.patterns.map((pattern: any) => {
    const gateHits  = matchPhrases(text, pattern.gate.phrases);
    const gatePassed = gateHits.length > 0;

    const matchedSignals = pattern.signals
      .map((s: any) => ({
        signal:          s.id,
        weight:          s.weight,
        description:     s.description,
        matched_phrases: matchPhrases(text, s.phrases)
      }))
      .filter((s: any) => s.matched_phrases.length > 0);

    if (!gatePassed) {
      return { pattern: pattern.id, label: pattern.label, confidence: 0, gate_passed: false, matched_signals: matchedSignals };
    }

    const raw        = pattern.gate.weight + matchedSignals.reduce((s: number, m: any) => s + m.weight, 0);
    const confidence = +Math.max(0, Math.min(0.98, raw - penalty)).toFixed(2);
    return {
      pattern:         pattern.id,
      label:           pattern.label,
      confidence,
      gate_passed:     true,
      matched_signals: [
        { signal: pattern.gate.id, weight: pattern.gate.weight, matched_phrases: gateHits },
        ...matchedSignals
      ]
    };
  });

  const ranked      = [...scores].sort((a: any, b: any) => b.confidence - a.confidence);
  const top         = ranked[0];
  const tradeIntent = scores.some((s: any) => s.gate_passed);
  const action      =
    top.confidence >= dict.thresholds.intervene ? 'intervene'
    : top.confidence >= dict.thresholds.watch   ? 'watch'
    :                                              'none';

  return {
    input:                   rawText,
    detected_pattern:        action === 'none' ? 'none' : top.pattern,
    confidence:              top.confidence,
    action,
    trade_intent_detected:   tradeIntent,
    deliberation_markers_found: deliberation,
    primary:                 action === 'none' ? null : top,
    all_scores:              scores
  };
}

// ─── reflection builder ───────────────────────────────────────────────────────

function buildReflection(pattern: string, snapshot: any, relevance: any, historical: any) {
  // Long-horizon and active-trader personas need different cooling-off language — "this money
  // isn't needed for years" is false for someone who has said they are not a buy-and-hold investor.
  const horizon = snapshot.profile.stated_horizon_years;
  const panicCoolingOff = horizon >= 1
    ? `You have said your horizon is around ${horizon} years and this money is not needed for a while. Sitting with this for one trading session costs nothing if the reasoning still holds tomorrow.`
    : `Your own stated plan for this account is: "${String(snapshot.profile.stated_goal).replace(/\.$/, '')}". If today's move does not change that plan, waiting one session before acting costs nothing.`;
  const fomoCoolingOff = snapshot.profile.monthly_contribution > 0
    ? `You have said you deploy about ${snapshot.currency} ${snapshot.profile.monthly_contribution} a month into new positions on purpose, with a plan — not on impulse. If this still appeals in a week, you can size into it deliberately then, rather than in a hurry now.`
    : `If this position still appeals in a week, it will still be there to open — with a size you chose deliberately rather than in a hurry.`;

  const templates: Record<string, any> = {
    panic_sell: {
      headline:    'Before this one goes through — a moment of context',
      pattern_note:'The language here matches a pattern people fall into during declines: urgency, "all", and fear framing aimed at a price move rather than a change in the underlying reason for owning the position.',
      question:    'You wrote down a reason for each of these when you bought them. Has any of those reasons stopped being true today, or has only the price changed?',
      cooling_off: panicCoolingOff,
      options:     ['Review the original reason I wrote down for each of these','See what actually moved today versus what did not','Wait until tomorrow and revisit','Proceed anyway — I have considered this']
    },
    fomo_buy: {
      headline:    'Before you open this position — a moment of context',
      pattern_note:'The framing here is about the crowd and about speed — what other people are doing, and getting in before something happens. Notice what is missing: a reason this belongs in your portfolio that would still make sense if the price had not moved.',
      question:    'If this name had gone sideways for the last three months instead of running up, would you still want to own it? And if the answer is no, what exactly are you buying?',
      cooling_off: fomoCoolingOff,
      options:     ['Show me what this would do to my sector concentration','Show me how similar crowded entries have played out','Set a reminder to revisit in 7 days','Proceed anyway — I have considered this']
    },
    herd_follow: {
      headline:    'Before you follow this — a moment of context',
      pattern_note:"The reason given for this trade is someone else's action rather than your own read of the situation. Worth noticing on its own — not because they are wrong, but because you cannot see their time horizon, their tax position, their cash needs, or how big this position is relative to the rest of what they own.",
      question:    'What do you know about their situation that makes their decision fit yours — their horizon, their other holdings, whether they need this money soon? And what was your own reason before you heard theirs?',
      cooling_off: 'The information you are acting on has usually already moved the price by the time it reaches a group chat or a feed. A day makes very little difference to that, and quite a lot of difference to how considered the decision is.',
      options:     ['Compare this move against my own stated plan','Show me how copied trades have worked out historically','Wait a day and revisit','Proceed anyway — I have considered this']
    }
  };

  const t = templates[pattern] ?? templates['panic_sell'];
  const observation = relevance
    ? `${relevance.explanation} ${relevance.why_it_matters_or_not}`
    : 'Context from your portfolio is shown below.';

  const hist_context = historical?.aggregate?.plain_language ?? null;

  return {
    pattern,
    headline:          t.headline,
    observation,
    pattern_note:      t.pattern_note,
    historical_context: hist_context,
    reflection_question: t.question,
    cooling_off_suggestion: t.cooling_off,
    user_options:       t.options,
    disclaimer:         'Informational only. Not investment advice. All figures are mock data.'
  };
}

// ─── Tier 2: personal history, wait simulation, herd sentiment ────────────────

/**
 * Merges seeded prior-months history with decisions logged in this session.
 * The on-disk JSONL is deliberately not read — it accumulates across runs and would make the
 * counts non-deterministic mid-demo.
 */
function summarizeTradeHistory(pattern?: string) {
  const seeded  = getTradeHistory();
  const session = decisionLog.map((d: any) => ({ ...d, outcome: 'not_applicable' }));
  const all     = [...seeded.entries, ...session].sort((a: any, b: any) => a.logged_at.localeCompare(b.logged_at));

  // Anchored to the dataset's as_of, not the wall clock, so the demo reads the same every run.
  const asOf        = getPortfolio().as_of;
  const monthPrefix = asOf.slice(0, 7);

  const interventions = all.filter((e: any) => e.detected_pattern !== null);
  const thisMonth     = interventions.filter((e: any) => e.logged_at.slice(0, 7) === monthPrefix);

  const tally = (entries: any[]) => entries.reduce((acc: any, e: any) => {
    acc[e.detected_pattern] = (acc[e.detected_pattern] ?? 0) + 1;
    return acc;
  }, {});

  const byPatternAllTime  = tally(interventions);
  const byPatternThisMonth = tally(thisMonth);

  const outcomes = interventions.reduce((acc: any, e: any) => {
    if (!e.outcome || e.outcome === 'not_applicable') return acc;
    acc[e.outcome] = (acc[e.outcome] ?? 0) + 1;
    return acc;
  }, {});

  let repeat_insight: string | null = null;
  if (pattern) {
    const priorThisMonth = byPatternThisMonth[pattern] ?? 0;
    const priorAllTime   = byPatternAllTime[pattern] ?? 0;
    const label = pattern.replace(/_/g, '-');
    if (priorThisMonth >= 1) {
      const ordinal = ['1st','2nd','3rd','4th','5th','6th'][priorThisMonth] ?? `${priorThisMonth + 1}th`;
      repeat_insight = `This is the ${ordinal} ${label} signal on this account this month — ${priorThisMonth} before today. Worth noticing as a pattern in itself, separately from whether any one of them was the right call.`;
    } else if (priorAllTime >= 1) {
      repeat_insight = `${priorAllTime} previous ${label} signal${priorAllTime > 1 ? 's' : ''} on this account, though none earlier this month.`;
    } else {
      repeat_insight = `First ${label} signal recorded on this account.`;
    }
  }

  return {
    user_id:                seeded.user_id,
    as_of:                  asOf,
    total_records:          all.length,
    interventions_all_time: interventions.length,
    by_pattern_all_time:    byPatternAllTime,
    by_pattern_this_month:  byPatternThisMonth,
    this_month_label:       monthPrefix,
    proceeded:              interventions.filter((e: any) => e.user_decision === 'proceeded').length,
    paused_or_changed_mind: interventions.filter((e: any) => ['paused_to_reflect','changed_mind'].includes(e.user_decision)).length,
    outcomes,
    repeat_insight,
    recent:                 all.slice(-5).reverse(),
    sources: 'Seeded prior-months history plus decisions logged in this session.'
  };
}

function simulateWait(eventType?: string, wait?: string) {
  const data      = getWaitOutcomes();
  const requested = eventType ?? 'broad_dip';

  const window =
    data.windows.find((w: any) => w.event_type === requested) ??
    data.windows.find((w: any) => requested.includes(w.event_type) || w.event_type.includes(requested)) ??
    data.windows.find((w: any) => w.event_type === 'broad_dip');

  const headline    = wait ? window.outcomes.find((o: any) => o.wait === wait) ?? null : window.outcomes[0];
  const worstShares = window.outcomes.map((o: any) => Math.round(o.share_worse_after_waiting * 100));

  return {
    event_type: window.event_type,
    matched_on: window.event_type === requested
      ? `exact match on "${requested}"`
      : `no window for "${requested}" — using "${window.event_type}" as the closest comparable`,
    label:           window.label,
    direction:       window.event_type === 'hype_cycle' ? 'buying' : 'selling',
    outcomes:        window.outcomes,
    headline_window: headline,
    plain_language:  window.plain_language,
    both_sides: `Across the three windows, waiting left this mock cohort worse off ${worstShares.join('%, ')}% of the time. ${window.direction_note ?? 'Those cases are as real as the favourable ones.'}`,
    caveat: 'This is what happened to a mock cohort in past comparable episodes. It is not a prediction, and it does not indicate what any individual should do.'
  };
}

function readHerdSentiment(symbols?: string[]) {
  const data   = getHerdData();
  const held   = new Set(getPortfolio().holdings.map((h: any) => h.symbol));
  const wanted = symbols?.map(s => s.toUpperCase());
  const keys   = wanted ? wanted.filter(s => data.symbols[s]) : Object.keys(data.symbols);
  const { crowded, elevated } = data.crowding_thresholds;

  const rows = keys.map((symbol: string) => {
    const s = data.symbols[symbol];
    const dominantShare = Math.max(s.share_selling_24h, s.share_buying_24h);
    return {
      ...s,
      symbol,
      held:     held.has(symbol),
      crowding: dominantShare >= crowded ? 'crowded' : dominantShare >= elevated ? 'elevated' : 'normal',
      dominant_side: s.share_selling_24h > s.share_buying_24h ? 'selling'
                   : s.share_buying_24h  > s.share_selling_24h ? 'buying' : 'balanced'
    };
  });

  const crowdedRows = rows.filter((r: any) => r.crowding === 'crowded');

  return {
    as_of:       data.as_of,
    market_wide: data.market_wide,
    symbols:     rows,
    unknown_symbols: wanted?.filter(s => !data.symbols[s]) ?? [],
    crowd_summary: crowdedRows.length
      ? `${crowdedRows.map((r: any) => `${r.symbol} (${Math.round(Math.max(r.share_selling_24h, r.share_buying_24h) * 100)}% ${r.dominant_side})`).join(', ')} ${crowdedRows.length === 1 ? 'is' : 'are'} heavily one-directional right now. Sentiment overall reads ${data.market_wide.label} at ${data.market_wide.fear_greed_index}/100.`
      : `No name here is unusually one-directional. Sentiment overall reads ${data.market_wide.label} at ${data.market_wide.fear_greed_index}/100.`,
    interpretation_guide: 'This describes what other people are doing, nothing more. A crowded trade is not evidence that the crowd is wrong, and "everyone is selling" is not a reason to sell or to buy.'
  };
}

// ─── Express app ──────────────────────────────────────────────────────────────

const app  = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json());

// ── GET /api/portfolio ────────────────────────────────────────────────────────
app.get('/api/portfolio', (_req, res) => {
  try {
    const snapshot = valuePortfolio();
    console.log('📊 [API] GET /api/portfolio');
    res.json({ success: true, data: snapshot });
  } catch (err: any) {
    console.error('❌ Portfolio error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/market-context ───────────────────────────────────────────────────
app.get('/api/market-context', (_req, res) => {
  try {
    const market   = getMarketData();
    const snapshot = valuePortfolio();

    const events = market.events.map((e: any) => ({
      ...e,
      relevance: scoreRelevance(e, snapshot)
    })).sort((a: any, b: any) => b.relevance.relevance_score - a.relevance.relevance_score);

    const worstSector = Object.entries(market.sector_moves).sort((a: any, b: any) => a[1] - b[1])[0];
    const bestSector  = Object.entries(market.sector_moves).sort((a: any, b: any) => b[1] - a[1])[0];

    console.log('📊 [API] GET /api/market-context');
    res.json({
      success: true,
      data: {
        as_of:          market.as_of,
        indices:        market.indices,
        sector_moves:   market.sector_moves,
        market_summary: `S&P 500 ${market.indices.SP500.day_change_pct}%, NASDAQ ${market.indices.NASDAQ.day_change_pct}% on the day. Weakest sector: ${worstSector[0]} ${worstSector[1]}%. Strongest: ${bestSector[0]} ${(bestSector[1] as number) > 0 ? '+' : ''}${bestSector[1]}%.`,
        events
      }
    });
  } catch (err: any) {
    console.error('❌ Market context error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/analyze-intent ──────────────────────────────────────────────────
app.post('/api/analyze-intent', async (req, res) => {
  const { intent } = req.body as { intent?: string };
  if (!intent || !intent.trim()) {
    return res.status(400).json({ success: false, error: 'intent is required' });
  }

  console.log(`\n🔍 [API] Analyzing: "${intent.slice(0, 80)}..."`);
  try {
    const signal   = detectSignal(intent);
    const snapshot = valuePortfolio();
    const market   = getMarketData();

    console.log(`🧠 Pattern: ${signal.detected_pattern} (confidence: ${signal.confidence})`);

    let relevance     = null;
    let reflection    = null;
    let historical    = null;
    let trade_history: any = null;
    let wait_outcome:  any = null;
    let herd:          any = null;

    if (signal.action !== 'none') {
      // Pick the most relevant negative event for context
      const negEvents = market.events.filter((e: any) => e.sentiment === 'negative');
      const best = negEvents
        .map((e: any) => ({ e, r: scoreRelevance(e, snapshot) }))
        .sort((a: any, b: any) => b.r.relevance_score - a.r.relevance_score)[0];

      relevance = best ? best.r : null;

      // Historical patterns
      const hist = getHistorical();
      historical = hist[signal.detected_pattern as string] ?? null;

      reflection = buildReflection(signal.detected_pattern as string, snapshot, relevance, historical);

      // Tier 2 depth: personal record, the cost of waiting, and what the crowd is doing.
      trade_history = summarizeTradeHistory(signal.detected_pattern as string);

      // A FOMO buy is driven by a run-up, not by the negative event picked for relevance above,
      // so the wait window has to come from the hype cycle or the numbers describe the wrong thing.
      wait_outcome = simulateWait(
        signal.detected_pattern === 'fomo_buy' ? 'hype_cycle' : best?.e?.type
      );

      // Prefer symbols the user actually named — a FOMO target is usually not held yet.
      const named = Object.keys(getHerdData().symbols).filter(sym =>
        new RegExp(`(?<![a-z0-9])${sym.toLowerCase()}(?![a-z0-9])`).test(intent.toLowerCase())
      );
      const focus = named.length ? named : (relevance?.affected_holdings ?? []).map((h: any) => h.symbol);
      herd = focus.length ? readHerdSentiment(focus) : null;
    }

    console.log(`✅ Analysis complete — action: ${signal.action}`);
    res.json({
      success: true,
      data: {
        signal,
        relevance,
        reflection,
        historical: historical ? { plain_language: historical.aggregate?.plain_language, cases: (historical.cases ?? []).slice(0, 3) } : null,
        trade_history,
        wait_outcome,
        herd,
        portfolio_snapshot: {
          total_value:      snapshot.totals.total_value,
          day_change_pct:   snapshot.totals.day_change_pct,
          unrealized_gain:  snapshot.totals.unrealized_gain
        }
      }
    });
  } catch (err: any) {
    console.error('❌ Analyze error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/execute-trade ────────────────────────────────────────────────────
// Paper trading only — no brokerage, no order routing, no real money. Restricted to symbols
// already in the portfolio, since those are the only ones with a live or simulated price feed.
app.post('/api/execute-trade', (req, res) => {
  try {
    const { symbol, side, quantity } = req.body as { symbol?: string; side?: string; quantity?: number };
    if (!symbol || (side !== 'buy' && side !== 'sell') || !quantity) {
      return res.status(400).json({ success: false, error: 'symbol, side ("buy"|"sell") and quantity are required' });
    }

    const mock = getMarketData().quotes[symbol.toUpperCase()] ?? {};
    const resolved = resolveQuote(symbol.toUpperCase(), mock.price, mock.day_change_pct ?? 0);
    if (!resolved.price) {
      return res.status(400).json({ success: false, error: `No price available for ${symbol}.` });
    }

    const result = executeTrade({
      symbol,
      side,
      quantity: Number(quantity),
      price: resolved.price,
      price_mode: resolved.mode
    });

    if (!result.ok) {
      return res.status(400).json({ success: false, error: result.error });
    }

    console.log(`💼 [API] Executed ${side.toUpperCase()} ${quantity} ${symbol.toUpperCase()} @ ${resolved.price} (${resolved.mode})`);

    // Let any connected browser know the portfolio changed, so it can refetch rather than poll.
    liveEvents.emit('tick', { symbol: '__portfolio_updated__', price: 0, day_change_pct: 0, mode: 'mock', updated_at: new Date().toISOString() });

    res.json({ success: true, data: { trade: result.trade, portfolio: valuePortfolio() } });
  } catch (err: any) {
    console.error('❌ Execute trade error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/log-decision ────────────────────────────────────────────────────
app.post('/api/log-decision', (req, res) => {
  try {
    const { user_intent, detected_pattern, confidence, user_decision, user_note } = req.body;
    if (!user_intent || !user_decision) {
      return res.status(400).json({ success: false, error: 'user_intent and user_decision are required' });
    }

    const entry = appendDecision({
      decision_id:      nextId(),
      logged_at:        new Date().toISOString(),
      user_id:          getPortfolio().user_id,
      user_intent,
      detected_pattern: detected_pattern ?? null,
      confidence:       confidence ?? null,
      context_shown:    {},
      user_decision,
      user_note
    });

    const all         = decisionLog;
    const withPattern = all.filter((d: any) => d.detected_pattern !== null);
    const paused      = withPattern.filter((d: any) => d.user_decision !== 'proceeded').length;

    console.log(`📝 [API] Logged decision: ${entry.decision_id} — ${user_decision}`);
    res.json({
      success: true,
      data: {
        decision_id: entry.decision_id,
        session_stats: {
          total_decisions:        all.length,
          interventions_raised:   withPattern.length,
          paused_or_reconsidered: paused,
          proceeded_anyway:       withPattern.length - paused
        }
      }
    });
  } catch (err: any) {
    console.error('❌ Log decision error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/decision-log ─────────────────────────────────────────────────────
app.get('/api/decision-log', (_req, res) => {
  const all         = decisionLog;
  const withPattern = all.filter((d: any) => d.detected_pattern !== null);
  const paused      = withPattern.filter((d: any) => d.user_decision !== 'proceeded').length;

  res.json({
    success: true,
    data: {
      entries: all,
      stats: {
        total_decisions:        all.length,
        interventions_raised:   withPattern.length,
        paused_or_reconsidered: paused,
        proceeded_anyway:       withPattern.length - paused
      }
    }
  });
});

// ── GET /api/trade-history ────────────────────────────────────────────────────
app.get('/api/trade-history', (req, res) => {
  try {
    const pattern = typeof req.query.pattern === 'string' ? req.query.pattern : undefined;
    console.log('📊 [API] GET /api/trade-history');
    res.json({ success: true, data: summarizeTradeHistory(pattern) });
  } catch (err: any) {
    console.error('❌ Trade history error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/simulate-wait ────────────────────────────────────────────────────
app.get('/api/simulate-wait', (req, res) => {
  try {
    const eventType = typeof req.query.event_type === 'string' ? req.query.event_type : undefined;
    const wait      = typeof req.query.wait === 'string' ? req.query.wait : undefined;
    console.log(`📊 [API] GET /api/simulate-wait (${eventType ?? 'broad_dip'})`);
    res.json({ success: true, data: simulateWait(eventType, wait) });
  } catch (err: any) {
    console.error('❌ Simulate wait error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/herd-sentiment ───────────────────────────────────────────────────
app.get('/api/herd-sentiment', (req, res) => {
  try {
    const symbols = typeof req.query.symbols === 'string' ? req.query.symbols.split(',').map(s => s.trim()) : undefined;
    console.log('📊 [API] GET /api/herd-sentiment');
    res.json({ success: true, data: readHerdSentiment(symbols) });
  } catch (err: any) {
    console.error('❌ Herd sentiment error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/live-status ───────────────────────────────────────────────────────
app.get('/api/live-status', (_req, res) => {
  res.json({ success: true, data: getLiveStatus() });
});

// ── GET /api/health ───────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Start ────────────────────────────────────────────────────────────────────
initPortfolioState({ cash: getPortfolio().cash, holdings: getPortfolio().holdings });

const httpServer = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║          🤖  BidWiserAI — Backend API                ║
╚══════════════════════════════════════════════════════╝

🚀 Backend API running on http://localhost:${PORT}
📊 Endpoints:
  POST   /api/analyze-intent
  GET    /api/portfolio
  GET    /api/market-context
  GET    /api/decision-log
  POST   /api/log-decision
  GET    /api/trade-history      ?pattern=panic_sell
  GET    /api/simulate-wait      ?event_type=broad_dip&wait=24 hours
  GET    /api/herd-sentiment     ?symbols=NVDA,QBITX
  GET    /api/live-status
  POST   /api/execute-trade
  WS     /ws/live                (real-time quote ticks)
  GET    /api/health

✅ Behavioral bias detection: READY (no external AI key needed)
✅ Mock data directory: ${DATA_DIR}
`);
});

// ─── Live quote broadcast — WebSocket for the browser ──────────────────────────
const wss = new WebSocketServer({ server: httpServer, path: '/ws/live' });

wss.on('connection', (socket) => {
  socket.send(JSON.stringify({ type: 'snapshot', quotes: getAllLiveQuotes() }));
});

liveEvents.on('tick', (quote) => {
  const payload = JSON.stringify({ type: 'quote', quote });
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) client.send(payload);
  });
});

initLiveQuotes(getMarketData().quotes).catch((err) => {
  console.error('❌ [LiveQuotes] Failed to initialise:', err.message);
});
