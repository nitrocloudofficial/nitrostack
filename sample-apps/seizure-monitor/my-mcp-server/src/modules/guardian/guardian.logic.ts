/**
 * Pure reasoning functions behind the Guardian tools.
 *
 * Kept free of MCP concerns so each piece can be reasoned about (and tested) on its own:
 *   - valuePortfolio   : holdings + quotes -> valued snapshot
 *   - scoreRelevance   : Layer A, does this event actually touch this portfolio
 *   - detectSignal     : Layer B, does this message match a bias pattern
 *   - buildReflection  : the only place user-facing prose is written, and it lints itself
 */

import {
  BiasPattern,
  Holding,
  MarketEvent,
  Portfolio,
  Quote,
  SymbolSentiment,
  TradeHistoryEntry,
  WaitOutcome,
  getBiasDictionary,
  getHerdSentiment,
  getLiveQuoteOverride,
  getMarketData,
  getPortfolio,
  getPortfolioStateOverride,
  getTradeHistory,
  getWaitOutcomes,
  readDecisionLog
} from './guardian.store.js';

const round = (n: number, dp = 2) => Number(n.toFixed(dp));
const pct = (fraction: number, dp = 1) => `${(fraction * 100).toFixed(dp)}%`;

// ---------------------------------------------------------------------------
// Portfolio valuation
// ---------------------------------------------------------------------------

export interface ValuedHolding extends Holding {
  current_price: number;
  day_change_pct: number;
  quote_mode: 'live' | 'simulated' | 'mock';
  market_value: number;
  cost_basis: number;
  unrealized_gain: number;
  unrealized_gain_pct: number;
  weight_of_total: number;
  weight_of_invested: number;
}

export interface PortfolioSnapshot {
  user_id: string;
  currency: string;
  as_of: string;
  profile: Portfolio['profile'];
  holdings: ValuedHolding[];
  sector_breakdown: Array<{ sector: string; market_value: number; weight_of_total: number; symbols: string[] }>;
  totals: {
    invested_value: number;
    cash: number;
    total_value: number;
    total_cost_basis: number;
    unrealized_gain: number;
    unrealized_gain_pct: number;
    day_change_value: number;
    day_change_pct: number;
  };
  largest_position: { symbol: string; weight_of_total: number } | null;
  concentration_note: string;
}

