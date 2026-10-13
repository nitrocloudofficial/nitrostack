import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import {
  DATA_DISCLAIMER,
  DecisionLogEntry,
  HistoricalCase,
  MarketEvent,
  appendDecision,
  getHistoricalPatterns,
  getMarketData,
  getWaitOutcomes,
  nextDecisionId,
  readDecisionLog
} from './guardian.store.js';
import {
  buildReflection,
  detectSignal,
  lintForAdvice,
  scoreRelevance,
  simulateWait,
  summarizeTradeHistory,
  valuePortfolio
} from './guardian.logic.js';

type PatternId = 'panic_sell' | 'fomo_buy' | 'herd_follow';

export class BehaviorTools {
  @Tool({
    name: 'detect_behavioral_signal',
    description:
      "Layer B of the guardian. Analyse the user's own words for one of three bias patterns: panic_sell, fomo_buy or herd_follow. Returns the pattern, a confidence score, the exact phrases that triggered it, and an action band (intervene / watch / none). Call this on any message where the user states an intent to trade — and trust a 'none' result: a calm, specific, pre-planned trade is not a bias event and must not be interrupted.",
    inputSchema: z.object({
      user_intent: z.string().min(1).describe("The user's message, verbatim. Do not paraphrase or clean it up — the emotional wording is the signal.")
    }),
    examples: {
      request: { user_intent: 'Market is crashing, sell all my tech stocks now' },
      response: {
        detected_pattern: 'panic_sell',
        confidence: 0.92,
        action: 'intervene',
        matched_signals: [{ signal: 'emotional_language', matched_phrases: ['crashing'] }]
      }
    }
  })
  async detectBehavioralSignal(input: { user_intent: string }, ctx: ExecutionContext) {
    const detection = detectSignal(input.user_intent);

    ctx.logger.info('Behavioural signal analysed', {
      pattern: detection.detected_pattern,
      confidence: detection.confidence,
      action: detection.action
    });

    return {
      ...detection,
      symbols_mentioned: extractSymbols(input.user_intent),
      next_step:
        detection.action === 'intervene'
          ? 'Gather context before responding: get_portfolio_snapshot, then check_relevance_score on the driving event, then get_historical_pattern, then generate_reflection_prompt. Do not answer the request until that context is in hand.'
          : detection.action === 'watch'
            ? 'Surface the relevant context briefly (relevance score is usually enough). Do not run a full intervention — an over-eager nudge on a borderline case costs more trust than it saves.'
            : 'No intervention. Answer the question directly using get_portfolio_snapshot and get_market_context.',
      false_positive_guard:
        'The gate is intent-based on purpose. Emotional language alone never fires a pattern, and a message containing deliberation markers ("as planned", "rebalancing", "need the cash for") is scored down. If this returned none, it means none.',
      disclaimer: DATA_DISCLAIMER
    };
  }

  @Tool({
    name: 'get_historical_pattern',
    description:
      'Pull what has historically happened after decisions like this one: aggregate outcomes for the cohort plus specific comparable episodes. Use it to give the user a base rate instead of an opinion. Includes deliberately-chosen counterweight cases where the reactive decision turned out to be the correct one — presenting only the cases that support pausing would be advice wearing a costume.',
    inputSchema: z.object({
      pattern: z.enum(['panic_sell', 'fomo_buy', 'herd_follow']).describe('Which bias pattern to look up'),
      event_type: z
        .string()
        .optional()
        .describe('Narrow to comparable episodes, e.g. "broad_dip", "sector_move", "earnings", "hype_cycle", "rate_decision"'),
      limit: z.number().int().min(1).max(6).default(3).describe('Maximum comparable cases to return')
    }),
    examples: {
      request: { pattern: 'panic_sell', event_type: 'broad_dip' },
      response: {
        plain_language: 'In this mock cohort, about 2 in 3 investors who sold during the drop bought back in higher.',
        cases: [{ case: 'March 2020 pandemic crash', recovery_days: 148 }]
      }
    }
  })
  async getHistoricalPattern(
    input: { pattern: PatternId; event_type?: string; limit?: number },
    ctx: ExecutionContext
  ) {
    const result = selectHistorical(input.pattern, input.event_type, input.limit ?? 3);
    ctx.logger.info('Fetched historical pattern', { pattern: input.pattern, cases: result.cases.length });

    return {
      ...result,
      presentation_note:
        'Present this as a base rate, not a forecast. "Here is what happened to people who did this" is information. "This will recover" is a prediction and is out of bounds.',
      disclaimer: getHistoricalPatterns()._disclaimer
    };
  }

