/**
 * narrative-builder.impl.ts — Build a human-readable reasoning narrative using Groq LLaMA.
 * Falls back to a template-based narrative if GROQ_API_KEY is not set.
 */
import OpenAI from 'openai';
import type {
  StockClaim,
  CalendarCheckResult,
  PredictorProfile,
  VideoVerdict,
} from '../video-ingest/video.types.js';

function templateNarrative(
  claim: StockClaim,
  band: VideoVerdict['band'],
  finalScore: number,
  calendar: CalendarCheckResult | null,
  predictor: PredictorProfile | null
): string {
  const direction   = claim.direction === 'up' ? 'bullish' : claim.direction === 'down' ? 'bearish' : 'neutral';
  const calendarStr = calendar?.events_in_window.length
    ? `${calendar.events_in_window.length} calendar event(s) found (${calendar.events_in_window.map(e => e.type).join(', ')}), calendar alignment score ${calendar.calendar_alignment_score}/30.`
    : 'No significant calendar events found near the prediction date.';
  const predictorStr = predictor
    ? `${predictor.handle} has ${predictor.follower_count?.toLocaleString() ?? 'unknown'} followers on ${predictor.platform}` +
      (predictor.accuracy_rate != null ? ` with ${Math.round(predictor.accuracy_rate * 100)}% historical accuracy over ${predictor.sample_size} tracked predictions.` : '.')
    : 'Predictor profile data unavailable.';

  return (
    `${band} confidence signal (${finalScore}/100). ` +
    `${predictor?.handle ?? claim.predictor_handle} is ${direction} on $${claim.ticker} by ${claim.timeframe_iso}. ` +
    `Reason given: "${claim.reason_given ?? 'not stated'}". ` +
    calendarStr + ' ' +
    predictorStr
  );
}

export async function buildNarrative(
  claim: StockClaim,
  band: VideoVerdict['band'],
  finalScore: number,
  breakdown: VideoVerdict['breakdown'],
  calendar: CalendarCheckResult | null,
  predictor: PredictorProfile | null,
  groqKey: string
): Promise<string> {
  // Always generate template; if Groq is available enhance it
  const template = templateNarrative(claim, band, finalScore, calendar, predictor);

  if (!groqKey) return template;

  const calendarSummary  = calendar
    ? `Events: ${calendar.events_in_window.map(e => `${e.type} on ${e.date}`).join(', ') || 'none'}. ` +
      `Calendar alignment score: ${calendar.calendar_alignment_score}/30.`
    : 'No calendar data.';

  const predictorSummary = predictor
    ? `Handle: ${predictor.handle}. Followers: ${predictor.follower_count ?? 'unknown'}. ` +
      `Accuracy: ${predictor.accuracy_rate != null ? Math.round(predictor.accuracy_rate * 100) + '%' : 'unknown'} ` +
      `over ${predictor.sample_size} backtested predictions. ` +
      `Predictor score: ${predictor.predictor_score}/25, Platform score: ${predictor.platform_score}/10.`
    : 'No predictor profile data.';

  const prompt = `You are a financial signal analyst. Write a concise 2-3 sentence reasoning narrative for this stock prediction signal.

SIGNAL DETAILS:
- Ticker: ${claim.ticker} (${claim.company_name})
- Direction: ${claim.direction.toUpperCase()}
- Timeframe: ${claim.timeframe_iso}
- Confidence Band: ${band} (${finalScore}/100)
- Score Breakdown: Signal=${breakdown.signal_score}/35, Calendar=${breakdown.calendar_alignment}/30, Predictor=${breakdown.predictor_accuracy}/25, Platform=${breakdown.platform_authority}/10
- Reason given by predictor: "${claim.reason_given ?? 'not stated'}"
- Transcript evidence: "${claim.transcript_evidence}"
- Extraction confidence: ${claim.extraction_confidence}

CALENDAR DATA: ${calendarSummary}
PREDICTOR DATA: ${predictorSummary}

Write a factual, objective 2-3 sentence summary. State the prediction, the key supporting evidence, and one risk factor. Do not use hype language. Output plain text only.`;

  try {
    const groq = new OpenAI({ apiKey: groqKey, baseURL: 'https://api.groq.com/openai/v1' });
    const res  = await groq.chat.completions.create({
      model:       'llama-3.3-70b-versatile',
      max_tokens:  300,
      temperature: 0.3,
      messages:    [{ role: 'user', content: prompt }],
    });
    return res.choices[0].message.content?.trim() ?? template;
  } catch { return template; }
}
