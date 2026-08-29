// Person 3 — Skeptic Agent tools.
// All four tools are pure functions (no side effects except generate_verdict, which writes
// to verdict_log). This makes them independently testable without running the MCP server.
//
// Scoring discipline: every threshold is an explicit constant with a comment explaining
// the rationale. Judges will ask — "the LLM decided" is not an acceptable answer.

import * as fs from "fs";
import * as path from "path";

import type {
  FindingsBoard,
  SignalLog,
  VerdictLog,
  SourceCredibilityData,
  MarketCalendarData,
  CalendarEvent,
} from "../types/shared.types.js";
import { writeVerdictLog } from "../resources/verdict-log.resource.js";

// DATA_DIR resolves from process.cwd() (the app root, /app in the container)
// so it works correctly regardless of where the compiled file is located.
const DATA_DIR = path.join(process.cwd(), "data");

// Load static lookup tables once at module initialization — wrapped in try/catch
// so the server starts cleanly even if a file is absent (uses safe fallbacks).
function loadJson<T>(filename: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), "utf-8")) as T;
  } catch {
    console.error(`[skeptic.tools] Warning: could not load ${filename}, using built-in fallback.`);
    return fallback;
  }
}

const CREDIBILITY: SourceCredibilityData = loadJson("source-credibility.json", {
  tiers: {
    high: ["reuters.com", "bloomberg.com", "wsj.com", "ft.com", "apnews.com"],
    medium: ["cnbc.com", "marketwatch.com", "seekingalpha.com", "benzinga.com", "thestreet.com"],
    low: ["reddit.com", "twitter.com", "stocktwits.com", "x.com"],
    press_release_mills: ["prnewswire.com", "businesswire.com", "globenewswire.com", "accesswire.com"],
  },
  scores: {
    "reuters.com": 95, "bloomberg.com": 95, "wsj.com": 92, "ft.com": 90,
    "cnbc.com": 75, "marketwatch.com": 72, "benzinga.com": 65,
  },
  descriptions: {},
});

const MARKET_CALENDAR: MarketCalendarData = loadJson("market-calendar.json", { events: {} });

// ─── Zod schemas (exported for MCP server registration) ───────────────────────

// We re-export zod definitions so skeptic-server.ts can register tool schemas
// without duplicating them.
export const TOOL_SCHEMAS = {
  check_source_credibility: {
    source_domain: { type: "string", description: "Domain of the news source, e.g. 'reuters.com'" },
    source_name: { type: "string", description: "Human-readable name (optional, used in unknown-source messages)" },
  },
  check_recycled_content: {
    headline_text: { type: "string", description: "The headline text to check for recycled content" },
    ticker: { type: "string", description: "Ticker symbol this headline is about" },
    historical_headlines: { type: "array", items: { type: "string" }, description: "Prior headlines for this ticker to compare against" },
    similarity_threshold: { type: "number", description: "Jaccard similarity threshold above which content is flagged (default 0.65)" },
  },
  check_volume_context: {
    ticker: { type: "string", description: "Ticker symbol" },
    date: { type: "string", description: "ISO8601 date (YYYY-MM-DD) of the event to check" },
    lookback_days: { type: "number", description: "Days around a calendar event that count as 'explained by' (default 2)" },
  },
  generate_verdict: {
    ticker: { type: "string", description: "Ticker symbol" },
    findings: { type: "object", description: "FindingsBoard object from findings_board resource" },
    signal: { type: "object", description: "SignalLog object from signal_log resource" },
  },
} as const;

// ─── Tool 1: check_source_credibility ─────────────────────────────────────────

export interface SourceCredibilityResult {
  credibility_tier: "high" | "medium" | "low" | "unknown";
  is_press_release_mill: boolean;
  credibility_score: number; // 0-100
  check_result: "pass" | "flagged";
  reason: string;
}

