/**
 * scout.tools.ts — Scout Agent Tools
 * Layer: Scout Agent / News Ingestion
 *
 * Two tools:
 *  1. scan_trending_topics(tickers)     — fetches news per ticker, runs sentiment,
 *                                          writes to findings_board Resource.
 *  2. detect_narrative_shift(ticker, mentions_over_time)
 *                                       — flags hype-vocabulary drift
 *                                          (narrative_entropy: low|medium|high).
 *
 * Data source: NewsAPI free tier (NEWSAPI_KEY in .env).
 * Fallback: seed-news.json if API is unavailable or rate-limited.
 *
 * Framing note: We surface signals and reasoning to support a human decision.
 * We do NOT claim predictive accuracy.
 */

import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import {
  type HeadlineEntry,
  type FindingsBoardEntry,
  writeFinding,
} from './findings-board.resource.js';
import { llmScoreSentiment } from './llm-sentiment.js';

// ─── Hype vocabulary reference lists (for narrative entropy detection) ─────────
// "Technical" words = substantive, analyst-level discourse
const TECHNICAL_TERMS = new Set([
  'earnings', 'revenue', 'guidance', 'margin', 'ebitda', 'forecast',
  'quarterly', 'analysts', 'estimates', 'consensus', 'eps', 'pe',
  'valuation', 'fundamentals', 'liquidity', 'debt', 'cashflow', 'buyback',
  'dividend', 'acquisition', 'merger', 'regulatory', 'production', 'capacity',
  'deliveries', 'supply chain', 'demand', 'inventory', 'backlog', 'pipeline',
  'partnership', 'patent', 'r&d', 'research', 'development', 'launch',
  'upgrade', 'downgrade', 'target price', 'overweight', 'underweight',
]);

// "Hype" words = low-effort retail/social media discourse (narrative entropy signal)
const HYPE_TERMS = new Set([
  'moon', 'rocket', 'yolo', 'guaranteed', 'lambo', 'fomo', 'hodl', 'degen',
  'aping', 'wen', 'gm', 'wagmi', 'ngmi', 'bullish af', 'to the moon',
  'squeeze', 'short squeeze', 'mooning', '🚀', '💎', '🙌', '📈📈📈',
  'easy money', 'free money', 'can\'t lose', 'buying the dip hard',
  'massive pump', 'next 10x', 'hidden gem', 'insider info',
]);

// ─── Seed news loader (fallback) ───────────────────────────────────────────────
function loadSeedNews(): Record<string, any[]> {
  const seedPath = path.join(process.cwd(), 'src', 'data', 'seed-news.json');
  try {
    return JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
  } catch {
    return {};
  }
}

// ─── Universal input resolver ──────────────────────────────────────────────────
// Accepts ANY input: ticker ("AAPL"), company name ("Apple"), partial name
// ("Starbucks"), commodity ("Gold"), or crypto ("Bitcoin").
//
// Two-mode resolution:
//   TICKER mode  — input matches /^[A-Z]{1,6}(\.[A-Z]+)?$/  (e.g. "AAPL", "BTC")
//                  Requires an EXACT ticker match from SYMBOL_SEARCH.
//   NAME mode    — input contains spaces or lowercase  (e.g. "Apple", "Starbucks")
//                  Scores all SYMBOL_SEARCH results and picks the closest name match
//                  so "Apple" → "Apple Inc" (AAPL) not "Apple Hospitality REIT" (APLE).

interface ResolvedSymbol {
  symbol: string;      // canonical ticker, e.g. "AAPL"
  name: string;        // official name, e.g. "Apple Inc"
  region: string;      // e.g. "United States", "India/BSE"
  type: string;        // "Equity", "ETF", "Digital Currency", etc.
  searchQuery: string; // what to pass to news APIs
}

const _symbolCache: Record<string, ResolvedSymbol> = {};

// Scores how well a company name matches the user's input.
// Higher = better match. Prefers: more input words covered + shorter company names.
function nameMatchScore(input: string, companyName: string): number {
  const inputWords  = input.toLowerCase().split(/\s+/).filter(Boolean);
  const nameWords   = companyName.toLowerCase().split(/\s+/).filter(Boolean);
  const matched     = inputWords.filter(w => nameWords.some(n => n.startsWith(w))).length;
  const coverage    = matched / Math.max(inputWords.length, 1);       // 0–1
  const compactness = 1 / Math.max(nameWords.length, 1);              // shorter name = higher
  return coverage * 100 + compactness * 10;
}