export function valuePortfolio(): PortfolioSnapshot {
  const portfolio = getPortfolio(); // static: profile, currency, as_of, user_id — never mutated by trades
  const override = getPortfolioStateOverride(); // mutable: moves when a trade is executed via the web app
  const currentHoldings = override?.holdings ?? portfolio.holdings;
  const currentCash = override?.cash ?? portfolio.cash;
  const { quotes } = getMarketData();

  const priced = currentHoldings.map((h) => {
    const mock: Quote | undefined = quotes[h.symbol];
    const live = getLiveQuoteOverride(h.symbol);
    const useLive = live && (live.mode === 'live' || live.mode === 'simulated');
    const price = useLive ? live!.price : (mock?.price ?? h.avg_price);
    const dayChange = useLive ? live!.day_change_pct : (mock?.day_change_pct ?? 0);
    const marketValue = price * h.quantity;
    const costBasis = h.avg_price * h.quantity;
    return {
      holding: h,
      price,
      dayChange,
      quoteMode: (useLive ? live!.mode : 'mock') as 'live' | 'simulated' | 'mock',
      marketValue,
      costBasis
    };
  });

  const investedValue = priced.reduce((sum, p) => sum + p.marketValue, 0);
  const totalValue = investedValue + currentCash;
  const totalCostBasis = priced.reduce((sum, p) => sum + p.costBasis, 0);

  const holdings: ValuedHolding[] = priced.map(({ holding, price, dayChange, quoteMode, marketValue, costBasis }) => ({
    ...holding,
    current_price: price,
    day_change_pct: dayChange,
    quote_mode: quoteMode,
    market_value: round(marketValue),
    cost_basis: round(costBasis),
    unrealized_gain: round(marketValue - costBasis),
    unrealized_gain_pct: costBasis ? round(((marketValue - costBasis) / costBasis) * 100) : 0,
    weight_of_total: totalValue ? round(marketValue / totalValue, 4) : 0,
    weight_of_invested: investedValue ? round(marketValue / investedValue, 4) : 0
  }));

  const bySector = new Map<string, ValuedHolding[]>();
  for (const h of holdings) {
    bySector.set(h.sector, [...(bySector.get(h.sector) ?? []), h]);
  }

  const sectorBreakdown = [...bySector.entries()]
    .map(([sector, hs]) => ({
      sector,
      market_value: round(hs.reduce((s, h) => s + h.market_value, 0)),
      weight_of_total: round(hs.reduce((s, h) => s + h.market_value, 0) / totalValue, 4),
      symbols: hs.map((h) => h.symbol)
    }))
    .sort((a, b) => b.market_value - a.market_value);

  // Yesterday's value implied by today's percentage moves, so the day change is consistent
  // with the per-holding quotes rather than being an independent number.
  const previousInvested = priced.reduce(
    (sum, p) => sum + p.marketValue / (1 + p.dayChange / 100),
    0
  );
  const dayChangeValue = investedValue - previousInvested;

  // Trading can now genuinely empty the portfolio out (sell every position), so this can't assume
  // at least one holding exists the way it safely could when holdings were a static fixture.
  const largest = holdings.length
    ? holdings.reduce((a, b) => (b.weight_of_total > a.weight_of_total ? b : a))
    : null;
  const topSector = sectorBreakdown[0] as (typeof sectorBreakdown)[number] | undefined;

  return {
    user_id: portfolio.user_id,
    currency: portfolio.currency,
    as_of: portfolio.as_of,
    profile: portfolio.profile,
    holdings,
    sector_breakdown: sectorBreakdown,
    totals: {
      invested_value: round(investedValue),
      cash: currentCash,
      total_value: round(totalValue),
      total_cost_basis: round(totalCostBasis),
      unrealized_gain: round(investedValue - totalCostBasis),
      unrealized_gain_pct: totalCostBasis ? round(((investedValue - totalCostBasis) / totalCostBasis) * 100) : 0,
      day_change_value: round(dayChangeValue),
      day_change_pct: previousInvested ? round((dayChangeValue / previousInvested) * 100) : 0
    },
    largest_position: largest ? { symbol: largest.symbol, weight_of_total: largest.weight_of_total } : null,
    concentration_note: topSector
      ? `${topSector.sector} is the largest sector at ${pct(topSector.weight_of_total)} of total value (${topSector.symbols.join(', ')}).`
      : 'This account is currently all cash — every position has been sold.'
  };
}

// ---------------------------------------------------------------------------
// Layer A — relevance
// ---------------------------------------------------------------------------

export type RelevanceBand = 'high' | 'medium' | 'low' | 'noise';
export type EventDriver = 'broad_market' | 'sector' | 'company_specific' | 'unrelated';

export interface RelevanceResult {
  event_id: string;
  headline: string;
  date: string;
  relevance_band: RelevanceBand;
  relevance_score: number;
  driver: EventDriver;
  is_company_specific: boolean;
  exposure_pct_of_portfolio: number;
  exposure_value: number;
  affected_holdings: Array<{
    symbol: string;
    sector: string;
    weight_of_total: number;
    match_reason: 'named_directly' | 'sector_match' | 'market_wide';
    day_change_pct: number;
  }>;
  explanation: string;
  why_it_matters_or_not: string;
}

