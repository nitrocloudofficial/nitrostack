/**
 * correlation.impl.ts — Historical event correlation check.
 * Checks historical-signals.json for matching patterns + applies rules-based heuristics.
 */
import * as fs   from 'fs';
import * as path from 'path';
import type { CalendarEvent } from '../video-ingest/video.types.js';

const HIST_PATH = path.join(process.cwd(), 'src', 'data', 'historical-signals.json');

// Rules-based baseline correlations for when historical data is sparse
const BASE_CORRELATION: Record<string, number> = {
  earnings:       0.78,  // earnings almost always move stocks
  fed_meeting:    0.55,  // Fed affects market broadly, less so individual stocks
  cpi:            0.45,
  product_launch: 0.60,
  conference:     0.55,
  other:          0.35,
};

export interface CorrelationResult {
  historically_correlated: boolean;
  correlation_strength:    number;   // 0–1
  sample_size:             number;
  reasoning:               string;
}

export function correlateEventsWithHistory(
  ticker: string,
  events: CalendarEvent[]
): CorrelationResult {
  if (events.length === 0) {
    return { historically_correlated: false, correlation_strength: 0, sample_size: 0, reasoning: 'No calendar events found near the prediction date.' };
  }

  // Check historical-signals.json for ticker-specific data
  let historicalMatches = 0;
  let avgHistoricalScore = 0;

  try {
    if (fs.existsSync(HIST_PATH)) {
      const histData = JSON.parse(fs.readFileSync(HIST_PATH, 'utf-8'));
      const tickerData: any[] = histData[ticker] ?? [];
      if (tickerData.length > 0) {
        historicalMatches = tickerData.length;
        avgHistoricalScore = tickerData.reduce((sum: number, e: any) => sum + (e.signal_score ?? 50), 0) / tickerData.length;
      }
    }
  } catch { /* historical data is optional */ }

  // Pick the strongest event type's base correlation
  const primaryEvent   = events[0];
  const baseStrength   = BASE_CORRELATION[primaryEvent.type] ?? 0.35;

  // Blend with historical data if available
  let finalStrength: number;
  if (historicalMatches >= 3) {
    // Weighted blend: 40% historical, 60% rule-based
    const historicalStrength = avgHistoricalScore / 100;
    finalStrength = 0.6 * baseStrength + 0.4 * historicalStrength;
  } else {
    finalStrength = baseStrength;
  }

  const correlated = finalStrength >= 0.45;
  const eventNames = events.map(e => e.description).join('; ');

  return {
    historically_correlated: correlated,
    correlation_strength:    Math.round(finalStrength * 100) / 100,
    sample_size:             historicalMatches,
    reasoning: correlated
      ? `${ticker} has historically moved around ${primaryEvent.type} events (correlation: ${Math.round(finalStrength * 100)}%). ` +
        `Events found: ${eventNames}.` +
        (historicalMatches > 0 ? ` Supported by ${historicalMatches} historical pattern(s) in the dataset.` : '')
      : `No strong historical pattern found for ${ticker} around ${primaryEvent.type} events. Event exists but correlation is weak.`,
  };
}
