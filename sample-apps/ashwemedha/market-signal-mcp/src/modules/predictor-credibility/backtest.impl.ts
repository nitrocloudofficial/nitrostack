/**
 * backtest.impl.ts — Fetch historical prices via Yahoo Finance and compute prediction accuracy.
 * No API key required — uses Yahoo Finance public chart endpoint.
 */
import axios from 'axios';
import type { PastPrediction } from '../video-ingest/video.types.js';

async function fetchClosePriceOnDate(ticker: string, dateIso: string): Promise<number | null> {
  try {
    const targetMs  = new Date(dateIso).getTime();
    const fromEpoch = Math.floor(targetMs / 1000) - 86400 * 5; // 5 days before to handle weekends
    const toEpoch   = Math.floor(targetMs / 1000) + 86400 * 2;

    const r = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`,
      {
        params:  { period1: fromEpoch, period2: toEpoch, interval: '1d' },
        timeout: 8_000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      }
    );

    const timestamps: number[] = r.data?.chart?.result?.[0]?.timestamp ?? [];
    const closes: number[]     = r.data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
    if (!timestamps.length) return null;

    // Find the closest trading day on or before target date
    let best: { delta: number; close: number } | null = null;
    for (let i = 0; i < timestamps.length; i++) {
      const delta = targetMs / 1000 - timestamps[i];
      if (delta >= 0 && closes[i] != null && (best === null || delta < best.delta)) {
        best = { delta, close: closes[i] };
      }
    }
    return best?.close ?? null;
  } catch { return null; }
}

export interface BacktestResult {
  scored_predictions: Array<PastPrediction & { actual_return_pct?: number }>;
  accuracy_rate:      number;    // 0–1
  sample_size:        number;
  correct:            number;
  incorrect:          number;
  unclear:            number;
}

export async function backtestPredictions(
  ticker: string,
  predictions: PastPrediction[]
): Promise<BacktestResult> {
  const settled = predictions.filter(p => p.ticker.toUpperCase() === ticker.toUpperCase());
  const scored: Array<PastPrediction & { actual_return_pct?: number }> = [];

  for (const pred of settled) {
    const entryClose  = await fetchClosePriceOnDate(pred.ticker, pred.date_made);
    const targetClose = await fetchClosePriceOnDate(pred.ticker, pred.timeframe_iso);

    if (!entryClose || !targetClose) {
      scored.push({ ...pred, outcome: 'unclear' });
      continue;
    }

    const returnPct = ((targetClose - entryClose) / entryClose) * 100;
    let outcome: PastPrediction['outcome'];
    if      (pred.direction === 'up'   && returnPct >=  2) outcome = 'correct';
    else if (pred.direction === 'down' && returnPct <= -2) outcome = 'correct';
    else if (Math.abs(returnPct) < 2)                      outcome = 'unclear';
    else                                                    outcome = 'incorrect';

    scored.push({ ...pred, outcome, actual_return_pct: Math.round(returnPct * 100) / 100 });
  }

  const correct   = scored.filter(p => p.outcome === 'correct').length;
  const incorrect = scored.filter(p => p.outcome === 'incorrect').length;
  const unclear   = scored.filter(p => p.outcome === 'unclear' || p.outcome === 'pending').length;
  const denom     = correct + incorrect;
  const accuracy  = denom > 0 ? correct / denom : 0;

  return {
    scored_predictions: scored,
    accuracy_rate:      Math.round(accuracy * 1000) / 1000,
    sample_size:        scored.length,
    correct,
    incorrect,
    unclear,
  };
}