export function scoreRelevance(event: MarketEvent, snapshot = valuePortfolio()): RelevanceResult {
  const marketWide = event.affects_sectors.includes('all');

  // Company-scope news names its subject. Its sector tag is only there for grouping — spreading
  // an antitrust probe of one company across every tech holding would overstate the exposure and
  // manufacture alarm, which is precisely the failure this engine exists to prevent.
  const namesItsSubject = event.scope === 'company' && event.affects_symbols.length > 0;

  const affected = snapshot.holdings
    .map((h) => {
      let reason: 'named_directly' | 'sector_match' | 'market_wide' | null = null;
      if (event.affects_symbols.includes(h.symbol)) reason = 'named_directly';
      else if (namesItsSubject) reason = null;
      else if (event.affects_sectors.includes(h.sector)) reason = 'sector_match';
      else if (marketWide) reason = 'market_wide';
      return reason ? { holding: h, reason } : null;
    })
    .filter((x): x is { holding: ValuedHolding; reason: 'named_directly' | 'sector_match' | 'market_wide' } => x !== null);

  const exposureValue = affected.reduce((sum, a) => sum + a.holding.market_value, 0);
  const exposureFraction = exposureValue / snapshot.totals.total_value;
  const hasDirectNamedHolding = affected.some((a) => a.reason === 'named_directly');

  const score =
    exposureFraction === 0 ? 0 : Math.min(1, round(exposureFraction * 1.6 + (hasDirectNamedHolding ? 0.15 : 0), 3));

  const band: RelevanceBand = score >= 0.6 ? 'high' : score >= 0.25 ? 'medium' : score > 0 ? 'low' : 'noise';

  const driver: EventDriver =
    exposureFraction === 0
      ? 'unrelated'
      : marketWide || event.scope === 'market_wide' || event.scope === 'macro'
        ? 'broad_market'
        : event.scope === 'company'
          ? 'company_specific'
          : 'sector';

  const symbols = affected.map((a) => a.holding.symbol);

  const explanation =
    band === 'noise'
      ? `Nothing in your portfolio is exposed to this. You do not hold ${event.affects_symbols.length ? event.affects_symbols.join(', ') : 'anything in the area this affects'}, so this is background noise for you.`
      : `This touches ${symbols.length} of your ${snapshot.holdings.length} holdings (${symbols.join(', ')}) — ${pct(exposureFraction)} of your total value, about ${snapshot.currency} ${Math.round(exposureValue).toLocaleString('en-US')}.`;

  const whyItMatters =
    band === 'noise'
      ? 'No action on your side is implied either way — this one simply is not about your money.'
      : driver === 'broad_market'
        ? 'The move is market-wide rather than about any of these companies specifically. Everything is falling together, which usually says more about the macro backdrop than about the businesses you own.'
        : driver === 'sector'
          ? `The move is sector-level: it is affecting ${event.affects_sectors.filter((s) => s !== 'all').join(' and ')} broadly, not just the names you hold. No company-specific news is attached to your holdings in this event.`
          : `This is company-specific news attached directly to ${event.affects_symbols.filter((s) => symbols.includes(s)).join(', ')}. Unlike a broad dip, this is the kind of event that can genuinely change the reason for owning a position — it is worth reading properly rather than reacting to the price.`;

  return {
    event_id: event.id,
    headline: event.headline,
    date: event.date,
    relevance_band: band,
    relevance_score: score,
    driver,
    is_company_specific: driver === 'company_specific',
    exposure_pct_of_portfolio: round(exposureFraction, 4),
    exposure_value: round(exposureValue),
    affected_holdings: affected.map((a) => ({
      symbol: a.holding.symbol,
      sector: a.holding.sector,
      weight_of_total: a.holding.weight_of_total,
      match_reason: a.reason,
      day_change_pct: a.holding.day_change_pct
    })),
    explanation,
    why_it_matters_or_not: whyItMatters
  };
}

// ---------------------------------------------------------------------------
// Layer B — bias detection
// ---------------------------------------------------------------------------

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Match whole phrases only — "all" must not match "allocation", "add" must not match "address". */
export function matchPhrases(normalizedText: string, phrases: string[]): string[] {
  const hits: string[] = [];
  for (const phrase of phrases) {
    const p = normalize(phrase);
    const prefix = /^[a-z0-9]/.test(p) ? '(?<![a-z0-9])' : '';
    const suffix = /[a-z0-9]$/.test(p) ? '(?![a-z0-9])' : '';
    if (new RegExp(`${prefix}${escapeRegex(p)}${suffix}`).test(normalizedText)) hits.push(phrase);
  }
  return hits;
}

export interface PatternScore {
  pattern: BiasPattern['id'];
  label: string;
  description: string;
  confidence: number;
  gate_passed: boolean;
  matched_signals: Array<{ signal: string; weight: number; description: string; matched_phrases: string[] }>;
  reasoning: string;
}

export interface SignalDetection {
  input: string;
  detected_pattern: BiasPattern['id'] | 'none';
  confidence: number;
  action: 'intervene' | 'watch' | 'none';
  trade_intent_detected: boolean;
  looks_informational: boolean;
  deliberation_markers_found: string[];
  primary: PatternScore | null;
  secondary: PatternScore[];
  all_scores: PatternScore[];
  reasoning: string;
  thresholds: { intervene: number; watch: number };
}

