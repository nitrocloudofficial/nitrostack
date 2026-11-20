/**
 * Copyright 2025 Nitrostack Inc
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Server-owned ceilings. Team administrators can tune their review thresholds up to these
 * values, but no policy edit or human approval can exceed them.
 */
export const HARD_LIMITS = {
  /** People reached across all of a team's live messages. */
  totalReach: 1_000_000,
  /** Recipients of a single campaign. */
  campaignRecipients: 50_000,
  /** Top of the slang scale computed by the tone scorer. */
  slangScale: 10,
} as const;

export const CHANNELS = ['chat', 'email', 'social', 'press'] as const;
export const VOICES = ['professional', 'friendly', 'playful', 'street'] as const;
/** `direct` is one customer, `public` is followers, `official` speaks for the company. */
export const AUDIENCES = ['direct', 'public', 'official'] as const;
export const MESSAGE_TYPES = ['reply', 'post', 'campaign'] as const;

/**
 * How posts on the official audience are treated. They always need at least human review;
 * a team can be restricted further to `deny`.
 */
export const OFFICIAL_POST_MODES = ['review', 'deny'] as const;

// ---------------------------------------------------------------------------
// Tone scorer vocabulary
// The guardrail measures the text itself; it never trusts the agent's description of it.
// ---------------------------------------------------------------------------

/** Each distinct term found adds one point of slang, up to {@link HARD_LIMITS.slangScale}. */
export const SLANG_TERMS = [
  'hey', 'awesome', 'super', 'totally', 'legit', 'hype', 'squad', 'vibes', 'vibe',
  'gonna', 'wanna', "y'all", "ain't", 'yo', 'fam', 'lit', 'fire', 'no cap', 'bussin',
  'drip', 'bet', 'fr', 'lowkey', 'highkey', 'sheesh', 'dope', 'homie', 'finna', 'slaps',
  'goat', 'rizz', 'bars', 'straight up', 'real talk', 'on god',
] as const;

/** Any of these blocks a message outright (code-owned floor). */
export const PROFANITY_TERMS = ['damn', 'hell', 'crap', 'wtf', 'shit', 'fuck', 'ass', 'bs'] as const;

/** Commitments an agent must never make in writing, in any voice (code-owned floor). */
export const PROMISE_PHRASES = [
  'guaranteed refund', 'full refund', 'money back', 'we guarantee', 'we promise',
  'free for life', 'compensation', 'legally binding',
] as const;

/** Lowest slang score of each voice, checked from the top down. */
export const VOICE_BANDS = [
  ['street', 6],
  ['playful', 3],
  ['friendly', 1],
  ['professional', 0],
] as const;

type Voice = (typeof VOICES)[number];

/** Slang range (inclusive) the scorer maps to each voice, derived from {@link VOICE_BANDS}. */
export const VOICE_RANGES = Object.fromEntries(
  VOICE_BANDS.map(([voice, min], i) => [
    voice,
    { min, max: i === 0 ? HARD_LIMITS.slangScale : VOICE_BANDS[i - 1]![1] - 1 },
  ])
) as Record<Voice, { min: number; max: number }>;

/**
 * How each voice sounds, as the agent reads it from `get_voice_guide`. Every voice lists
 * at least its minimum number of scored terms, so writing from the examples lands in that
 * voice. A domain test checks this against the scorer.
 */
export const VOICE_STYLE: Record<Voice, { style: string; examples: readonly string[] }> = {
  professional: { style: 'Formal and precise. No slang terms, no exclamation marks.', examples: [] },
  friendly: { style: 'Warm and plain. One or two light, casual words.', examples: ['hey'] },
  playful: {
    style: 'Upbeat. Three to five casual words.',
    examples: ['hey', 'awesome', 'vibes'],
  },
  street: {
    style: 'Rapper energy. Six or more distinct slang terms.',
    examples: ['yo', 'fam', 'fire', 'no cap', 'drip', 'bet'],
  },
};

/**
 * The loudest voice a team may use without review: the highest band that starts at or
 * below the slang limit and that the team allows. A team without `street` falls back to
 * its next allowed voice, not straight to `professional`.
 */
export function loudestVoice(slang: number, voices: readonly string[]): Voice {
  return VOICE_BANDS.find(([voice, min]) => min <= slang && voices.includes(voice))?.[0] ?? 'professional';
}