  @Tool({
    name: 'generate_reflection_prompt',
    description:
      'Compose the intervention: a plain-language observation about what is actually happening to this portfolio, a non-judgemental note on the pattern detected, the historical base rate, and exactly one reflective cooling-off question. This is the only tool that produces user-facing prose, and it lints its own output against a list of banned directive phrases before returning. Renders the intervention widget.',
    inputSchema: z.object({
      pattern: z.enum(['panic_sell', 'fomo_buy', 'herd_follow']).describe('Pattern returned by detect_behavioral_signal'),
      user_intent: z.string().optional().describe("The user's original message, used to infer the symbols in play"),
      confidence: z.number().min(0).max(1).optional().describe('Confidence from detect_behavioral_signal, passed through for the audit trail'),
      event_id: z
        .string()
        .optional()
        .describe('Driving event from the feed. If omitted, the most relevant matching event is selected automatically.'),
      target_symbols: z.array(z.string()).optional().describe('Tickers the user is about to act on'),
      include_historical: z.boolean().default(true).describe('Include the historical base rate section')
    }),
    examples: {
      request: { pattern: 'panic_sell', user_intent: 'Market crashing, sell all my tech now', event_id: 'E2' },
      response: {
        reflection_question:
          'You wrote down a reason for each of these when you bought them. Has any of those reasons stopped being true today, or has only the price changed?',
        compliance: { passed: true, violations: [] }
      }
    }
  })
  @Widget('intervention-modal')
  async generateReflectionPrompt(
    input: {
      pattern: PatternId;
      user_intent?: string;
      confidence?: number;
      event_id?: string;
      target_symbols?: string[];
      include_historical?: boolean;
    },
    ctx: ExecutionContext
  ) {
    const snapshot = valuePortfolio();
    const mentioned = input.target_symbols?.map((s) => s.toUpperCase()) ?? extractSymbols(input.user_intent ?? '');

    const event = pickContextEvent(input.pattern, input.event_id, mentioned);
    const relevance = event ? scoreRelevance(event, snapshot) : null;

    const targets = mentioned.length
      ? mentioned
      : relevance?.affected_holdings.map((h) => h.symbol) ?? [];

    const historical =
      (input.include_historical ?? true) ? selectHistorical(input.pattern, event?.type, 2) : null;

    const reflection = buildReflection({
      pattern: input.pattern,
      relevance,
      snapshot,
      target_symbols: targets,
      event_headline: event?.headline ?? null,
      event_flags: event?.flags ?? [],
      historical_summary: historical
        ? `${historical.plain_language} ${historical.cases[0] ? `For comparison: ${historical.cases[0].case} — ${describeCase(historical.cases[0])}` : ''} ${
            historical.counterweight ? `Worth holding in view as well: ${historical.counterweight}` : ''
          }`.replace(/\s+/g, ' ').trim()
        : null
    });

    if (!reflection.compliance.passed) {
      ctx.logger.error('Reflection failed the advice lint', { violations: reflection.compliance.violations });
    }

    ctx.logger.info('Generated reflection prompt', {
      pattern: input.pattern,
      event: event?.id ?? null,
      compliant: reflection.compliance.passed
    });

    return {
      ...reflection,
      confidence: input.confidence ?? null,
      driving_event: event
        ? { event_id: event.id, headline: event.headline, date: event.date, type: event.type, scope: event.scope }
        : null,
      relevance,
      historical,
      target_symbols: targets,
      affected_value: relevance?.exposure_value ?? null,
      portfolio_totals: snapshot.totals,
      next_step:
        'Present this to the user, then call log_decision_context with whatever they choose. The choice is theirs either way — proceeding is a perfectly valid outcome and must be recorded without editorialising.',
      disclaimer: DATA_DISCLAIMER
    };
  }

  @Tool({
    name: 'get_user_trade_history',
    description:
      "Look up this user's own past decisions: how many times each bias pattern has fired, how often they proceeded versus paused, and how those earlier calls turned out. Use it to make an intervention personal — \"this is the 3rd panic-sell signal on this account this month\" lands harder than any general statistic. Report the count as an observation, never as an accusation.",
    inputSchema: z.object({
      pattern: z
        .enum(['panic_sell', 'fomo_buy', 'herd_follow'])
        .optional()
        .describe('Pattern currently detected. Supplying it returns a repeat-occurrence insight for that pattern.'),
      limit: z.number().int().min(1).max(20).default(5).describe('How many recent records to return')
    }),
    examples: {
      request: { pattern: 'panic_sell' },
      response: {
        repeat_insight: 'This is the 3rd panic-sell signal on this account this month — 2 before today.',
        by_pattern_this_month: { panic_sell: 2 },
        proceeded: 3
      }
    }
  })
  async getUserTradeHistory(input: { pattern?: PatternId; limit?: number }, ctx: ExecutionContext) {
    const summary = summarizeTradeHistory(input.pattern);
    const limit = input.limit ?? 5;

    ctx.logger.info('Fetched trade history', {
      pattern: input.pattern ?? null,
      interventions: summary.interventions_all_time
    });

    return {
      ...summary,
      recent: summary.recent.slice(0, limit),
      how_to_use:
        'State the count plainly and move on. The useful observation is that a pattern is recurring, not that the user is bad at this — and note that their record includes cases where acting was the right call.',
      disclaimer: DATA_DISCLAIMER
    };
  }

