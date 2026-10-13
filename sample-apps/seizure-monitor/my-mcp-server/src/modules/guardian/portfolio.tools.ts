import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import { DATA_DISCLAIMER, getMarketData } from './guardian.store.js';
import { scoreRelevance, valuePortfolio } from './guardian.logic.js';

export class PortfolioTools {
  @Tool({
    name: 'get_portfolio_snapshot',
    description:
      "Get the user's current holdings: quantities, cost basis, live value, unrealised gain/loss, position weights and sector breakdown. Optionally includes today's market events already scored for how much they actually affect this specific portfolio. Call this first for almost any question about the user's money — every other tool reasons against this snapshot.",
    inputSchema: z.object({
      include_news: z
        .boolean()
        .default(true)
        .describe('Include the relevance-scored market event feed for this portfolio'),
      news_limit: z.number().int().min(1).max(20).default(5).describe('How many scored events to return')
    }),
    examples: {
      request: { include_news: true, news_limit: 3 },
      response: {
        totals: { total_value: 25711.16, unrealized_gain_pct: 12.4, day_change_pct: -2.9 },
        holdings: [{ symbol: 'AAPL', quantity: 12, market_value: 2834.16, weight_of_total: 0.1102 }],
        relevant_events: [{ event_id: 'E2', relevance_band: 'high', exposure_pct_of_portfolio: 0.392 }]
      }
    }
  })
  @Widget('portfolio-dashboard')
  async getPortfolioSnapshot(
    input: { include_news?: boolean; news_limit?: number },
    ctx: ExecutionContext
  ) {
    const snapshot = valuePortfolio();
    ctx.logger.info('Built portfolio snapshot', {
      holdings: snapshot.holdings.length,
      total_value: snapshot.totals.total_value
    });

    const includeNews = input.include_news ?? true;
    const limit = input.news_limit ?? 5;

    const relevantEvents = includeNews
      ? getMarketData()
          .events.map((event) => scoreRelevance(event, snapshot))
          .sort((a, b) => b.relevance_score - a.relevance_score)
          .slice(0, limit)
      : [];

    return {
      ...snapshot,
      relevant_events: relevantEvents,
      news_note: includeNews
        ? 'Events are ranked by how much of THIS portfolio they touch, not by how loud the headline is. Anything in the "noise" band is not about this user.'
        : 'News feed omitted by request.',
      disclaimer: DATA_DISCLAIMER
    };
  }

  @Tool({
    name: 'get_position_thesis',
    description:
      "Retrieve the reason the user originally recorded for owning a position, plus their stated goal and time horizon. Use this when a reflection needs to point back at the user's own words rather than at generic advice — it is the strongest material available for a cooling-off question.",
    inputSchema: z.object({
      symbols: z
        .array(z.string())
        .optional()
        .describe('Ticker symbols to look up. Omit to return the thesis for every holding.')
    })
  })
  async getPositionThesis(input: { symbols?: string[] }, ctx: ExecutionContext) {
    const snapshot = valuePortfolio();
    const wanted = input.symbols?.map((s) => s.toUpperCase());

    const positions = snapshot.holdings
      .filter((h) => !wanted || wanted.includes(h.symbol))
      .map((h) => ({
        symbol: h.symbol,
        name: h.name,
        purchase_date: h.purchase_date,
        original_thesis: h.thesis,
        avg_price: h.avg_price,
        current_price: h.current_price,
        unrealized_gain_pct: h.unrealized_gain_pct,
        weight_of_total: h.weight_of_total
      }));

    ctx.logger.info('Fetched position theses', { count: positions.length });

    return {
      stated_goal: snapshot.profile.stated_goal,
      stated_horizon_years: snapshot.profile.stated_horizon_years,
      positions,
      unknown_symbols: wanted?.filter((s) => !snapshot.holdings.some((h) => h.symbol === s)) ?? [],
      usage_note:
        "Quote the user's own recorded reason back to them. The question is whether that reason has changed, not whether the price has.",
      disclaimer: DATA_DISCLAIMER
    };
  }
}