export function detectSignal(rawText: string): SignalDetection {
  const dict = getBiasDictionary();
  const text = normalize(rawText);

  const deliberation = matchPhrases(text, dict.deliberation_markers.phrases);
  const informational = matchPhrases(text, dict.informational_markers.phrases);
  const penalty = deliberation.length > 0 ? dict.deliberation_markers.penalty : 0;

  const scores: PatternScore[] = dict.patterns.map((pattern) => {
    const gateHits = matchPhrases(text, pattern.gate.phrases);
    const gatePassed = gateHits.length > 0;

    const matchedSignals = pattern.signals
      .map((signal) => ({
        signal: signal.id,
        weight: signal.weight,
        description: signal.description,
        matched_phrases: matchPhrases(text, signal.phrases)
      }))
      .filter((s) => s.matched_phrases.length > 0);

    if (!gatePassed) {
      return {
        pattern: pattern.id,
        label: pattern.label,
        description: pattern.description,
        confidence: 0,
        gate_passed: false,
        matched_signals: matchedSignals,
        reasoning: `No ${pattern.gate.id} detected, so this pattern cannot fire regardless of the other language present. ${matchedSignals.length ? `(${matchedSignals.length} supporting signal(s) were present but are ignored without the gate.)` : ''}`.trim()
      };
    }

    const raw = pattern.gate.weight + matchedSignals.reduce((sum, s) => sum + s.weight, 0);
    const confidence = round(Math.max(0, Math.min(0.98, raw - penalty)), 2);

    return {
      pattern: pattern.id,
      label: pattern.label,
      description: pattern.description,
      confidence,
      gate_passed: true,
      matched_signals: [
        { signal: pattern.gate.id, weight: pattern.gate.weight, description: pattern.gate.description, matched_phrases: gateHits },
        ...matchedSignals
      ],
      reasoning: `${pattern.gate.id} present (${gateHits.join(', ')})${matchedSignals.length ? `, plus ${matchedSignals.map((s) => `${s.signal} (${s.matched_phrases.join(', ')})`).join('; ')}` : ' with no supporting emotional or social signals'}${penalty ? `; reduced by ${penalty} because the message contains deliberation markers (${deliberation.join(', ')})` : ''}.`
    };
  });

  const ranked = [...scores].sort((a, b) => b.confidence - a.confidence);
  const top = ranked[0];
  const tradeIntent = scores.some((s) => s.gate_passed);

  const action: SignalDetection['action'] =
    top.confidence >= dict.thresholds.intervene ? 'intervene' : top.confidence >= dict.thresholds.watch ? 'watch' : 'none';

  const detected = action === 'none' ? 'none' : top.pattern;

  const reasoning =
    action === 'none'
      ? tradeIntent
        ? `A trade intent is present but the surrounding language is calm and specific — highest pattern score was ${top.confidence}, below the ${dict.thresholds.watch} watch threshold. No intervention. This looks like a considered decision, not a reactive one.`
        : `No trade intent detected in this message${informational.length ? ` — it reads as an informational question (${informational.join(', ')})` : ''}. The bias gate did not open, so no intervention. Answer the question normally using the relevance tools.`
      : action === 'watch'
        ? `Weak match for ${top.label} at ${top.confidence}, between the ${dict.thresholds.watch} watch and ${dict.thresholds.intervene} intervene thresholds. Worth surfacing context, but do not run a full intervention — say less, not more.`
        : `Strong match for ${top.label} at ${top.confidence}. ${top.reasoning}`;

  return {
    input: rawText,
    detected_pattern: detected,
    confidence: top.confidence,
    action,
    trade_intent_detected: tradeIntent,
    looks_informational: informational.length > 0 && !tradeIntent,
    deliberation_markers_found: deliberation,
    primary: action === 'none' ? null : top,
    secondary: ranked.slice(1).filter((s) => s.confidence >= dict.thresholds.watch),
    all_scores: scores,
    reasoning,
    thresholds: dict.thresholds
  };
}

// ---------------------------------------------------------------------------
// Compliance lint
// ---------------------------------------------------------------------------

