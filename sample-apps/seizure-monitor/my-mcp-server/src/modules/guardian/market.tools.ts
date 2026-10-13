import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { DATA_DISCLAIMER, MarketEvent, getHerdSentiment, getMarketData } from './guardian.store.js';
import { readHerdSentiment, scoreRelevance, valuePortfolio } from './guardian.logic.js';

export class MarketTools {
  @Tool({
    name: 'get_market_context',
    description:
      "Get what has actually happened in the market: index and sector moves, live quotes for the user's holdings, and the recent event feed. Use this to establish whether a move is market-wide, sector-level or specific to one company — that distinction is the single most useful fact when someone is reacting to a price drop.",
    inputSchema: z.object({
      symbols: z.array(z.string()).optional().describe('Restrict the event feed to these tickers'),
      sectors: z.array(z.string()).optional().describe('Restrict the event feed to these sectors'),
      since: z.string().optional().describe('ISO date (YYYY-MM-DD). Only return events on or after this date.'),
      include_noise: z
        .boolean()
        .default(true)
        .describe('Include events that do not touch the portfolio at all. Set false to see signal only.'),
      limit: z.number().int().min(1).max(20).default(8).describe('Maximum events to return')
    }),
    examples: {
      request: { include_noise: false, limit: 3 },
      response: {
        market_summary: 'Broad risk-off session. NASDAQ -3.9%, tech -4.6%, healthcare +1.1%.',
        events: [{ event_id: 'E2', headline: 'Megacap tech and semiconductors lead the selloff', relevance_band: 'high' }]
      }
    }
  })
  async getMarketContext(
    input: { symbols?: string[]; sectors?: string[]; since?: string; include_noise?: boolean; limit?: number },
    ctx: ExecutionContext
  ) {
    const market = getMarketData();
    const snapshot = valuePortfolio();
    const symbols = input.symbols?.map((s) => s.toUpperCase());
    const includeNoise = input.include_noise ?? true;
    const limit = input.limit ?? 8;

    let events: MarketEvent[] = market.events;
    if (input.since) events = events.filter((e) => e.date >= input.since!);
    if (symbols) events = events.filter((e) => e.affects_symbols.some((s) => symbols.includes(s)));
    if (input.sectors) {
      events = events.filter((e) => e.affects_sectors.some((s) => input.sectors!.includes(s) || s === 'all'));
    }

    const scored = events
      .map((event) => ({ event, relevance: scoreRelevance(event, snapshot) }))
      .filter(({ relevance }) => includeNoise || relevance.relevance_band !== 'noise')
      .sort((a, b) => b.relevance.relevance_score - a.relevance.relevance_score || b.event.date.localeCompare(a.event.date))
      .slice(0, limit);

    ctx.logger.info('Built market context', { returned: scored.length, of: market.events.length });

    const heldQuotes = Object.fromEntries(
      snapshot.holdings.map((h) => [h.symbol, market.quotes[h.symbol]]).filter(([, q]) => Boolean(q))
    );

    const worstSector = Object.entries(market.sector_moves).sort((a, b) => a[1] - b[1])[0];
    const bestSector = Object.entries(market.sector_moves).sort((a, b) => b[1] - a[1])[0];
    const breadth = Object.values(market.sector_moves).filter((m) => m < 0).length;
    const totalSectors = Object.values(market.sector_moves).length;

    return {
      as_of: market.as_of,
      market_summary: `S&P 500 ${fmtPct(market.indices.SP500.day_change_pct)}, NASDAQ ${fmtPct(
        market.indices.NASDAQ.day_change_pct
      )} on the day. Weakest sector: ${worstSector[0]} ${fmtPct(worstSector[1])}. Strongest: ${bestSector[0]} ${fmtPct(
        bestSector[1]
      )}.`,
      breadth_note:
        breadth >= totalSectors - 1
          ? 'Almost every sector is down together, which points at a macro driver rather than at anything happening inside individual companies.'
          : `${breadth} of ${totalSectors} tracked sectors are down, while ${Object.entries(market.sector_moves)
              .filter(([, m]) => m > 0)
              .map(([s]) => s)
              .join(' and ')} are up. So this is money rotating between sectors rather than every asset falling at once — worth knowing before treating it as a market-wide crash.`,
      indices: market.indices,
      sector_moves: market.sector_moves,
      quotes_for_holdings: heldQuotes,
      portfolio_day_change_pct: snapshot.totals.day_change_pct,
      portfolio_day_change_value: snapshot.totals.day_change_value,
      events: scored.map(({ event, relevance }) => ({
        event_id: event.id,
        date: event.date,
        type: event.type,
        scope: event.scope,
        headline: event.headline,
        summary: event.summary,
        sentiment: event.sentiment,
        flags: event.flags ?? [],
        relevance_band: relevance.relevance_band,
        relevance_score: relevance.relevance_score,
        driver: relevance.driver,
        exposure_pct_of_portfolio: relevance.exposure_pct_of_portfolio,
        affected_symbols: relevance.affected_holdings.map((h) => h.symbol),
        plain_language: relevance.explanation
      })),
      filtered_out_as_noise: includeNoise
        ? undefined
        : market.events.length - scored.length,
      disclaimer: DATA_DISCLAIMER
    };
  }