  @Tool({
    name: 'simulate_wait_outcome',
    description:
      'Show what happened to a mock cohort that waited 24 hours, 7 days or 30 days instead of acting immediately, for this type of market event. Returns the favourable AND unfavourable shares together — for company-specific news, waiting historically left the cohort worse off, and that must be shown too. Use it to give a base rate for the cost of a pause, never to argue that pausing is correct.',
    inputSchema: z.object({
      event_type: z
        .string()
        .optional()
        .describe('Event driving the decision: broad_dip, sector_move, rate_decision, earnings, hype_cycle'),
      wait: z
        .enum(['24 hours', '7 days', '30 days'])
        .optional()
        .describe('Highlight one window. Omit to return all three.')
    }),
    examples: {
      request: { event_type: 'broad_dip', wait: '24 hours' },
      response: {
        headline_window: { wait: '24 hours', share_better_after_waiting: 0.58, share_worse_after_waiting: 0.42 },
        both_sides: 'Waiting left this mock cohort worse off 42%, 36%, 29% of the time.'
      }
    }
  })
  async simulateWaitOutcome(input: { event_type?: string; wait?: string }, ctx: ExecutionContext) {
    const simulation = simulateWait(input.event_type, input.wait);
    ctx.logger.info('Simulated wait outcome', { event_type: simulation.event_type, wait: input.wait ?? 'all' });

    return {
      ...simulation,
      presentation_rule:
        'Never quote share_better_after_waiting without share_worse_after_waiting in the same breath. Half of this table is the argument for acting now, and omitting it would turn a base rate into a recommendation to hold.',
      disclaimer: getWaitOutcomes()._disclaimer
    };
  }