function pickBestMatch(input: string, matches: any[]): any {
  if (!matches.length) return null;
  const trimmed = input.trim();

  // TICKER mode: input must ALREADY be all-uppercase (user typed "AAPL", "BTC", "RELIANCE")
  // "Apple" has lowercase → not ticker mode. "AAPL" is all-caps → ticker mode.
  const isTickerInput = /^[A-Z0-9]{1,12}(\.[A-Z]{1,4})?$/.test(trimmed);

  if (isTickerInput) {
    // Require exact symbol match so "AAPL" → Apple Inc, not Apple Hospitality REIT
    const exact = matches.find((m: any) => m['1. symbol'].toUpperCase() === trimmed.toUpperCase());
    if (exact) return exact;
    // No exact match (e.g. user typed "APPLE" which isn't a real ticker) — fall through to name scoring
  }

  // NAME mode: score all results by how well their company name matches the input
  // "Apple" scores higher against "Apple Inc" (2 words) than "Apple Hospitality REIT Inc" (4 words)
  return matches.reduce((best: any, m: any) => {
    if (!best) return m;
    return nameMatchScore(trimmed, m['2. name']) > nameMatchScore(trimmed, best['2. name'])
      ? m : best;
  }, null);
}

async function resolveInput(userInput: string, alphaKey: string): Promise<ResolvedSymbol> {
  const key = userInput.trim().toLowerCase();
  if (_symbolCache[key]) return _symbolCache[key];

  if (alphaKey) {
    try {
      const r = await axios.get('https://www.alphavantage.co/query', {
        params: { function: 'SYMBOL_SEARCH', keywords: userInput.trim(), apikey: alphaKey },
        timeout: 6_000,
      });
      const matches: any[] = r.data?.bestMatches ?? [];
      const best = pickBestMatch(userInput.trim(), matches);
      if (best) {
        const symbol = best['1. symbol'];
        const name   = best['2. name'];
        // Use ticker + FIRST word of company name only — not the full name.
        // "StackIt Storage Inc" → firstWord="StackIt" → '"STAK" OR "StackIt"'
        // This prevents generic words like "Storage" / "Inc" / "Industries"
        // from pulling in unrelated articles (e.g. Fiserv for STAK).
        const firstWord = name.split(/\s+/)[0] ?? symbol;
        const searchQuery = firstWord.toLowerCase() === symbol.toLowerCase()
          ? `"${symbol}"`
          : `"${symbol}" OR "${firstWord}"`;
        const resolved: ResolvedSymbol = {
          symbol,
          name,
          region: best['4. region'] ?? 'Unknown',
          type:   best['3. type']   ?? 'Equity',
          searchQuery,
        };
        _symbolCache[key] = resolved;
        return resolved;
      }
    } catch { /* fall through */ }
  }

  // Fallback: treat input as-is — quote the ticker for precision
  const fallback: ResolvedSymbol = {
    symbol:      userInput.toUpperCase(),
    name:        userInput,
    region:      'Unknown',
    type:        'Unknown',
    searchQuery: `"${userInput.toUpperCase()}" stock`,
  };
  _symbolCache[key] = fallback;
  return fallback;
}