  @Tool({
    name: 'check_relevance_score',
    description:
      'Layer A of the guardian. Work out whether a specific market event actually touches this portfolio, by how much, and why — returning an exposure percentage, the affected holdings, and whether the move is broad-market, sector-level or company-specific. Use this before any intervention: a broad dip and genuinely bad company news deserve completely different conversations.',
    inputSchema: z.object({
      event_id: z.string().optional().describe('ID of an event from get_market_context, e.g. "E2"'),
      headline: z.string().optional().describe('Ad-hoc event headline, when the user pastes news that is not in the feed'),
      affects_sectors: z
        .array(z.string())
        .optional()
        .describe('Sectors the ad-hoc event touches. Use ["all"] for a market-wide move.'),
      affects_symbols: z.array(z.string()).optional().describe('Tickers the ad-hoc event names directly'),
      scope: z
        .enum(['market_wide', 'macro', 'sector', 'company', 'other_asset_class'])
        .optional()
        .describe('Breadth of the ad-hoc event')
    }),
    examples: {
      request: { event_id: 'E2' },
      response: {
        relevance_band: 'high',
        driver: 'sector',
        is_company_specific: false,
        exposure_pct_of_portfolio: 0.392,
        explanation: 'This touches 3 of your 7 holdings (AAPL, MSFT, NVDA) — 39.2% of your total value.'
      }
    }
  })
  async checkRelevanceScore(
    input: {
      event_id?: string;
      headline?: string;
      affects_sectors?: string[];
      affects_symbols?: string[];
      scope?: string;
    },
    ctx: ExecutionContext
  ) {
    const market = getMarketData();
    const snapshot = valuePortfolio();

    let event: MarketEvent | undefined;

    if (input.event_id) {
      event = market.events.find((e) => e.id.toLowerCase() === input.event_id!.toLowerCase());
      if (!event) {
        throw new Error(
          `Unknown event_id "${input.event_id}". Known events: ${market.events.map((e) => e.id).join(', ')}. To score news that is not in the feed, pass headline + affects_sectors/affects_symbols instead.`
        );
      }
    } else if (input.headline) {
      event = {
        id: 'AD-HOC',
        date: market.as_of,
        type: 'ad_hoc',
        scope: input.scope ?? (input.affects_symbols?.length ? 'company' : 'sector'),
        headline: input.headline,
        summary: 'Ad-hoc event supplied at call time rather than drawn from the event feed.',
        affects_sectors: input.affects_sectors ?? [],
        affects_symbols: (input.affects_symbols ?? []).map((s) => s.toUpperCase()),
        sentiment: 'neutral'
      };
    } else {
      throw new Error('Provide either event_id, or headline plus affects_sectors / affects_symbols.');
    }

    const relevance = scoreRelevance(event, snapshot);
    ctx.logger.info('Scored relevance', {
      event: event.id,
      band: relevance.relevance_band,
      exposure: relevance.exposure_pct_of_portfolio
    });

    return {
      ...relevance,
      scope: event.scope,
      sentiment: event.sentiment,
      portfolio_total_value: snapshot.totals.total_value,
      unaffected_holdings: snapshot.holdings
        .filter((h) => !relevance.affected_holdings.some((a) => a.symbol === h.symbol))
        .map((h) => ({ symbol: h.symbol, sector: h.sector, weight_of_total: h.weight_of_total })),
      interpretation_guide:
        'A high band means a lot of this portfolio is exposed. It does NOT mean anything should be done about it. Pair this with driver: broad_market and sector moves say nothing about the individual businesses, while company_specific news can genuinely change the reason for owning a position.',
      disclaimer: DATA_DISCLAIMER
    };
  }

  @Tool({
    name: 'get_herd_sentiment',
    description:
      'Quantify what the crowd is doing right now: the share of orders on each side over 24 hours, mention volume and how far above normal it is, plus a market-wide fear/greed reading. Use it when the user cites what other people are doing, so "everyone is selling" becomes a number they can look at. Crowd direction is descriptive only — it is never evidence that the crowd is right, and inverting it into a contrarian call is just as much a recommendation as following it.',
    inputSchema: z.object({
      symbols: z
        .array(z.string())
        .optional()
        .describe('Tickers to look up. Omit to return every symbol with crowd data.')
    }),
    examples: {
      request: { symbols: ['QBITX'] },
      response: {
        crowd_summary: 'QBITX (82% buying) is heavily one-directional right now. Sentiment reads fear at 22/100.',
        symbols: [{ symbol: 'QBITX', crowding: 'crowded', dominant_side: 'buying', mention_change_pct: 940 }]
      }
    }
  })
  async getHerdSentiment(input: { symbols?: string[] }, ctx: ExecutionContext) {
    const reading = readHerdSentiment(input.symbols);
    ctx.logger.info('Read herd sentiment', {
      symbols: reading.symbols.length,
      crowded: reading.symbols.filter((s) => s.crowding === 'crowded').map((s) => s.symbol)
    });

    return {
      ...reading,
      held_vs_not:
        'The "held" flag marks names already in the portfolio. Crowd activity in a name the user does not own only matters if they are about to buy it.',
      compliance_note: getHerdSentiment()._compliance_note,
      disclaimer: DATA_DISCLAIMER
    };
  }
}

function fmtPct(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}
