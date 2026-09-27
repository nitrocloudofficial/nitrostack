/**
 * signal-validation.tools.ts — MCP Tools for Person 2.
 * Tools: check_calendar_events, correlate_historical_events, validate_claim_against_signal
 */
import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { fetchEarningsEvents, fetchEconomicEvents, detectNewsEvents } from './calendar.impl.js';
import { correlateEventsWithHistory } from './correlation.impl.js';
import { writeCalendarCheck } from './calendar-checks.resource.js';
import { readClaim }  from '../video-ingest/claims.resource.js';
import type { CalendarCheckResult } from '../video-ingest/video.types.js';

export class SignalValidationTools {
  @Tool({
    name: 'check_calendar_events',
    description:
      'Signal Validation Agent (Phase 2): Checks Finnhub for earnings dates, economic events (FOMC, CPI), ' +
      'and company news events (conferences, product launches) within ±7 days of a given date. ' +
      'Returns a list of events and whether this ticker historically moves around those event types. ' +
      'Requires FINNHUB_KEY in .env (free at finnhub.io).',
    inputSchema: z.object({
      ticker:       z.string().describe('Ticker symbol, e.g. "NVDA"'),
      center_date:  z.string().describe('ISO date to center the window on, e.g. "2026-07-27"'),
      window_days:  z.number().int().min(1).max(14).optional().describe('Days before/after to search (default 7)'),
    }),
  })
  async checkCalendarEventsTool(input: { ticker: string; center_date: string; window_days?: number }, ctx: ExecutionContext) {
    const { ticker, center_date } = input;
    const finnhubKey = process.env.FINNHUB_KEY ?? '';
    ctx.logger.info('SignalValidation: check_calendar_events', { ticker, center_date });

    if (!finnhubKey) {
      ctx.logger.warn('SignalValidation: FINNHUB_KEY not set — calendar check will return empty results');
    }

    const [earnings, macro, news] = await Promise.all([
      fetchEarningsEvents(ticker, center_date, finnhubKey),
      fetchEconomicEvents(center_date, finnhubKey),
      detectNewsEvents(ticker, center_date, finnhubKey),
    ]);

    const allEvents = [...earnings, ...macro, ...news];
    const correlation = correlateEventsWithHistory(ticker, allEvents);

    return { ticker, center_date, events_found: allEvents, ...correlation, finnhub_key_set: !!finnhubKey };
  }

  @Tool({
    name: 'correlate_historical_events',
    description:
      'Signal Validation Agent: Checks the local historical-signals.json dataset and applies ' +
      'rules-based correlation to determine how strongly a given event type has historically moved this ticker. ' +
      'Returns correlation_strength (0–1) and reasoning. Does not require any API key.',
    inputSchema: z.object({
      ticker:     z.string().describe('Ticker symbol'),
      event_type: z.string().describe('Event type: earnings | fed_meeting | cpi | product_launch | conference | other'),
    }),
  })
  async correlateHistoricalEventsTool(input: { ticker: string; event_type: string }, ctx: ExecutionContext) {
    const { ticker, event_type } = input;
    ctx.logger.info('SignalValidation: correlate_historical_events', { ticker, event_type });
    const fakeEvent = [{ type: event_type as any, date: '', source: 'query', description: event_type }];
    return { ticker, event_type, ...correlateEventsWithHistory(ticker, fakeEvent) };
  }

  @Tool({
    name: 'validate_claim_against_signal',
    description:
      'Signal Validation Agent (Phase 2, main tool): Reads a StockClaim from video://claims by video_id, ' +
      'runs check_calendar_events and historical correlation for the claimed ticker + timeframe, ' +
      'computes a calendar_alignment_score (0–30), and writes a CalendarCheckResult to ' +
      'video://calendar-checks. Call this after extract_stock_claim.',
    inputSchema: z.object({
      video_id: z.string().describe('video_id from ingest_video output'),
    }),
  })
  async validateClaimAgainstSignalTool(input: { video_id: string }, ctx: ExecutionContext) {
    const { video_id } = input;
    const finnhubKey   = process.env.FINNHUB_KEY ?? '';
    ctx.logger.info('SignalValidation: validate_claim_against_signal', { video_id });

    const claim = readClaim(video_id);
    if (!claim) {
      return { success: false, error: `No StockClaim found for video_id "${video_id}". Run extract_stock_claim first.` };
    }

    const { ticker, timeframe_iso } = claim;

    const [earnings, macro, news] = await Promise.all([
      fetchEarningsEvents(ticker, timeframe_iso, finnhubKey),
      fetchEconomicEvents(timeframe_iso, finnhubKey),
      detectNewsEvents(ticker, timeframe_iso, finnhubKey),
    ]);

    const allEvents  = [...earnings, ...macro, ...news];
    const correlation = correlateEventsWithHistory(ticker, allEvents);

    // Scoring rubric from phase2 doc:
    // Event found + strongly correlated (≥0.7) → 25–30
    // Event found + moderately correlated (0.4–0.7) → 15–24
    // Event found + no/weak correlation → 8–14
    // No event found → 0–7
    let calScore: number;
    if (allEvents.length > 0 && correlation.correlation_strength >= 0.7) {
      calScore = Math.round(25 + correlation.correlation_strength * 5);  // 25–30
    } else if (allEvents.length > 0 && correlation.correlation_strength >= 0.4) {
      calScore = Math.round(15 + (correlation.correlation_strength - 0.4) * 30); // 15–24
    } else if (allEvents.length > 0) {
      calScore = Math.round(8 + correlation.correlation_strength * 12);  // 8–14
    } else {
      calScore = Math.round(correlation.correlation_strength * 7);        // 0–7
    }
    calScore = Math.min(30, Math.max(0, calScore));

    const result: CalendarCheckResult = {
      video_id,
      ticker,
      events_in_window:         allEvents,
      historically_correlated:  correlation.historically_correlated,
      correlation_strength:     correlation.correlation_strength,
      calendar_alignment_score: calScore,
      reasoning:                correlation.reasoning,
    };

    writeCalendarCheck(result);
    ctx.logger.info('SignalValidation: wrote calendar check', { video_id, ticker, calScore, events: allEvents.length });

    return {
      success:                  true,
      video_id,
      ticker,
      calendar_alignment_score: calScore,
      events_found:             allEvents.length,
      historically_correlated:  correlation.historically_correlated,
      reasoning:                correlation.reasoning,
      next_step:                `Person 4: call aggregate_video_confidence with video_id="${video_id}" after Person 3 also completes.`,
    };
  }
}