export interface ComplianceCheck {
  passed: boolean;
  violations: string[];
  rule: string;
}

export function lintForAdvice(text: string): ComplianceCheck {
  const banned = getBiasDictionary().banned_advice_phrases;
  const violations = matchPhrases(normalize(text), banned.phrases);
  return {
    passed: violations.length === 0,
    violations,
    rule: 'Output must contain no directive trade language. The agent informs and reflects; it never recommends.'
  };
}

// ---------------------------------------------------------------------------
// Reflection prompt construction
// ---------------------------------------------------------------------------

export interface ReflectionInput {
  pattern: BiasPattern['id'];
  relevance?: RelevanceResult | null;
  historical_summary?: string | null;
  snapshot?: PortfolioSnapshot;
  target_symbols?: string[];
  /** Headline of the event driving the reaction, quoted back so the observation is concrete. */
  event_headline?: string | null;
  /** Data flags on the event, e.g. crowded_trade, no_earnings_history. */
  event_flags?: string[];
}

export interface ReflectionOutput {
  pattern: BiasPattern['id'];
  headline: string;
  observation: string;
  pattern_note: string;
  historical_context: string | null;
  reflection_question: string;
  cooling_off_suggestion: string;
  user_options: string[];
  full_text: string;
  compliance: ComplianceCheck;
  disclaimer: string;
}

/**
 * Long-horizon and active-trader personas need different cooling-off language — "this money isn't
 * needed for years" is simply false for someone who has said they are not a buy-and-hold investor.
 * Branching on the stated horizon keeps the reflection honest about whichever profile is loaded,
 * rather than assuming everyone using this server is investing for the long run.
 */
function horizonPhrase(snapshot: PortfolioSnapshot): string {
  const horizon = snapshot.profile.stated_horizon_years;
  return horizon >= 1
    ? `a stated horizon of ${horizon} years`
    : `no stated long-term horizon — the plan on file is: "${snapshot.profile.stated_goal.replace(/\.$/, '')}"`;
}