export function checkSourceCredibility(
  source_domain: string,
  source_name?: string
): SourceCredibilityResult {
  const domain = source_domain.toLowerCase().replace(/^www\./, "");
  const { tiers, scores } = CREDIBILITY;

  // Rule 1: Press release mills are always flagged.
  // Companies write their own narratives here — this is marketing, not journalism.
  if (tiers.press_release_mills.includes(domain)) {
    return {
      credibility_tier: "low",
      is_press_release_mill: true,
      credibility_score: scores[domain] ?? 12,
      check_result: "flagged",
      reason: `${domain} is a press release distribution service. Content is self-reported by the issuing company, not independently verified by journalists.`,
    };
  }

  // Rule 2: Tier-1 financial outlets — editorial standards and independent verification.
  if (tiers.high.includes(domain)) {
    return {
      credibility_tier: "high",
      is_press_release_mill: false,
      credibility_score: scores[domain] ?? 90,
      check_result: "pass",
      reason: `${domain} is a tier-1 financial news outlet with established editorial standards.`,
    };
  }

  // Rule 3: Tier-2 outlets — generally reliable but may include opinion/analysis without
  // strict fact-checking. Pass, but flag the score as moderate.
  if (tiers.medium.includes(domain)) {
    return {
      credibility_tier: "medium",
      is_press_release_mill: false,
      credibility_score: scores[domain] ?? 65,
      check_result: "pass",
      reason: `${domain} is a moderate-credibility financial outlet. Signal is likely reliable but independent verification is advised.`,
    };
  }

  // Rule 4: Known low-quality / sensationalist sources — always flagged.
  if (tiers.low.includes(domain)) {
    return {
      credibility_tier: "low",
      is_press_release_mill: false,
      credibility_score: scores[domain] ?? 25,
      check_result: "flagged",
      reason: `${domain} is classified as a low-credibility source known for sensationalism or unverified claims. Do not act on signals sourced solely from here.`,
    };
  }

  // Rule 5: Unknown domains are flagged — we cannot establish trust without a track record.
  // An unknown domain scoring 30 is below the implicit "trustworthy" threshold of ~60.
  return {
    credibility_tier: "unknown",
    is_press_release_mill: false,
    credibility_score: 30,
    check_result: "flagged",
    reason: `${source_name ?? domain} is not in the credibility database. Unknown sources cannot be trusted for signal generation — add to source-credibility.json after manual review.`,
  };
}

// ─── Tool 2: check_recycled_content ───────────────────────────────────────────

export interface RecycledContentResult {
  is_recycled: boolean;
  similarity_score: number; // 0.0–1.0 Jaccard
  most_similar_headline: string | null;
  check_result: "pass" | "flagged";
  reason: string;
}

// Common words that add noise to similarity scores without carrying meaning.
// Using a focused finance-aware list rather than a generic NLP stopword list.
const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "as", "into", "through", "during", "before",
  "after", "above", "below", "between", "out", "off", "over", "under",
  "and", "but", "or", "nor", "not", "only", "own", "same", "than", "too",
  "very", "just", "about", "its", "their", "says", "said", "report",
  "reports", "new", "up", "down", "this", "that", "these", "those", "it",
  "its", "our", "your", "their", "them", "they", "we", "us", "he", "she",
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1.0;
  if (a.size === 0 || b.size === 0) return 0.0;
  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection++;
  }
  return intersection / (a.size + b.size - intersection);
}

// Recycling threshold: 0.65 Jaccard.
// Rationale: 65% shared meaningful vocabulary after stopword removal means the
// same story is being republished with surface-level rephrasing — a common
// pump-and-dump tactic where the same narrative is "laundered" through multiple outlets.
const RECYCLING_THRESHOLD = 0.65;

