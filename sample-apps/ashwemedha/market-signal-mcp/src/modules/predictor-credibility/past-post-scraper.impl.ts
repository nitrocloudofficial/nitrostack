/**
 * past-post-scraper.impl.ts — Extract past stock predictions from social media posts using Groq.
 */
import OpenAI from 'openai';
import type { PastPrediction } from '../video-ingest/video.types.js';

export async function extractPastPredictionsFromPosts(
  posts: string[],
  groqKey: string
): Promise<PastPrediction[]> {
  if (!groqKey || posts.length === 0) return [];

  const groq   = new OpenAI({ apiKey: groqKey, baseURL: 'https://api.groq.com/openai/v1' });
  const sample = posts.slice(0, 30); // cap to avoid token limits
  const today  = new Date().toISOString().split('T')[0];

  const prompt = `Extract all stock predictions from these social media posts.
TODAY: ${today}

POSTS:
${sample.map((p, i) => `[${i + 1}] ${p}`).join('\n')}

Respond ONLY with a valid JSON object: { "predictions": [ ... ] }
Each prediction has this exact shape:
{
  "date_made": "YYYY-MM-DD (use today if unknown)",
  "ticker": "UPPERCASE TICKER",
  "direction": "up | down",
  "timeframe_iso": "YYYY-MM-DD (absolute date)",
  "outcome": "pending",
  "evidence_url": ""
}

Rules:
- Only include posts with a SPECIFIC ticker and direction claim.
- Skip vague posts ("market looks good"), jokes, and news summaries.
- If no predictions found, return { "predictions": [] }.
- direction must be exactly "up" or "down".
- timeframe_iso must be an absolute date.`;

  try {
    const res = await groq.chat.completions.create({
      model:           'llama-3.3-70b-versatile',
      max_tokens:      2048,
      temperature:     0.1,
      response_format: { type: 'json_object' },
      messages:        [{ role: 'user', content: prompt }],
    });
    const parsed = JSON.parse(res.choices[0].message.content ?? '{}');
    return (parsed.predictions as PastPrediction[] | undefined) ?? [];
  } catch { return []; }
}