  @Tool({
    name: 'log_decision_context',
    description:
      "Record the full context that was shown to the user and the decision they made. Call this after every intervention, whatever the outcome — including when the user proceeds anyway. This is the audit trail that makes the intervention defensible, and the research data point that makes it improvable.",
    inputSchema: z.object({
      user_intent: z.string().describe("The user's original message"),
      detected_pattern: z
        .enum(['panic_sell', 'fomo_buy', 'herd_follow', 'none'])
        .describe('Pattern detected, or "none" if no intervention was raised'),
      confidence: z.number().min(0).max(1).optional().describe('Detection confidence'),
      user_decision: z
        .enum(['proceeded', 'paused_to_reflect', 'changed_mind', 'no_intervention_needed'])
        .describe('What the user actually chose. Record it faithfully — "proceeded" is a valid and expected outcome.'),
      context_shown: z
        .record(z.any())
        .optional()
        .describe('Everything the user was shown: relevance result, historical pattern, reflection text'),
      user_note: z.string().optional().describe('Anything the user said about their reasoning')
    }),
    examples: {
      request: {
        user_intent: 'Market crashing, sell all my tech stocks now',
        detected_pattern: 'panic_sell',
        confidence: 0.92,
        user_decision: 'paused_to_reflect'
      },
      response: { decision_id: 'DEC-0001', logged: true }
    }
  })
  async logDecisionContext(
    input: {
      user_intent: string;
      detected_pattern: PatternId | 'none';
      confidence?: number;
      user_decision: DecisionLogEntry['user_decision'];
      context_shown?: Record<string, unknown>;
      user_note?: string;
    },
    ctx: ExecutionContext
  ) {
    const entry = appendDecision({
      decision_id: nextDecisionId(),
      logged_at: new Date().toISOString(),
      user_id: valuePortfolio().user_id,
      user_intent: input.user_intent,
      detected_pattern: input.detected_pattern === 'none' ? null : input.detected_pattern,
      confidence: input.confidence ?? null,
      context_shown: input.context_shown ?? {},
      user_decision: input.user_decision,
      user_note: input.user_note
    });

    ctx.logger.info('Logged decision', { id: entry.decision_id, decision: entry.user_decision });

    const all = readDecisionLog();
    const interventions = all.filter((d) => d.detected_pattern !== null);
    const paused = interventions.filter((d) => d.user_decision !== 'proceeded').length;

    return {
      logged: true,
      decision_id: entry.decision_id,
      entry,
      session_stats: {
        total_decisions: all.length,
        interventions_raised: interventions.length,
        paused_or_reconsidered: paused,
        proceeded_anyway: interventions.length - paused
      },
      acknowledgement:
        input.user_decision === 'proceeded'
          ? 'Recorded. The decision was the user\'s to make and they made it with the full context in front of them — which was the entire objective.'
          : 'Recorded, along with the context that was shown at the time.',
      disclaimer: DATA_DISCLAIMER
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Pull tickers out of free text, matching both symbols and company names in the datasets. */
function extractSymbols(text: string): string[] {
  const market = getMarketData();
  const holdings = valuePortfolio().holdings;
  const lower = text.toLowerCase();
  const found = new Set<string>();

  for (const symbol of Object.keys(market.quotes)) {
    if (new RegExp(`(?<![a-z0-9])${symbol.toLowerCase()}(?![a-z0-9])`).test(lower)) found.add(symbol);
  }
  for (const h of holdings) {
    const firstWord = h.name.split(/[\s,.]/)[0].toLowerCase();
    if (firstWord.length > 3 && lower.includes(firstWord)) found.add(h.symbol);
  }
  // Sector shorthand: "my tech stocks" should resolve to the tech holdings.
  for (const sector of new Set(holdings.map((h) => h.sector))) {
    const word = sector.split('_')[0];
    if (word.length > 2 && new RegExp(`(?<![a-z0-9])${word}(?![a-z0-9])`).test(lower)) {
      holdings.filter((h) => h.sector === sector).forEach((h) => found.add(h.symbol));
    }
  }

  return [...found];
}

/** Choose the event most likely to be driving the user's reaction. */
function pickContextEvent(pattern: PatternId, eventId?: string, symbols: string[] = []): MarketEvent | undefined {
  const market = getMarketData();

  if (eventId) {
    const found = market.events.find((e) => e.id.toLowerCase() === eventId.toLowerCase());
    if (found) return found;
  }

  const snapshot = valuePortfolio();
  const candidates = market.events.filter((e) => e.date === market.as_of);
  const pool = candidates.length ? candidates : market.events;

  if (pattern === 'fomo_buy') {
    // The thing being chased is usually not held, so rank by hype rather than by exposure.
    const named = symbols.length ? pool.filter((e) => e.affects_symbols.some((s) => symbols.includes(s))) : [];
    return (
      named.find((e) => e.type === 'hype_cycle') ??
      named[0] ??
      pool.find((e) => e.type === 'hype_cycle') ??
      pool.find((e) => e.sentiment === 'positive')
    );
  }

  const negative = pool.filter((e) => e.sentiment === 'negative');
  const ranked = (negative.length ? negative : pool)
    .map((e) => ({ e, score: scoreRelevance(e, snapshot).relevance_score }))
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.e;
}

interface HistoricalSelection {
  pattern: string;
  label: string;
  plain_language: string;
  aggregate: Record<string, unknown>;
  cases: HistoricalCase[];
  counterweight: string | null;
  matched_on: string;
}

function selectHistorical(pattern: PatternId, eventType?: string, limit = 3): HistoricalSelection {
  const groups = getHistoricalPatterns();
  const group = groups[pattern];

  const matching = eventType
    ? group.cases.filter((c) => c.event_types.some((t) => t === eventType || eventType.includes(t) || t.includes(eventType)))
    : [];

  const chosen = (matching.length ? matching : group.cases).slice(0, limit);
  const counterweight = group.cases.find((c) => typeof c.note === 'string');

  return {
    pattern,
    label: group.label,
    plain_language: group.aggregate.plain_language,
    aggregate: group.aggregate,
    cases: chosen,
    counterweight: counterweight ? (counterweight.note as string) : null,
    matched_on: eventType
      ? matching.length
        ? `event_type "${eventType}"`
        : `event_type "${eventType}" had no direct comparable — returning the full case set instead`
      : 'no event_type filter'
  };
}

function describeCase(c: HistoricalCase): string {
  const parts: string[] = [];
  if (typeof c.recovery_days === 'number') parts.push(`recovered in about ${c.recovery_days} days`);
  if (typeof c.peak_drawdown_pct === 'number') parts.push(`peak drawdown ${c.peak_drawdown_pct}%`);
  if (typeof c.panic_seller_outcome === 'string') parts.push(String(c.panic_seller_outcome).toLowerCase());
  if (typeof c.late_buyer_outcome === 'string') parts.push(String(c.late_buyer_outcome).toLowerCase());
  if (typeof c.outcome === 'string') parts.push(String(c.outcome).toLowerCase());
  return parts.join('; ') || 'see the case record for detail';
}

/** Exported for the resource layer so the operating rules and the lint stay in one place. */
export { lintForAdvice };