export function checkRecycledContent(
  headline_text: string,
  ticker: string,
  historical_headlines: string[],
  similarity_threshold: number = RECYCLING_THRESHOLD
): RecycledContentResult {
  const currentTokens = tokenize(headline_text);
  let maxSim = 0;
  let mostSimilar: string | null = null;

  for (const hist of historical_headlines) {
    const sim = jaccard(currentTokens, tokenize(hist));
    if (sim > maxSim) {
      maxSim = sim;
      mostSimilar = hist;
    }
  }

  const simPct = `${(maxSim * 100).toFixed(1)}%`;
  const threshPct = `${(similarity_threshold * 100).toFixed(0)}%`;

  if (maxSim >= similarity_threshold) {
    return {
      is_recycled: true,
      similarity_score: maxSim,
      most_similar_headline: mostSimilar,
      check_result: "flagged",
      reason: `Headline shares ${simPct} word overlap with a prior ${ticker} headline (threshold: ${threshPct}). This pattern is consistent with a recycled story being re-released to simulate fresh news momentum.`,
    };
  }

  return {
    is_recycled: false,
    similarity_score: maxSim,
    most_similar_headline: maxSim > 0.3 ? mostSimilar : null,
    check_result: "pass",
    reason:
      historical_headlines.length === 0
        ? `No historical ${ticker} headlines available to compare against.`
        : `Headline shares ${simPct} word overlap with historical ${ticker} headlines — below the ${threshPct} recycling threshold. Content appears fresh.`,
  };
}

// ─── Tool 3: check_volume_context ─────────────────────────────────────────────

export interface VolumeContextResult {
  volume_context: "organic" | "explained_by_calendar_event";
  event_type: CalendarEvent["type"] | null;
  event_date: string | null;
  event_description: string | null;
  reason: string;
}

function daysBetween(isoA: string, isoB: string): number {
  const MS_PER_DAY = 86_400_000;
  return Math.abs(new Date(isoA).getTime() - new Date(isoB).getTime()) / MS_PER_DAY;
}

// Calendar proximity window: volume within 2 days of a scheduled event is
// considered calendar-explained. The 2-day window accounts for pre-event
// positioning (day before) and post-event unwinding (day after).
const CALENDAR_PROXIMITY_DAYS = 2;

export function checkVolumeContext(
  ticker: string,
  date: string,
  lookback_days: number = CALENDAR_PROXIMITY_DAYS
): VolumeContextResult {
  const tickerKey = ticker.toUpperCase();
  const tickerEvents: CalendarEvent[] = MARKET_CALENDAR.events[tickerKey] ?? [];
  const marketEvents: CalendarEvent[] = MARKET_CALENDAR.events["MARKET"] ?? [];
  const allEvents = [...tickerEvents, ...marketEvents];

  for (const event of allEvents) {
    if (daysBetween(date, event.date) <= lookback_days) {
      return {
        volume_context: "explained_by_calendar_event",
        event_type: event.type,
        event_date: event.date,
        event_description: event.description,
        reason: `Volume on ${date} is within ${lookback_days} day(s) of a scheduled ${event.type}: "${event.description}" (${event.date}). This volume may reflect pre-scheduled market mechanics, not the news catalyst.`,
      };
    }
  }

  return {
    volume_context: "organic",
    event_type: null,
    event_date: null,
    event_description: null,
    reason: `No scheduled calendar events within ${lookback_days} day(s) of ${date} for ${tickerKey}. Volume appears organically news-driven.`,
  };
}

// ─── Narrative Entropy (advisory — runs inside generate_verdict) ───────────────
// Not exposed as a standalone MCP tool since it's an internal quality signal,
// but exported for direct testing.

const HYPE_WORDS = new Set([
  "moon", "rocket", "yolo", "guaranteed", "millionaire", "lambo", "100x",
  "gem", "undervalued", "massive", "easy", "squeeze", "mooning", "explode",
  "skyrocket", "pump", "parabolic", "fomo", "fud", "diamond", "ape",
  "legendary", "insane", "crazy", "bull", "unbelievable", "goat",
]);

const SUBSTANCE_WORDS = new Set([
  "revenue", "earnings", "guidance", "margin", "eps", "ratio", "cash",
  "flow", "balance", "dividend", "analyst", "downgrade", "upgrade", "target",
  "sec", "filing", "patent", "partnership", "contract", "acquisition",
  "merger", "regulation", "compliance", "quarterly", "annual", "forecast",
  "outlook", "valuation", "depreciation", "capex", "ebitda", "liquidity",
]);

export interface NarrativeEntropyResult {
  entropy_level: "low" | "medium" | "high";
  hype_ratio: number; // 0.0–1.0
  hype_word_count: number;
  substance_word_count: number;
  sample_hype_words: string[];
  advisory: string;
}