export function buildReflection(input: ReflectionInput): ReflectionOutput {
  const snapshot = input.snapshot ?? valuePortfolio();
  const relevance = input.relevance ?? null;
  const horizon = snapshot.profile.stated_horizon_years;

  const targets =
    input.target_symbols?.length
      ? input.target_symbols
      : relevance?.affected_holdings.map((h) => h.symbol) ?? [];

  const targetList = targets.length ? targets.join(', ') : 'these positions';
  const theses = snapshot.holdings
    .filter((h) => targets.includes(h.symbol))
    .map((h) => `${h.symbol}: "${h.thesis.replace(/\.$/, '')}"`);

  let headline: string;
  let observation: string;
  let patternNote: string;
  let question: string;
  let coolingOff: string;
  let options: string[];

  switch (input.pattern) {
    case 'panic_sell': {
      const specific = relevance?.is_company_specific ?? false;
      headline = 'Before this one goes through — a moment of context';
      observation = relevance
        ? `${relevance.explanation} ${relevance.why_it_matters_or_not}`
        : `This affects ${targetList}, currently ${pct(
            snapshot.holdings.filter((h) => targets.includes(h.symbol)).reduce((s, h) => s + h.weight_of_total, 0)
          )} of your total value.`;
      patternNote = specific
        ? 'The language here reads as urgent and broad — selling everything at once. Worth separating that urgency from the substance: there is real company-specific news attached to this one, which is a different situation from a market-wide drop.'
        : 'The language here matches a pattern people fall into during declines: urgency, "all", and fear framing, aimed at a price move rather than at a change in the underlying reason for owning the position.';
      question = specific
        ? `The news attached to ${targetList} is specific to the company, not just the market. Does what you have read actually change the reason you bought it — or is the size of today's price move doing the arguing?`
        : `You wrote down a reason for each of these when you bought them${theses.length ? ` — ${theses[0]}` : ''}. Has any of those reasons stopped being true today, or has only the price changed?`;
      coolingOff =
        horizon >= 1
          ? `You have said your horizon is around ${horizon} years and this money is not needed for a while. Sitting with this for one trading session costs nothing if the reasoning still holds tomorrow.`
          : `Your own stated plan for this account is: "${snapshot.profile.stated_goal.replace(/\.$/, '')}". If today's move does not change that plan, waiting one session before acting costs nothing.`;
      options = [
        'Review the original reason I wrote down for each of these',
        'See what actually moved today versus what did not',
        'Wait until tomorrow and revisit',
        'Proceed anyway — I have considered this'
      ];
      break;
    }

    case 'fomo_buy': {
      headline = 'Before you open this position — a moment of context';
      // A name the user is about to buy is not "noise" just because they do not own it yet —
      // the relevance explanation is written for existing exposure and reads as dismissive here.
      observation =
        relevance && relevance.relevance_band !== 'noise'
          ? `${relevance.explanation} ${relevance.why_it_matters_or_not}`
          : [
              `You do not hold ${targetList} today, so none of your ${snapshot.holdings.length} existing positions move with it either way. What is at stake is new money going in after the move has already happened.`,
              input.event_headline ? `The move itself: ${input.event_headline}.` : '',
              input.event_flags?.length
                ? `Things worth knowing about this one, from the data rather than from the mood: ${input.event_flags
                    .map((f) => f.replace(/_/g, ' '))
                    .join(', ')}.`
                : ''
            ]
              .filter(Boolean)
              .join(' ');
      patternNote =
        'The framing here is about the crowd and about speed — what other people are doing, and getting in before something happens. Notice what is missing from it: a reason this belongs in your portfolio that would still make sense if the price had not moved.';
      question =
        'If this name had gone sideways for the last three months instead of running up, would you still want to own it? And if the answer is no, what exactly are you buying?';
      coolingOff =
        snapshot.profile.monthly_contribution > 0
          ? `You have said you deploy about ${snapshot.currency} ${snapshot.profile.monthly_contribution} a month into new positions on purpose, with a plan — not on impulse. If this still appeals in a week, you can size into it deliberately then, rather than in a hurry now.`
          : `If this position still appeals in a week, it will still be there to open — with a size you chose deliberately rather than in a hurry.`;
      options = [
        'Show me what this would do to my sector concentration',
        'Show me how similar crowded entries have played out',
        'Set a reminder to revisit in 7 days',
        'Proceed anyway — I have considered this'
      ];
      break;
    }

    case 'herd_follow': {
      headline = 'Before you follow this — a moment of context';
      observation = relevance
        ? `${relevance.explanation} ${relevance.why_it_matters_or_not}`
        : `Your portfolio is ${snapshot.holdings.length} positions across ${snapshot.sector_breakdown.length} sectors, with ${horizonPhrase(snapshot)}. ${snapshot.concentration_note}`;
      patternNote =
        'The reason given for this trade is someone else\'s action rather than your own read of the situation. That is worth noticing on its own — not because they are wrong, but because you cannot see their time horizon, their tax position, their cash needs, or how big this position is relative to the rest of what they own.';
      question =
        'What do you know about their situation that makes their decision fit yours — their horizon, their other holdings, whether they need this money soon? And what was your own reason before you heard theirs?';
      coolingOff =
        'The information you are acting on has usually already moved the price by the time it reaches a group chat or a feed. A day makes very little difference to that, and quite a lot of difference to how considered the decision is.';
      options = [
        'Compare this move against my own stated plan',
        'Show me how copied trades have worked out historically',
        'Wait a day and revisit',
        'Proceed anyway — I have considered this'
      ];
      break;
    }
  }

  const historical = input.historical_summary ?? null;

  const fullText = [
    headline,
    '',
    observation,
    '',
    patternNote,
    ...(historical ? ['', historical] : []),
    '',
    question,
    '',
    coolingOff,
    '',
    'This is your decision and it stays your decision. Nothing here is a recommendation to buy, sell or hold anything — it is the context you would want in front of you before you choose.'
  ].join('\n');

  return {
    pattern: input.pattern,
    headline,
    observation,
    pattern_note: patternNote,
    historical_context: historical,
    reflection_question: question,
    cooling_off_suggestion: coolingOff,
    user_options: options,
    full_text: fullText,
    compliance: lintForAdvice(fullText),
    disclaimer: 'Informational only. Not investment advice. All figures are mock data.'
  };
}

// ---------------------------------------------------------------------------
// Personal decision history
// ---------------------------------------------------------------------------

