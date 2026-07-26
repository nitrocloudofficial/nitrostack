/**
 * claim-extraction.impl.ts — Extract structured StockClaim from transcript using Groq LLaMA.
 * Uses llama-3.3-70b-versatile (free on Groq) with JSON mode for reliable structured output.
 * Validates extracted ticker against Alpha Vantage SYMBOL_SEARCH.
 */
import OpenAI from 'openai';
import axios  from 'axios';
import type { VideoManifest, StockClaim, RejectedClaim, VideoPlatform } from './video.types.js';

async function validateTickerWithAV(ticker: string, avKey: string): Promise<{ symbol: string; name: string } | null> {
  try {
    const r = await axios.get('https://www.alphavantage.co/query', {
      params: { function: 'SYMBOL_SEARCH', keywords: ticker, apikey: avKey },
      timeout: 6_000,
    });
    const matches: any[] = r.data?.bestMatches ?? [];
    const exact = matches.find(m => (m['1. symbol'] as string).toUpperCase() === ticker.toUpperCase());
    if (exact)           return { symbol: exact['1. symbol'], name: exact['2. name'] };
    if (matches.length)  return { symbol: matches[0]['1. symbol'], name: matches[0]['2. name'] };
    return null;
  } catch { return null; }
}

function buildExtractionPrompt(manifest: VideoManifest): string {
  const today = new Date().toISOString().split('T')[0];
  return `You are analyzing a stock prediction video transcript. Extract the prediction as JSON.

TODAY: ${today}
PLATFORM: ${manifest.platform}
CHANNEL: ${manifest.channel_name ?? 'Unknown'} (${manifest.channel_handle ?? ''})
POSTED: ${manifest.posted_at ?? 'Unknown'}
TITLE: ${manifest.title ?? ''}

TRANSCRIPT:
"""
${manifest.transcript || '[No transcript — video may have no speech]'}
"""

Respond ONLY with a valid JSON object (no markdown) matching this exact shape:
{
  "ticker": "e.g. NVDA",
  "company_name": "e.g. NVIDIA",
  "direction": "up | down | neutral",
  "timeframe_iso": "YYYY-MM-DD absolute date",
  "timeframe_hint_raw": "what they literally said e.g. tomorrow",
  "reason_given": "one sentence reason",
  "predictor_name": "channel display name",
  "predictor_handle": "@handle",
  "extraction_confidence": "high | medium | low",
  "transcript_evidence": "verbatim quote from transcript"
}

If NO stock prediction exists (joke, satire, vague, no specific ticker) respond ONLY with:
{ "not_a_stock_prediction": true, "reason": "explanation" }

RULES: direction must be exactly up/down/neutral. timeframe_iso must be an absolute date. If no timeframe given, use ${new Date(Date.now() + 86400000).toISOString().split('T')[0]}. NEVER invent a ticker.`;
}

export async function extractStockClaim(
  manifest: VideoManifest,
  groqKey: string,
  avKey: string
): Promise<StockClaim | RejectedClaim> {
  if (!groqKey) return { video_id: manifest.video_id, rejected_reason: 'GROQ_API_KEY not set.' };
  if (!manifest.transcript || manifest.transcript.trim().length < 20) {
    return { video_id: manifest.video_id, rejected_reason: 'Transcript too short to extract a claim.' };
  }

  let parsed: any;
  try {
    const groq = new OpenAI({ apiKey: groqKey, baseURL: 'https://api.groq.com/openai/v1' });
    const res = await groq.chat.completions.create({
      model:           'llama-3.3-70b-versatile',
      max_tokens:      1024,
      temperature:     0.1,
      response_format: { type: 'json_object' },
      messages:        [{ role: 'user', content: buildExtractionPrompt(manifest) }],
    });
    parsed = JSON.parse(res.choices[0].message.content ?? '{}');
  } catch (err: any) {
    return { video_id: manifest.video_id, rejected_reason: `Groq API error: ${err.message}` };
  }

  if (parsed.not_a_stock_prediction) {
    return { video_id: manifest.video_id, rejected_reason: `Not a stock prediction: ${parsed.reason ?? ''}` };
  }

  const rawTicker = (parsed.ticker as string | undefined)?.toUpperCase()?.trim();
  if (!rawTicker) {
    return { video_id: manifest.video_id, rejected_reason: 'No ticker identified from transcript.' };
  }

  let canonicalTicker = rawTicker;
  let canonicalName   = (parsed.company_name as string | undefined) ?? rawTicker;
  let confidence      = parsed.extraction_confidence as string | undefined;

  if (avKey) {
    const resolved = await validateTickerWithAV(rawTicker, avKey);
    if (!resolved) { confidence = 'low'; }
    else { canonicalTicker = resolved.symbol; canonicalName = resolved.name; }
  }

  return {
    video_id:              manifest.video_id,
    ticker:                canonicalTicker,
    company_name:          canonicalName,
    direction:             (['up','down','neutral'].includes(parsed.direction) ? parsed.direction : 'neutral') as StockClaim['direction'],
    timeframe_iso:         parsed.timeframe_iso ?? new Date(Date.now()+86400_000).toISOString().split('T')[0],
    timeframe_hint_raw:    parsed.timeframe_hint_raw ?? '',
    reason_given:          parsed.reason_given,
    predictor_name:        (parsed.predictor_name as string|undefined) ?? manifest.channel_name ?? 'Unknown',
    predictor_handle:      (parsed.predictor_handle as string|undefined) ?? manifest.channel_handle ?? '@unknown',
    platform:              manifest.platform as VideoPlatform,
    extraction_confidence: (['high','medium','low'].includes(confidence ?? '') ? confidence : 'low') as StockClaim['extraction_confidence'],
    transcript_evidence:   (parsed.transcript_evidence as string|undefined) ?? '',
  };
}