// Entropy thresholds:
// < 0.25  → low: predominantly technical/fundamental vocabulary
// 0.25–0.5 → medium: mixed; normal retail attention
// > 0.5   → high: vocabulary degraded to emotional hype — classic retail trap pattern
const ENTROPY_LOW_THRESHOLD = 0.25;
const ENTROPY_HIGH_THRESHOLD = 0.5;

export function assessNarrativeEntropy(headlines: string[]): NarrativeEntropyResult {
  const combined = headlines.join(" ").toLowerCase().split(/\s+/);
  const foundHype: string[] = [];
  const foundSubstance: string[] = [];

  for (const raw of combined) {
    const w = raw.replace(/[^a-z]/g, "");
    if (HYPE_WORDS.has(w)) foundHype.push(w);
    if (SUBSTANCE_WORDS.has(w)) foundSubstance.push(w);
  }

  const total = foundHype.length + foundSubstance.length;
  const hypeRatio = total === 0 ? 0 : foundHype.length / total;
  const pct = `${(hypeRatio * 100).toFixed(0)}%`;
  const sampleHype = [...new Set(foundHype)].slice(0, 5);

  let entropy_level: "low" | "medium" | "high";
  let advisory: string;

  if (hypeRatio < ENTROPY_LOW_THRESHOLD) {
    entropy_level = "low";
    advisory = "Narrative vocabulary is predominantly technical/fundamental. Discussion quality appears substantive.";
  } else if (hypeRatio < ENTROPY_HIGH_THRESHOLD) {
    entropy_level = "medium";
    advisory = `Narrative is ${pct} hype vocabulary — moderate retail excitement but substance remains. Monitor for further drift.`;
  } else {
    entropy_level = "high";
    advisory = `ALERT: Narrative has degraded to ${pct} hype vocabulary (e.g. ${sampleHype.join(", ")}). This pattern is characteristic of a retail hype cycle, not fundamental discussion.`;
  }

  return { entropy_level, hype_ratio: hypeRatio, hype_word_count: foundHype.length, substance_word_count: foundSubstance.length, sample_hype_words: sampleHype, advisory };
}

// ─── Tool 4: generate_verdict ─────────────────────────────────────────────────