export interface TradeHistorySummary {
  user_id: string;
  as_of: string;
  total_records: number;
  interventions_all_time: number;
  by_pattern_all_time: Record<string, number>;
  by_pattern_this_month: Record<string, number>;
  this_month_label: string;
  proceeded: number;
  paused_or_changed_mind: number;
  outcomes: Record<string, number>;
  repeat_insight: string | null;
  recent: TradeHistoryEntry[];
  sources: string;
}

/**
 * Merges the fabricated prior-months history with decisions logged in this session.
 *
 * The on-disk JSONL is deliberately NOT read: it accumulates across test runs, which would make
 * the counts non-deterministic mid-demo. Session memory plus seeded history is reproducible.
 */
export function summarizeTradeHistory(pattern?: string): TradeHistorySummary {
  const seeded = getTradeHistory();
  const session: TradeHistoryEntry[] = readDecisionLog().map((d) => ({
    decision_id: d.decision_id,
    logged_at: d.logged_at,
    user_intent: d.user_intent,
    detected_pattern: d.detected_pattern,
    confidence: d.confidence,
    user_decision: d.user_decision,
    outcome: 'not_applicable'
  }));

  const all = [...seeded.entries, ...session].sort((a, b) => a.logged_at.localeCompare(b.logged_at));

  // "This month" is anchored to the dataset's as_of date, not the wall clock, so the demo reads
  // the same way whenever it is run.
  const asOf = getPortfolio().as_of;
  const monthPrefix = asOf.slice(0, 7);

  const interventions = all.filter((e) => e.detected_pattern !== null);
  const thisMonth = interventions.filter((e) => e.logged_at.slice(0, 7) === monthPrefix);

  const tally = (entries: TradeHistoryEntry[]) =>
    entries.reduce<Record<string, number>>((acc, e) => {
      const key = e.detected_pattern as string;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

  const byPatternAllTime = tally(interventions);
  const byPatternThisMonth = tally(thisMonth);

  const outcomes = interventions.reduce<Record<string, number>>((acc, e) => {
    if (!e.outcome || e.outcome === 'not_applicable') return acc;
    acc[e.outcome] = (acc[e.outcome] ?? 0) + 1;
    return acc;
  }, {});

  let repeatInsight: string | null = null;
  if (pattern) {
    const priorThisMonth = byPatternThisMonth[pattern] ?? 0;
    const priorAllTime = byPatternAllTime[pattern] ?? 0;
    const label = pattern.replace(/_/g, '-');
    if (priorThisMonth >= 1) {
      const ordinal = ['1st', '2nd', '3rd', '4th', '5th', '6th'][priorThisMonth] ?? `${priorThisMonth + 1}th`;
      repeatInsight = `This is the ${ordinal} ${label} signal on this account this month — ${priorThisMonth} before today. Worth noticing as a pattern in itself, separately from whether any one of them was the right call.`;
    } else if (priorAllTime >= 1) {
      repeatInsight = `${priorAllTime} previous ${label} signal${priorAllTime > 1 ? 's' : ''} on this account, though none earlier this month.`;
    } else {
      repeatInsight = `First ${label} signal recorded on this account.`;
    }
  }

  return {
    user_id: seeded.user_id,
    as_of: asOf,
    total_records: all.length,
    interventions_all_time: interventions.length,
    by_pattern_all_time: byPatternAllTime,
    by_pattern_this_month: byPatternThisMonth,
    this_month_label: monthPrefix,
    proceeded: interventions.filter((e) => e.user_decision === 'proceeded').length,
    paused_or_changed_mind: interventions.filter((e) =>
      ['paused_to_reflect', 'changed_mind'].includes(e.user_decision)
    ).length,
    outcomes,
    repeat_insight: repeatInsight,
    recent: all.slice(-5).reverse(),
    sources: 'Seeded prior-months history plus decisions logged in this session.'
  };
}

// ---------------------------------------------------------------------------
// Wait simulation
// ---------------------------------------------------------------------------

export interface WaitSimulation {
  event_type: string;
  matched_on: string;
  label: string;
  direction: 'selling' | 'buying';
  outcomes: WaitOutcome[];
  headline_window: WaitOutcome | null;
  plain_language: string;
  both_sides: string;
  caveat: string;
}

export function simulateWait(eventType: string | undefined, wait?: string): WaitSimulation {
  const data = getWaitOutcomes();
  const requested = eventType ?? 'broad_dip';

  const window =
    data.windows.find((w) => w.event_type === requested) ??
    data.windows.find((w) => requested.includes(w.event_type) || w.event_type.includes(requested)) ??
    data.windows.find((w) => w.event_type === 'broad_dip')!;

  const headline = wait ? window.outcomes.find((o) => o.wait === wait) ?? null : window.outcomes[0];
  const direction = window.event_type === 'hype_cycle' ? 'buying' : 'selling';

  const worstShares = window.outcomes.map((o) => Math.round(o.share_worse_after_waiting * 100));

  return {
    event_type: window.event_type,
    matched_on:
      window.event_type === requested
        ? `exact match on "${requested}"`
        : `no window for "${requested}" — using "${window.event_type}" as the closest comparable`,
    label: window.label,
    direction,
    outcomes: window.outcomes,
    headline_window: headline,
    plain_language: window.plain_language,
    both_sides: `Across the three windows, waiting left this mock cohort worse off ${worstShares.join('%, ')}% of the time. ${
      window.direction_note ?? 'Those cases are as real as the favourable ones.'
    }`,
    caveat:
      'This is what happened to a mock cohort in past comparable episodes. It is not a prediction of what happens next, and it does not indicate what any individual should do. Present the unfavourable share alongside the favourable one, always.'
  };
}

// ---------------------------------------------------------------------------
// Herd sentiment
// ---------------------------------------------------------------------------

export interface HerdReading {
  as_of: string;
  market_wide: ReturnType<typeof getHerdSentiment>['market_wide'];
  symbols: Array<
    SymbolSentiment & {
      symbol: string;
      held: boolean;
      crowding: 'crowded' | 'elevated' | 'normal';
      dominant_side: 'selling' | 'buying' | 'balanced';
    }
  >;
  unknown_symbols: string[];
  crowd_summary: string;
  interpretation_guide: string;
}

export function readHerdSentiment(symbols?: string[]): HerdReading {
  const data = getHerdSentiment();
  const held = new Set(getPortfolio().holdings.map((h) => h.symbol));
  const wanted = symbols?.map((s) => s.toUpperCase());

  const keys = wanted ? wanted.filter((s) => data.symbols[s]) : Object.keys(data.symbols);
  const { crowded, elevated } = data.crowding_thresholds;

  const rows = keys.map((symbol) => {
    const s = data.symbols[symbol];
    const dominantShare = Math.max(s.share_selling_24h, s.share_buying_24h);
    return {
      ...s,
      symbol,
      held: held.has(symbol),
      crowding: (dominantShare >= crowded ? 'crowded' : dominantShare >= elevated ? 'elevated' : 'normal') as
        | 'crowded'
        | 'elevated'
        | 'normal',
      dominant_side: (s.share_selling_24h > s.share_buying_24h
        ? 'selling'
        : s.share_buying_24h > s.share_selling_24h
          ? 'buying'
          : 'balanced') as 'selling' | 'buying' | 'balanced'
    };
  });

  const crowdedRows = rows.filter((r) => r.crowding === 'crowded');

  return {
    as_of: data.as_of,
    market_wide: data.market_wide,
    symbols: rows,
    unknown_symbols: wanted?.filter((s) => !data.symbols[s]) ?? [],
    crowd_summary: crowdedRows.length
      ? `${crowdedRows.map((r) => `${r.symbol} (${Math.round(Math.max(r.share_selling_24h, r.share_buying_24h) * 100)}% ${r.dominant_side})`).join(', ')} ${crowdedRows.length === 1 ? 'is' : 'are'} heavily one-directional right now. Sentiment overall reads ${data.market_wide.label} at ${data.market_wide.fear_greed_index}/100.`
      : `No name here is unusually one-directional. Sentiment overall reads ${data.market_wide.label} at ${data.market_wide.fear_greed_index}/100.`,
    interpretation_guide:
      'This describes what other people are doing, nothing more. A crowded trade is not evidence that the crowd is wrong, and "everyone is selling" is not a reason to sell or to buy. The only question it answers is whether the user is about to do the same thing as everyone else, which is worth knowing when the stated reason for the trade was what someone else did.'
  };
}