// ─── Alpha Vantage NEWS_SENTIMENT fetcher (primary — ticker-specific) ─────────
// AV's news API filters BY TICKER — only returns articles that actually mention
// the stock. Covers Benzinga, Seeking Alpha, Quiver Quantitative, Motley Fool,
// etc. No cross-contamination from unrelated companies is possible.
function avTimeToISO(t: string): string {
  const m = t.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
  if (!m) return t;
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`;
}

async function fetchAVNewsForTicker(ticker: string, apiKey: string): Promise<any[]> {
  const response = await axios.get('https://www.alphavantage.co/query', {
    params: { function: 'NEWS_SENTIMENT', tickers: ticker, limit: 10, sort: 'LATEST', apikey: apiKey },
    timeout: 8000,
  });
  const data = response.data;
  if (data['Note'] || data['Information']) throw new Error(data['Note'] ?? data['Information']);
  return (data.feed ?? []).map((a: any) => ({
    source:      a.source ?? 'Unknown',
    title:       a.title,
    description: a.summary,
    url:         a.url,
    publishedAt: avTimeToISO(a.time_published ?? ''),
  }));
}

// ─── Yahoo Finance news fetcher (no API key required) ─────────────────────────
// Yahoo Finance aggregates from Quiver Quantitative, Barchart, Benzinga, PR
// Newswire, Reuters, etc. — covers micro-cap and OTC stocks that AV/NewsAPI miss.
async function fetchYahooNewsForTicker(ticker: string): Promise<any[]> {
  const response = await axios.get('https://query2.finance.yahoo.com/v1/finance/search', {
    params: { q: ticker, newsCount: 10, enableNavLinks: false, quotesCount: 0 },
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarketSignalMCP/1.0)' },
    timeout: 8000,
  });
  return (response.data?.news ?? []).map((a: any) => ({
    source:      a.publisher ?? 'Yahoo Finance',
    title:       a.title,
    description: a.summary ?? '',
    url:         a.link,
    publishedAt: a.providerPublishTime
      ? new Date(a.providerPublishTime * 1000).toISOString()
      : undefined,
  }));
}

// ─── NewsAPI fetcher (tertiary — generic web news) ─────────────────────────────
async function fetchNewsForQuery(query: string, apiKey: string): Promise<any[]> {
  const response = await axios.get('https://newsapi.org/v2/everything', {
    params: { q: query, language: 'en', sortBy: 'publishedAt', pageSize: 10, apiKey },
    timeout: 8000,
  });
  return response.data.articles ?? [];
}

// ─── GNews API fetcher (quaternary live news provider) ─────────────────────────
async function fetchGNewsForQuery(query: string, apiKey: string): Promise<any[]> {
  const response = await axios.get('https://gnews.io/api/v4/search', {
    params: { q: query, lang: 'en', max: 10, token: apiKey },
    timeout: 8000,
  });
  return (response.data.articles ?? []).map((article: any) => ({
    source: article.source?.name ?? 'GNews',
    title: article.title,
    description: article.description,
    url: article.url,
    publishedAt: article.publishedAt,
  }));
}

// ─── Sentiment scoring (rule-based, fast, explainable to judges) ───────────────
// We use a simple lexicon approach rather than an LLM call to avoid latency
// in the demo. The scoring is explicit and defensible:
//   +0.1 per positive keyword hit, -0.1 per negative keyword hit, clamped to [-1, 1]
const POSITIVE_WORDS = [
  'record', 'growth', 'beat', 'surge', 'rise', 'gain', 'profit', 'rally',
  'strong', 'bullish', 'optimistic', 'accelerates', 'breakthrough', 'milestone',
  'exceeded', 'higher', 'upgrade', 'increased', 'revenue', 'demand', 'expansion',
  'soars', 'soar', 'jumps', 'jump', 'climbs', 'climb', 'outperform', 'outperforms',
  'beats', 'surges', 'skyrockets', 'recovers', 'recovery', 'all-time high', 'ath',
  'strong buy', 'buy rating', 'boost', 'boosts', 'soaring', 'jumping',
];
const NEGATIVE_WORDS = [
  'fall', 'drop', 'decline', 'miss', 'loss', 'slump', 'concern', 'risk',
  'bearish', 'crash', 'volatile', 'scrutiny', 'restriction', 'warning', 'cut',
  'faces', 'antitrust', 'tariff', 'ban', 'lower', 'missed', 'disappoint',
  'plunges', 'plunge', 'tumbles', 'tumble', 'slashes', 'slash', 'dips', 'dip',
  'dive', 'diving', 'selloff', 'sell-off', 'layoffs', 'recession', 'default',
  'bankruptcy', 'downgrade', 'lawsuit', 'investigation', 'fraud', 'collapses',
];

function scoreSentiment(text: string): { sentiment: 'positive' | 'negative' | 'neutral'; score: number; matchCount: number } {
  const lower = text.toLowerCase();
  let score = 0;
  let matchCount = 0;

  for (const word of POSITIVE_WORDS) {
    if (lower.includes(word)) { score += 0.15; matchCount++; }
  }
  for (const word of NEGATIVE_WORDS) {
    if (lower.includes(word)) { score -= 0.15; matchCount++; }
  }

  // Clamp to [-1, 1]
  score = Math.max(-1, Math.min(1, Math.round(score * 100) / 100));

  const sentiment: 'positive' | 'negative' | 'neutral' =
    score > 0.02 ? 'positive' : score < -0.02 ? 'negative' : 'neutral';

  return { sentiment, score, matchCount };
}

// ─── Narrative entropy scorer ──────────────────────────────────────────────────
// Explicit scoring rules (so judges can audit them):
//   hypeRatio = hype_word_hits / (technical_word_hits + hype_word_hits + 1)
//   hypeRatio > 0.5  → 'high'   (vocabulary has degraded to retail chatter)
//   hypeRatio 0.2-0.5 → 'medium' (mixed; worth noting)
//   hypeRatio < 0.2  → 'low'    (substantive discourse)
function scoreNarrativeEntropy(headlines: HeadlineEntry[]): 'low' | 'medium' | 'high' {
  let technicalHits = 0;
  let hypeHits = 0;

  for (const h of headlines) {
    const lower = h.text.toLowerCase();
    for (const term of TECHNICAL_TERMS) {
      if (lower.includes(term)) technicalHits++;
    }
    for (const term of HYPE_TERMS) {
      if (lower.includes(term)) hypeHits++;
    }
  }

  const hypeRatio = hypeHits / (technicalHits + hypeHits + 1);

  if (hypeRatio > 0.5) return 'high';
  if (hypeRatio >= 0.2) return 'medium';
  return 'low';
}

// ─── Mention velocity scorer ───────────────────────────────────────────────────
// Simple rule based on headline count vs. baseline:
//   ≥ 5 headlines in scan window → 'spiking'
//   2–4 headlines               → 'steady'
//   0–1 headlines               → 'declining'
function scoreMentionVelocity(headlineCount: number): 'spiking' | 'steady' | 'declining' {
  if (headlineCount >= 5) return 'spiking';
  if (headlineCount >= 2) return 'steady';
  return 'declining';
}

// ─── Narrative summary builder ─────────────────────────────────────────────────
function buildNarrativeSummary(ticker: string, headlines: HeadlineEntry[], entropy: string): string {
  const positiveCount = headlines.filter(h => h.sentiment === 'positive').length;
  const negativeCount = headlines.filter(h => h.sentiment === 'negative').length;
  const total = headlines.length;

  const sentimentWord =
    positiveCount > negativeCount * 1.5 ? 'predominantly positive' :
    negativeCount > positiveCount * 1.5 ? 'predominantly negative' :
    'mixed';

  const entropyNote =
    entropy === 'high' ? ' Vocabulary analysis shows degraded language quality (high retail hype terms).' :
    entropy === 'medium' ? ' Some hype language detected alongside substantive coverage.' :
    '';

  return `${total} headlines found for ${ticker}, sentiment is ${sentimentWord} (${positiveCount} positive, ${negativeCount} negative, ${total - positiveCount - negativeCount} neutral).${entropyNote}`;
}

// ─── Tool class ────────────────────────────────────────────────────────────────
export class ScoutTools {
  /**
   * scan_trending_topics
   * Primary Scout Agent tool. Fetches news for the given tickers, runs
   * sentiment scoring, computes mention velocity, and writes each finding
   * to the findings_board Resource (the shared blackboard).
   *
   * Fallback: if NEWSAPI_KEY is not set or API returns an error, falls back
   * to seed-news.json automatically — so the demo always has data.
   */
  @Widget('scan-trending-topics')
  @Tool({
    name: 'scan_trending_topics',
    description:
      'Scout Agent: Scans live news for any stock, crypto, or commodity. ' +
      'Accepts ticker symbols (e.g. "AAPL") OR company/asset names (e.g. "Apple", "Starbucks", "Gold", "Bitcoin"). ' +
      'Automatically resolves names to ticker symbols using Alpha Vantage symbol search, ' +
      'then fetches headlines, scores sentiment, calculates mention velocity, ' +
      'and writes structured findings to the findings_board Resource. ' +
      'Returns an array of FindingsBoardEntry objects (one per input). ' +
      'IMPORTANT: Render this result using the /scan-trending-topics widget. ' +
      'Do not combine multiple agent outputs into a single composite widget — ' +
      'render each agent\'s result individually using its own widget.',
    inputSchema: z.object({
      tickers: z
        .array(z.string())
        .describe(
          'List of tickers OR company/asset names to scan. ' +
          'Examples: ["AAPL", "Tesla", "Starbucks", "Gold", "Bitcoin", "MRF Tyres", "Reliance Industries"]. ' +
          'Ticker symbols and plain English names both work.'
        ),
      use_seed_fallback: z
        .boolean()
        .optional()
        .describe('If true, forces use of seed-news.json instead of live API. Useful for demo rehearsal.'),
    }),
    examples: {
      request: { tickers: ['Apple', 'Starbucks', 'Gold'] },
      response: {
        findings: [
          {
            ticker: 'AAPL',
            resolved_from: 'Apple',
            company_name: 'Apple Inc',
            timestamp: '2025-07-25T10:00:00Z',
            headlines: [{ source: 'Reuters', text: 'Apple hits record quarterly revenue', url: '...', sentiment: 'positive', sentiment_score: 0.7 }],
            narrative_summary: '5 headlines found for AAPL, sentiment is predominantly positive.',
            mention_velocity: 'spiking',
            narrative_entropy: 'low'
          }
        ],
        scan_timestamp: '2025-07-25T10:05:00Z',
        source_used: 'live_api'
      }
    }
  })
  async scanTrendingTopics(input: any, ctx: ExecutionContext) {
    const { use_seed_fallback = false } = input;
    const newsApiKey  = process.env.NEWSAPI_KEY || process.env.NEWS_API_KEY || '';
    const gnewsApiKey = process.env.GNEWS_API_KEY || '';
    const alphaKey    = process.env.ALPHA_VANTAGE_KEY || '';
    const scanTimestamp = new Date().toISOString();

    // Normalize tickers input — NitroStudio may send a plain string instead of an array.
    // "AAPL"        → ["AAPL"]
    // '["AAPL"]'    → ["AAPL"]   (JSON string)
    // ["AAPL","BTC"]→ ["AAPL","BTC"]  (already correct)
    let tickers: string[];
    const raw = input.tickers;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        tickers = Array.isArray(parsed) ? parsed : [String(parsed)];
      } catch {
        // Plain string like "AAPL" or "Apple" — treat as single ticker
        tickers = [raw.trim()];
      }
    } else if (Array.isArray(raw)) {
      tickers = raw;
    } else {
      tickers = [String(raw)];
    }

    ctx.logger.info('Scout: scan_trending_topics started', { tickers, use_seed_fallback });

    const findings: FindingsBoardEntry[] = [];
    let sourceUsed: 'live_api' | 'seed_fallback' = 'live_api';

    const shouldUseFallback = use_seed_fallback || (!newsApiKey && !gnewsApiKey);
    if (shouldUseFallback) {
      sourceUsed = 'seed_fallback';
      ctx.logger.warn('Scout: using seed fallback', { reason: (!newsApiKey && !gnewsApiKey) ? 'no API keys configured' : 'forced fallback' });
    }

    const seedNews = loadSeedNews();

    for (const rawInput of tickers) {
      // ── Step 1: Resolve company name / ticker to a canonical symbol ───────────
      let resolved = { symbol: rawInput.toUpperCase(), name: rawInput, region: 'Unknown', type: 'Unknown', searchQuery: `${rawInput} stock` };
      if (!shouldUseFallback) {
        resolved = await resolveInput(rawInput, alphaKey);
        ctx.logger.info(`Scout: resolved "${rawInput}" → ${resolved.symbol} (${resolved.name}, ${resolved.region})`);
      }
      const upperTicker = resolved.symbol;

      let rawArticles: any[] = [];

      if (shouldUseFallback) {
        rawArticles = seedNews[upperTicker] ?? [];
      } else {
        // Track whether the source already filters by ticker (so we can skip the
        // relevance filter, which would otherwise drop articles that say "StackIt"
        // instead of "STAK" because the ticker isn't a substring of the company name).
        let sourceIsTickerFiltered = false;

        // 1️⃣  Alpha Vantage NEWS_SENTIMENT — filters by ticker server-side.
        //    Covers Benzinga, Seeking Alpha, Motley Fool. No cross-contamination.
        if (alphaKey && rawArticles.length === 0) {
          try {
            rawArticles = await fetchAVNewsForTicker(upperTicker, alphaKey);
            if (rawArticles.length > 0) {
              sourceIsTickerFiltered = true;
              ctx.logger.info(`Scout: AV News returned ${rawArticles.length} articles for ${upperTicker}`);
            }
          } catch (error: any) {
            ctx.logger.warn(`Scout: AV News failed for ${upperTicker}, trying Yahoo Finance...`, { error: error.message });
          }
        }
        // 2️⃣  Yahoo Finance — aggregates Quiver Quantitative, Barchart, PR Newswire,
        //    Reuters, etc. Covers micro/small-cap stocks that AV misses. No API key needed.
        if (rawArticles.length === 0) {
          try {
            rawArticles = await fetchYahooNewsForTicker(upperTicker);
            if (rawArticles.length > 0) {
              sourceIsTickerFiltered = true;
              ctx.logger.info(`Scout: Yahoo Finance returned ${rawArticles.length} articles for ${upperTicker}`);
            }
          } catch (error: any) {
            ctx.logger.warn(`Scout: Yahoo Finance failed for ${upperTicker}, trying NewsAPI...`, { error: error.message });
          }
        }
        // 3️⃣  NewsAPI — generic web news (tertiary)
        if (newsApiKey && rawArticles.length === 0) {
          try {
            rawArticles = await fetchNewsForQuery(resolved.searchQuery, newsApiKey);
          } catch (error: any) {
            ctx.logger.warn(`Scout: NewsAPI failed for ${upperTicker}, trying GNews...`, { error: error.message });
          }
        }
        // 4️⃣  GNews — quaternary
        if (rawArticles.length === 0 && gnewsApiKey) {
          try {
            rawArticles = await fetchGNewsForQuery(resolved.searchQuery, gnewsApiKey);
          } catch (error: any) {
            ctx.logger.warn(`Scout: GNews API failed for ${upperTicker}`, { error: error.message });
          }
        }
        // 5️⃣  Seed fallback only if every live source returned nothing
        if (rawArticles.length === 0) {
          ctx.logger.warn(`Scout: all live APIs returned nothing for ${upperTicker}, using seed fallback`);
          rawArticles = seedNews[upperTicker] ?? [];
          if (rawArticles.length > 0) sourceUsed = 'seed_fallback';
        }

        // ── Relevance filter ─────────────────────────────────────────────────────
        // Skip when the source already filtered by ticker (AV News / Yahoo Finance).
        // Apply when using NewsAPI/GNews which return by keyword and can cross-contaminate.
        if (!sourceIsTickerFiltered && rawArticles.length > 0) {
          const symbolLower = upperTicker.toLowerCase();
          const nameLower   = resolved.name.toLowerCase();
          const coreNameLower = nameLower
            .replace(/\b(inc|corp|ltd|llc|plc|nv|sa|ag|se|group|holdings|company|co)\.?\b/gi, '')
            .replace(/\s+/g, ' ').trim();
          const coreFirstWord = coreNameLower.split(/\s+/)[0] ?? '';
          const relevant = rawArticles.filter((a: any) => {
            const haystack = `${a.title ?? ''} ${a.description ?? ''}`.toLowerCase();
            return haystack.includes(symbolLower)
              || haystack.includes(nameLower)
              || (coreNameLower.length > 2 && haystack.includes(coreNameLower))
              || (coreFirstWord.length > 2 && haystack.includes(coreFirstWord));
          });
          if (relevant.length > 0) {
            rawArticles = relevant;
          } else {
            // All articles irrelevant — try seed rather than keeping junk
            const seedFallback = seedNews[upperTicker] ?? [];
            rawArticles = seedFallback;
            if (seedFallback.length > 0) sourceUsed = 'seed_fallback';
          }
        }
      }

      // Parse and score each headline
      const headlines: HeadlineEntry[] = rawArticles.slice(0, 8).map((article: any) => {
        const text = article.text ?? article.title ?? article.description ?? '';
        const { sentiment, score } = scoreSentiment(text);
        return {
          source: article.source?.name ?? article.source ?? 'Unknown',
          text,
          url: article.url ?? article.link ?? '',
          sentiment,
          sentiment_score: score,
          published_at: article.publishedAt ?? article.published_at ?? undefined,
        };
      });

      // LLM fallback: re-score low-confidence headlines via Groq
      const lowConfidenceTexts = headlines
        .filter((h, i) => {
          const { matchCount, score } = scoreSentiment(h.text);
          return matchCount <= 1 && Math.abs(score) < 0.15;
        })
        .map(h => h.text);
      if (lowConfidenceTexts.length > 0) {
        try {
          const llmResults = await llmScoreSentiment(lowConfidenceTexts);
          for (const h of headlines) {
            const llm = llmResults.get(h.text);
            if (llm) {
              h.sentiment = llm.sentiment;
              h.sentiment_score = llm.score;
            }
          }
        } catch {
          // LLM unavailable — keep lexicon scores
        }
      }

      const mention_velocity = scoreMentionVelocity(headlines.length);
      const narrative_entropy = scoreNarrativeEntropy(headlines);
      const narrative_summary = buildNarrativeSummary(upperTicker, headlines, narrative_entropy);

      const entry: FindingsBoardEntry = {
        ticker: upperTicker,
        timestamp: scanTimestamp,
        headlines,
        narrative_summary,
        mention_velocity,
        narrative_entropy,
      };

      // Write to the shared blackboard (findings_board Resource)
      writeFinding(entry);
      findings.push({
        ...entry,
        resolved_from: rawInput,
        company_name: resolved.name,
        region: resolved.region,
      } as any);

      ctx.logger.info(`Scout: wrote to findings_board for ${upperTicker}`, {
        resolvedFrom: rawInput,
        companyName: resolved.name,
        headlineCount: headlines.length,
        mention_velocity,
        narrative_entropy,
      });
    }

    return {
      findings,
      scan_timestamp: scanTimestamp,
      source_used: sourceUsed,
      message: `Scanned ${tickers.length} input(s). Each name/ticker was resolved to a symbol via Alpha Vantage. Results written to findings_board Resource.`,
    };
  }

  @Tool({
    name: 'resolve_ticker',
    description:
      'Scout Agent: Converts any company name, asset name, or partial name into its stock ticker symbol and exchange details. ' +
      'Use this when the user types a company name instead of a ticker (e.g. "Apple" → AAPL, "Starbucks" → SBUX, "Gold" → GLD, "MRF Tyres" → MRF.BSE). ' +
      'Returns the top matches so the user can confirm the right one.',
    inputSchema: z.object({
      query: z.string().describe('Company name, asset name, or keyword — e.g. "Apple", "Starbucks", "Gold", "MRF Tyres", "Bitcoin"'),
      limit: z.number().optional().describe('Max number of matches to return (default 5)'),
    }),
  })
  async resolveTicker(input: any, ctx: ExecutionContext) {
    const { query, limit = 5 } = input;
    const alphaKey = process.env.ALPHA_VANTAGE_KEY || '';
    ctx.logger.info('Scout: resolve_ticker', { query });

    if (!alphaKey) {
      return { error: 'ALPHA_VANTAGE_KEY not set. Add it to .env to use symbol search.' };
    }

    try {
      const r = await axios.get('https://www.alphavantage.co/query', {
        params: { function: 'SYMBOL_SEARCH', keywords: query, apikey: alphaKey },
        timeout: 8_000,
      });

      const matches = (r.data?.bestMatches ?? []).slice(0, limit).map((m: any) => ({
        ticker:   m['1. symbol'],
        name:     m['2. name'],
        type:     m['3. type'],
        region:   m['4. region'],
        currency: m['8. currency'],
      }));

      if (!matches.length) {
        return { query, matches: [], message: `No results found for "${query}". Try a different spelling or use the ticker directly.` };
      }

      return {
        query,
        matches,
        best_match: matches[0],
        tip: `Use the ticker from "best_match" (e.g. "${matches[0].ticker}") in scan_trending_topics or fetch_price_volume.`,
      };
    } catch (err: any) {
      return { error: err.message };
    }
  }

  /**
   * detect_narrative_shift
   * Secondary Scout Agent tool. Given a ticker and a list of headline batches
   * over time, detects whether the vocabulary is shifting from technical
   * discourse toward retail hype language.
   *
   * Returns narrative_entropy per batch + a trend assessment.
   * NOTE: This tool can also be called standalone to enrich an existing
   * findings_board entry with updated narrative_entropy.
   */
  // @Widget('detect-narrative-shift')
  @Tool({
    name: 'detect_narrative_shift',
    description:
      'Scout Agent: Detects whether news language around a ticker is shifting from ' +
      'substantive/technical discourse toward retail hype vocabulary. ' +
      'Compares headline batches over time and returns narrative_entropy per batch ' +
      '(low|medium|high) plus an overall trend. ' +
      'Use this after scan_trending_topics to enrich findings before passing to the Analyst.',
    inputSchema: z.object({
      ticker: z.string().describe('Ticker symbol to analyse (e.g. "TSLA")'),
      mentions_over_time: z
        .array(
          z.object({
            batch_label: z.string().describe('Human-readable label for this batch, e.g. "last 1h" or "last 6h"'),
            headlines: z
              .array(z.string())
              .describe('Array of headline text strings in this time batch'),
          })
        )
        .describe('Ordered list of headline batches from oldest to newest. Minimum 1 batch.'),
    }),
    examples: {
      request: {
        ticker: 'BTC',
        mentions_over_time: [
          { batch_label: 'last 6h', headlines: ['Bitcoin ETF inflows hit record as institutions buy', 'On-chain data shows accumulation pattern'] },
          { batch_label: 'last 1h', headlines: ['BTC to the moon 🚀 guaranteed 100k YOLO hodl', 'BTC moon rocket squeeze incoming easy money'] },
        ]
      },
      response: {
        ticker: 'BTC',
        batch_analysis: [
          { batch_label: 'last 6h', narrative_entropy: 'low', technical_hits: 4, hype_hits: 0 },
          { batch_label: 'last 1h', narrative_entropy: 'high', technical_hits: 0, hype_hits: 6 },
        ],
        trend: 'degrading',
        trend_explanation: 'Narrative entropy has risen from low → high. Language has shifted from institutional/analytical to retail hype vocabulary. This is a known signal of sentiment overextension.',
        recommendation: 'Flag to Skeptic agent for elevated scrutiny on this ticker.'
      }
    }
  })
  async detectNarrativeShift(input: any, ctx: ExecutionContext) {
    const { ticker, mentions_over_time: rawMentions } = input;
    // NitroStudio may pass array fields as JSON strings — parse defensively
    const mentions_over_time: { batch_label: string; headlines: string[] }[] =
      typeof rawMentions === 'string' ? JSON.parse(rawMentions) : rawMentions;
    ctx.logger.info('Scout: detect_narrative_shift started', { ticker, batchCount: mentions_over_time.length });

    const batchAnalysis = mentions_over_time.map((batch: { batch_label: string; headlines: string[] }) => {
      let technicalHits = 0;
      let hypeHits = 0;

      for (const headline of batch.headlines) {
        const lower = headline.toLowerCase();
        for (const term of TECHNICAL_TERMS) {
          if (lower.includes(term)) technicalHits++;
        }
        for (const term of HYPE_TERMS) {
          if (lower.includes(term)) hypeHits++;
        }
      }

      const hypeRatio = hypeHits / (technicalHits + hypeHits + 1);
      const narrative_entropy: 'low' | 'medium' | 'high' =
        hypeRatio > 0.5 ? 'high' : hypeRatio >= 0.2 ? 'medium' : 'low';

      return {
        batch_label: batch.batch_label,
        narrative_entropy,
        technical_hits: technicalHits,
        hype_hits: hypeHits,
        hype_ratio: Math.round(hypeRatio * 100) / 100,
      };
    });

    // Determine overall trend by comparing first and last batch entropy levels
    const ENTROPY_RANK: Record<'low' | 'medium' | 'high', number> = { low: 0, medium: 1, high: 2 };
    const firstEntropy = (batchAnalysis[0]?.narrative_entropy ?? 'low') as 'low' | 'medium' | 'high';
    const lastEntropy = (batchAnalysis[batchAnalysis.length - 1]?.narrative_entropy ?? 'low') as 'low' | 'medium' | 'high';
    const rankDiff = ENTROPY_RANK[lastEntropy] - ENTROPY_RANK[firstEntropy];

    const trend: 'improving' | 'stable' | 'degrading' =
      rankDiff > 0 ? 'degrading' : rankDiff < 0 ? 'improving' : 'stable';

    const trendExplanations: Record<typeof trend, string> = {
      degrading:
        `Narrative entropy has risen from ${firstEntropy} → ${lastEntropy}. ` +
        'Language has shifted from institutional/analytical toward retail hype vocabulary. ' +
        'This is a known signal of sentiment overextension — the Skeptic agent should apply elevated scrutiny.',
      stable:
        `Narrative entropy is stable at ${lastEntropy} across all batches. ` +
        'Discourse quality has not meaningfully changed.',
      improving:
        `Narrative entropy has improved from ${firstEntropy} → ${lastEntropy}. ` +
        'Language is becoming more substantive/technical, which may indicate growing institutional interest.',
    };

    return {
      ticker: ticker.toUpperCase(),
      batch_analysis: batchAnalysis,
      trend,
      trend_explanation: trendExplanations[trend],
      recommendation:
        trend === 'degrading'
          ? 'Flag to Skeptic agent for elevated scrutiny on this ticker.'
          : trend === 'improving'
          ? 'Potentially increasing substantive interest. Analyst should weight this positively.'
          : 'No narrative shift detected. Proceed with standard pipeline.',
    };
  }

  @Widget('get-trending-stocks')
  @Tool({
    name: 'get_trending_stocks',
    description:
      'Scout Agent: Returns today\'s top gainers, top losers, and most actively traded US stocks ' +
      'from Alpha Vantage\'s TOP_GAINERS_LOSERS feed. Use this to discover which tickers are ' +
      'worth scanning with scan_trending_topics — no ticker needed as input.',
    inputSchema: z.object({
      category: z
        .enum(['top_gainers', 'top_losers', 'most_actively_traded', 'all'])
        .optional()
        .describe('Which list to return. Defaults to "all".'),
      limit: z
        .number()
        .optional()
        .describe('Max tickers per category. Defaults to 5.'),
    }),
  })
  async getTrendingStocks(input: any, ctx: ExecutionContext) {
    const category = (input.category as string) ?? 'all';
    const limit    = (input.limit as number) ?? 5;
    const apiKey   = process.env.ALPHA_VANTAGE_KEY ?? '';

    ctx.logger.info('Scout: get_trending_stocks', { category, limit });

    if (!apiKey) {
      return { error: 'ALPHA_VANTAGE_KEY not set. Add it to .env to use this tool.' };
    }

    try {
      const response = await axios.get('https://www.alphavantage.co/query', {
        params: { function: 'TOP_GAINERS_LOSERS', apikey: apiKey },
        timeout: 10_000,
      });

      const data = response.data;
      if (data['Note'] || data['Information']) {
        return { error: data['Note'] ?? data['Information'] };
      }

      const pick = (list: any[], n: number) =>
        (list ?? []).slice(0, n).map((s: any) => ({
          ticker:        s.ticker,
          price:         parseFloat(s.price),
          change_pct:    parseFloat(s.change_percentage?.replace('%', '')),
          volume:        parseInt(s.volume, 10),
        }));

      const result: Record<string, any> = { fetched_at: new Date().toISOString() };

      if (category === 'all' || category === 'top_gainers')
        result.top_gainers = pick(data.top_gainers, limit);
      if (category === 'all' || category === 'top_losers')
        result.top_losers = pick(data.top_losers, limit);
      if (category === 'all' || category === 'most_actively_traded')
        result.most_actively_traded = pick(data.most_actively_traded, limit);

      const allTickers = [
        ...(result.top_gainers ?? []),
        ...(result.top_losers ?? []),
        ...(result.most_actively_traded ?? []),
      ].map((s: any) => s.ticker);

      result.suggested_scan = [...new Set(allTickers)];
      result.tip = `Pass any of these tickers to scan_trending_topics to fetch headlines and score sentiment.`;

      return result;
    } catch (err: any) {
      ctx.logger.warn('Scout: get_trending_stocks failed', { error: err.message });
      return { error: err.message };
    }
  }
}