export function generateVerdict(
  ticker: string,
  findings: FindingsBoard,
  signal: SignalLog
): VerdictLog {
  const challenges: string[] = [];

  // ── Hard Check 1: Source Credibility ──────────────────────────────────────
  // Flag if ANY headline comes from a press release mill, OR if more than half
  // of sources are low/unknown credibility.
  let flaggedSources = 0;
  let pressReleaseMills = 0;

  for (const headline of findings.headlines) {
    const result = checkSourceCredibility(headline.source);
    if (result.check_result === "flagged") flaggedSources++;
    if (result.is_press_release_mill) pressReleaseMills++;
  }

  const majorityFlagged = flaggedSources > findings.headlines.length / 2;
  const credibility_check: "pass" | "flagged" =
    pressReleaseMills > 0 || majorityFlagged ? "flagged" : "pass";

  if (credibility_check === "flagged") {
    if (pressReleaseMills > 0) {
      challenges.push(
        `${pressReleaseMills} of ${findings.headlines.length} headline(s) sourced from press release distribution services (company self-reported, not independently verified).`
      );
    } else {
      challenges.push(
        `${flaggedSources} of ${findings.headlines.length} sources are low-credibility or unknown. Signal may rest on unreliable reporting.`
      );
    }
  }

  // ── Hard Check 2: Recycled Content ────────────────────────────────────────
  // Compare each headline against the rest in this batch.
  // In a live deployment, this would compare against the full findings_board history
  // for this ticker. Cross-batch comparison is handled by Person 1's resource.
  const headlineTexts = findings.headlines.map((h) => h.text);
  let recycledCount = 0;

  for (let i = 0; i < headlineTexts.length; i++) {
    const others = headlineTexts.filter((_, j) => j !== i);
    const result = checkRecycledContent(headlineTexts[i], ticker, others);
    if (result.check_result === "flagged") recycledCount++;
  }

  // Flag if more than 30% of headlines in this batch are near-duplicates of each other.
  // 30% threshold: one duplicate in a batch of 3 is suspicious; all unique is fine.
  const recycledPct = headlineTexts.length > 0 ? recycledCount / headlineTexts.length : 0;
  const recycled_content_check: "pass" | "flagged" =
    recycledPct > 0.3 ? "flagged" : "pass";

  if (recycled_content_check === "flagged") {
    challenges.push(
      `${recycledCount} of ${headlineTexts.length} headlines share high word overlap with others in this batch — content may be duplicated across outlets to inflate perceived coverage breadth.`
    );
  }

  // ── Hard Check 3: Volume Context ──────────────────────────────────────────
  // Use the findings timestamp's date to check for calendar events.
  const eventDate = findings.timestamp.split("T")[0];
  const volumeResult = checkVolumeContext(ticker, eventDate);
  const volume_context_check = volumeResult.volume_context;

  if (volume_context_check === "explained_by_calendar_event") {
    challenges.push(
      `Volume activity coincides with a scheduled ${volumeResult.event_type} (${volumeResult.event_description} on ${volumeResult.event_date}) — may not be purely news-driven.`
    );
  }

  // ── Advisory Check: Narrative Entropy ─────────────────────────────────────
  // Not a hard check (doesn't affect the 0/1/2+ flag count for the verdict),
  // but is surfaced in challenges_raised so the widget can display it.
  const entropy = assessNarrativeEntropy(headlineTexts);
  if (entropy.entropy_level === "high") {
    challenges.push(
      `Narrative entropy is HIGH (${(entropy.hype_ratio * 100).toFixed(0)}% hype vocabulary). Chatter has shifted from technical discussion to retail buzzwords: [${entropy.sample_hype_words.join(", ")}].`
    );
  }

  // ── Final Verdict ─────────────────────────────────────────────────────────
  // Count only the three hard checks for the verdict.
  // Narrative entropy is advisory and adds context but does not change the verdict tier.
  const hardFlagCount = [
    credibility_check === "flagged",
    recycled_content_check === "flagged",
    volume_context_check === "explained_by_calendar_event",
  ].filter(Boolean).length;

  // Verdict rules (explicit, judge-defensible):
  // 0 flags → confirmed_signal:  all adversarial checks cleared
  // 1 flag  → weakened_signal:   signal exists but has a credibility concern; treat as watch
  // 2+ flags → rejected_signal:  multiple red flags; do not act on this signal
  const final_verdict: VerdictLog["final_verdict"] =
    hardFlagCount === 0
      ? "confirmed_signal"
      : hardFlagCount === 1
      ? "weakened_signal"
      : "rejected_signal";

  const dir = signal.signal_direction;
  const dirLabel =
    dir === "bullish" ? "bullish signal" : dir === "bearish" ? "bearish signal" : "neutral signal";

  let verdict_reasoning: string;
  if (final_verdict === "confirmed_signal") {
    verdict_reasoning = `All Skeptic checks passed for ${ticker}. The Analyst's ${dirLabel} (score ${signal.signal_score}/100) stands — sources are credible, content is fresh, and volume appears organically news-driven. ${signal.reasoning}`;
  } else if (final_verdict === "weakened_signal") {
    verdict_reasoning = `The ${dirLabel} for ${ticker} (score ${signal.signal_score}/100) is WEAKENED by 1 adversarial check: ${challenges[0]} Treat this as a watch position rather than an action signal pending further confirmation.`;
  } else {
    verdict_reasoning = `The ${dirLabel} for ${ticker} (score ${signal.signal_score}/100) is REJECTED. ${hardFlagCount} adversarial checks failed: ${challenges.slice(0, 3).join(" | ")} Do not act on this signal.`;
  }

  const verdict: VerdictLog = {
    ticker: ticker.toUpperCase(),
    timestamp: new Date().toISOString(),
    challenges_raised: challenges,
    credibility_check,
    recycled_content_check,
    volume_context_check,
    final_verdict,
    verdict_reasoning,
  };

  // Persist to verdict_log resource so the widget can read it
  writeVerdictLog(verdict);

  return verdict;
}
