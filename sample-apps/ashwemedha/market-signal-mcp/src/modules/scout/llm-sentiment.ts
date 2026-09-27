/**
 * llm-sentiment.ts — LLM-backed sentiment fallback via Groq
 *
 * Used when the rule-based lexicon scorer has low confidence (≤1 keyword match
 * and |score| < 0.15). Sends all low-confidence headlines in a single batched
 * request to minimise latency and API usage.
 *
 * Graceful degradation: if the LLM call fails or times out, callers keep the
 * lexicon score rather than returning neutral.
 */

import OpenAI from 'openai';

let _client: OpenAI | null = null;

function getClient(): OpenAI | null {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  if (!_client) {
    _client = new OpenAI({ apiKey: key, baseURL: 'https://api.groq.com/openai/v1' });
  }
  return _client;
}

export interface LlmSentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
}

/**
 * Score a batch of headlines via Groq LLM.
 * Returns a Map from headline text → { sentiment, score }.
 * Returns an empty Map on any failure (timeout, parse error, missing key).
 */
export async function llmScoreSentiment(
  headlines: string[],
): Promise<Map<string, LlmSentimentResult>> {
  const results = new Map<string, LlmSentimentResult>();
  if (headlines.length === 0) return results;

  const client = getClient();
  if (!client) return results;

  const numbered = headlines.map((h, i) => `${i + 1}. "${h}"`).join('\n');

  const prompt = `You are a financial news sentiment analyzer. Score each headline from -1.0 (very negative) to +1.0 (very positive).

Headlines:
${numbered}

Return a JSON array with one object per headline:
[{"i":0,"s":-0.6,"l":"negative"},{"i":1,"s":0.05,"l":"neutral"}]

Where:
- i = headline index (0-based)
- s = score from -1.0 to +1.0
- l = label: "positive", "negative", or "neutral"

Return ONLY the JSON array. No other text.`;

  try {
    const response = await client.chat.completions.create(
      {
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 256,
      },
      { timeout: 5000 },
    );

    const raw = response.choices?.[0]?.message?.content?.trim() ?? '';
    // Strip markdown code fences if present
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const parsed = JSON.parse(jsonStr) as Array<{ i: number; s: number; l: string }>;

    for (const item of parsed) {
      const idx = item.i;
      if (idx < 0 || idx >= headlines.length) continue;
      const score = Math.max(-1, Math.min(1, Number(item.s) || 0));
      const label = String(item.l).toLowerCase();
      const sentiment: 'positive' | 'negative' | 'neutral' =
        label === 'positive' ? 'positive' : label === 'negative' ? 'negative' : 'neutral';
      results.set(headlines[idx], { sentiment, score });
    }
  } catch {
    // LLM unavailable or response unparseable — return empty, callers keep lexicon score
  }

  return results;
}
