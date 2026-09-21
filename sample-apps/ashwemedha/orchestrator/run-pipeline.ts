/**
 * orchestrator/run-pipeline.ts — Person 4
 *
 * Triggers Scout → Analyst → Skeptic in sequence for a given ticker.
 * Writes results to market-signal-mcp/src/data/runtime/ — the same files
 * the NitroStack MCP resources serve to the widget.
 *
 * Usage:
 *   npx ts-node run-pipeline.ts TSLA          ← live mode (real APIs)
 *   npx ts-node run-pipeline.ts TSLA --stub   ← stub mode (seed data)
 */

import * as fs from "fs";
import * as path from "path";
import axios from "axios";
import type {
  FindingsBoard,
  SignalLog,
  VerdictLog,
  PipelineState,
  AgentStage,
} from "./types";

// Load .env from parent directory
import "dotenv/config";

// ─── Config ───────────────────────────────────────────────────────────────────

// Runtime JSON files — shared with NitroStack resources and the widget
const RUNTIME_DIR  = path.join(__dirname, "../market-signal-mcp/src/data/runtime");
const SEED_DIR     = path.join(__dirname, "../market-signal-mcp/src/data");
const STATE_FILE   = path.join(__dirname, "pipeline-state.json");

const SCOUT_DELAY_MS   = 2000; // simulated thinking time between stages (widget UX)
const ANALYST_DELAY_MS = 2500;
const SKEPTIC_DELAY_MS = 2000;

// ─── Scoring constants (mirrors analyst.tools.ts — keep in sync) ──────────────

const SCORE_BASE               = 40;
const SCORE_VELOCITY_SPIKING   = 20;
const SCORE_VELOCITY_STEADY    = 8;
const SCORE_SENTIMENT_MAX      = 20;
const SCORE_PRICE_EARLY_WINDOW = 15;
const SCORE_PRICE_ALREADY_DONE = -20;
const SCORE_ENTROPY_HIGH       = -15;
const SCORE_ENTROPY_MEDIUM     = -5;
const MOVED_THRESHOLD_PCT      = 2.0;
const QUIET_THRESHOLD_PCT      = 0.5;

// ─── State persistence ────────────────────────────────────────────────────────

function readState(): PipelineState | null {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8")); } catch { return null; }
}

function writeState(state: PipelineState): void {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
  console.log(`[pipeline] Stage: ${state.stage.toUpperCase()}`);
}

function setStage(ticker: string, stage: AgentStage, partial: Partial<PipelineState> = {}): void {
  const prev = readState();
  writeState({
    ticker, stage,
    startedAt: prev?.startedAt ?? new Date().toISOString(),
    ...prev, ...partial,
    ...(stage === "done" || stage === "error" ? { completedAt: new Date().toISOString() } : {}),
  } as PipelineState);
}

// ─── Runtime file helpers ─────────────────────────────────────────────────────

function ensureRuntime(): void {
  if (!fs.existsSync(RUNTIME_DIR)) fs.mkdirSync(RUNTIME_DIR, { recursive: true });
}

function writeFindingsBoard(entry: FindingsBoard): void {
  ensureRuntime();
  const file = path.join(RUNTIME_DIR, "findings-board.json");
  let board: Record<string, FindingsBoard[]> = {};
  if (fs.existsSync(file)) { try { board = JSON.parse(fs.readFileSync(file, "utf-8")); } catch {} }
  if (!board[entry.ticker]) board[entry.ticker] = [];
  board[entry.ticker].unshift(entry);
  board[entry.ticker] = board[entry.ticker].slice(0, 10);
  fs.writeFileSync(file, JSON.stringify(board, null, 2), "utf-8");
}

function writeSignalLog(entry: SignalLog): void {
  ensureRuntime();
  const file = path.join(RUNTIME_DIR, "signal-log.json");
  let log: Record<string, SignalLog[]> = {};
  if (fs.existsSync(file)) { try { log = JSON.parse(fs.readFileSync(file, "utf-8")); } catch {} }
  if (!log[entry.ticker]) log[entry.ticker] = [];
  log[entry.ticker].unshift(entry);
  log[entry.ticker] = log[entry.ticker].slice(0, 10);
  fs.writeFileSync(file, JSON.stringify(log, null, 2), "utf-8");
}

function writeVerdictLog(entry: VerdictLog): void {
  ensureRuntime();
  const file = path.join(RUNTIME_DIR, "verdict-log.json");
  let log: Record<string, VerdictLog[]> = {};
  if (fs.existsSync(file)) { try { log = JSON.parse(fs.readFileSync(file, "utf-8")); } catch {} }
  if (!log[entry.ticker]) log[entry.ticker] = [];
  log[entry.ticker].unshift(entry);
  log[entry.ticker] = log[entry.ticker].slice(0, 10);
  fs.writeFileSync(file, JSON.stringify(log, null, 2), "utf-8");
}

// ─── Seed data loaders ────────────────────────────────────────────────────────

function loadSeedFindings(ticker: string): FindingsBoard {
  const all = JSON.parse(fs.readFileSync(path.join(SEED_DIR, "seed-news.json"), "utf-8"));
  const entries = all[ticker];
  if (!entries?.length) throw new Error(`No seed findings for ${ticker}`);
  return { ...entries[0], timestamp: new Date().toISOString() } as FindingsBoard;
}

function loadSeedSignal(ticker: string): SignalLog {
  const file = path.join(SEED_DIR, "seed-signals.json");
  if (!fs.existsSync(file)) {
    return { ticker, timestamp: new Date().toISOString(), price_reaction: "not_yet_reacted", signal_score: 60, signal_direction: "neutral", reasoning: "Seed signal (no seed-signals.json found)" };
  }
  const all = JSON.parse(fs.readFileSync(file, "utf-8"));
  if (!all[ticker]) throw new Error(`No seed signal for ${ticker}`);
  return { ...all[ticker], timestamp: new Date().toISOString() };
}

function loadSeedVerdict(ticker: string): VerdictLog {
  const file = path.join(SEED_DIR, "seed-verdicts.json");
  if (!fs.existsSync(file)) {
    return { ticker, timestamp: new Date().toISOString(), challenges_raised: [], credibility_check: "pass", recycled_content_check: "pass", volume_context_check: "organic", final_verdict: "confirmed_signal", verdict_reasoning: "Seed verdict (no seed-verdicts.json found)" };
  }
  const all = JSON.parse(fs.readFileSync(file, "utf-8"));
  if (!all[ticker]) throw new Error(`No seed verdict for ${ticker}`);
  return { ...all[ticker], timestamp: new Date().toISOString() };
}

// ─── Scout Agent (live) ───────────────────────────────────────────────────────

const POSITIVE_WORDS = ['record','growth','beat','surge','rise','gain','profit','rally','strong','bullish','exceeded','higher','upgrade','revenue','demand','expansion','milestone','breakthrough'];
const NEGATIVE_WORDS = ['fall','drop','decline','miss','loss','slump','concern','risk','bearish','crash','scrutiny','restriction','warning','cut','antitrust','tariff','ban','lower','missed','disappoint'];
const HYPE_WORDS_SET = new Set(['moon','rocket','yolo','guaranteed','lambo','100x','squeeze','mooning','explode','skyrocket','pump','parabolic','fomo','fud','diamond','ape','wagmi','hodl']);
const SUBSTANCE_SET  = new Set(['revenue','earnings','guidance','margin','eps','cash','flow','dividend','analyst','downgrade','upgrade','target','sec','filing','patent','acquisition','merger','regulation','compliance','quarterly','forecast','valuation']);

function scoreSentiment(text: string): { sentiment: "positive"|"negative"|"neutral"; score: number } {
  const lower = text.toLowerCase();
  let s = 0;
  for (const w of POSITIVE_WORDS) if (lower.includes(w)) s += 0.1;
  for (const w of NEGATIVE_WORDS) if (lower.includes(w)) s -= 0.1;
  s = Math.max(-1, Math.min(1, Math.round(s * 10) / 10));
  return { sentiment: s > 0.1 ? "positive" : s < -0.1 ? "negative" : "neutral", score: s };
}

function narrativeEntropy(headlines: string[]): "low"|"medium"|"high" {
  const words = headlines.join(" ").toLowerCase().split(/\s+/);
  let hype = 0, sub = 0;
  for (const w of words) {
    const clean = w.replace(/[^a-z]/g, "");
    if (HYPE_WORDS_SET.has(clean)) hype++;
    if (SUBSTANCE_SET.has(clean)) sub++;
  }
  const ratio = hype / (hype + sub + 1);
  return ratio > 0.5 ? "high" : ratio >= 0.2 ? "medium" : "low";
}

// Resolves any input (company name OR ticker) to canonical symbol + name.
// Uses two-mode matching:
//   TICKER mode ("AAPL") — requires exact symbol match from SYMBOL_SEARCH results
//   NAME mode  ("Apple") — scores all results by name similarity; picks closest match
//   so "Apple" → AAPL (Apple Inc), not APLE (Apple Hospitality REIT)

const _resolveCache: Record<string, { symbol: string; name: string; region: string }> = {};

function _nameMatchScore(input: string, companyName: string): number {
  const inputWords = input.toLowerCase().split(/\s+/).filter(Boolean);
  const nameWords  = companyName.toLowerCase().split(/\s+/).filter(Boolean);
  const matched    = inputWords.filter(w => nameWords.some(n => n.startsWith(w))).length;
  return (matched / Math.max(inputWords.length, 1)) * 100 + (1 / Math.max(nameWords.length, 1)) * 10;
}

function _pickBest(input: string, matches: any[]): any {
  if (!matches.length) return null;
  const trimmed = input.trim();
  // Ticker mode only when user typed ALL-CAPS (e.g. "AAPL", "BTC", "RELIANCE")
  // "Apple" has lowercase → not ticker mode → name scoring instead
  const isTickerInput = /^[A-Z0-9]{1,12}(\.[A-Z]{1,4})?$/.test(trimmed);
  if (isTickerInput) {
    const exact = matches.find((m: any) => m["1. symbol"].toUpperCase() === trimmed.toUpperCase());
    if (exact) return exact;
    // No exact match — fall through to name scoring
  }
  return matches.reduce((best: any, m: any) => {
    if (!best) return m;
    return _nameMatchScore(input, m["2. name"]) > _nameMatchScore(input, best["2. name"]) ? m : best;
  }, null);
}

async function resolveToSymbol(userInput: string, apiKey: string): Promise<{ symbol: string; name: string; region: string }> {
  const key = userInput.trim().toLowerCase();
  if (_resolveCache[key]) return _resolveCache[key];
  if (apiKey) {
    try {
      const r = await axios.get("https://www.alphavantage.co/query", {
        params: { function: "SYMBOL_SEARCH", keywords: userInput.trim(), apikey: apiKey },
        timeout: 6_000,
      });
      const best = _pickBest(userInput.trim(), r.data?.bestMatches ?? []);
      if (best) {
        const result = { symbol: best["1. symbol"], name: best["2. name"], region: best["4. region"] ?? "Unknown" };
        _resolveCache[key] = result;
        return result;
      }
    } catch { /* fall through */ }
  }
  const fallback = { symbol: userInput.toUpperCase(), name: userInput, region: "Unknown" };
  _resolveCache[key] = fallback;
  return fallback;
}

async function buildSearchQuery(userInput: string, apiKey: string): Promise<string> {
  const { symbol, name } = await resolveToSymbol(userInput, apiKey);
  // Quote the ticker so the news API returns articles that actually mention it,
  // not tangentially related results from a polluted company-name query.
  return name === userInput.toUpperCase()
    ? `"${symbol}" stock`
    : `"${symbol}" OR "${name}"`;
}

async function runScoutLive(ticker: string): Promise<FindingsBoard> {
  console.log(`\n[Scout] Fetching live news for ${ticker}...`);
  const newsApiKey = process.env.NEWS_API_KEY || process.env.NEWSAPI_KEY || "";
  const gnewsKey   = process.env.GNEWS_API_KEY || "";
  const alphaKey   = process.env.ALPHA_VANTAGE_KEY || "";
  const query = await buildSearchQuery(ticker, alphaKey);
  console.log(`[Scout] Search query: "${query}"`);

  let articles: any[] = [];

  if (newsApiKey) {
    try {
      const r = await axios.get("https://newsapi.org/v2/everything", {
        params: { q: query, language: "en", sortBy: "publishedAt", pageSize: 10, apiKey: newsApiKey },
        timeout: 10_000,
      });
      articles = r.data.articles ?? [];
      console.log(`[Scout] NewsAPI: ${articles.length} articles for ${ticker}`);
    } catch (e: any) { console.warn(`[Scout] NewsAPI failed: ${e.message}`); }
  }

  if (!articles.length && gnewsKey) {
    try {
      const r = await axios.get("https://gnews.io/api/v4/search", {
        params: { q: query, lang: "en", max: 10, token: gnewsKey },
        timeout: 10_000,
      });
      articles = (r.data.articles ?? []).map((a: any) => ({ ...a, source: { name: a.source?.name ?? "GNews" }, title: a.title }));
      console.log(`[Scout] GNews: ${articles.length} articles for ${ticker}`);
    } catch (e: any) { console.warn(`[Scout] GNews failed: ${e.message}`); }
  }

  if (!articles.length) {
    console.warn(`[Scout] Both APIs failed — using seed data for ${ticker}`);
    return loadSeedFindings(ticker);
  }

  const headlines = articles.slice(0, 8).map((a: any) => {
    const text = `${a.title ?? ""} ${a.description ?? ""}`.trim();
    const { sentiment, score } = scoreSentiment(text);
    return { source: (a.source?.name ?? "unknown").toLowerCase().replace(/\s+/g, ""), text: a.title ?? text, url: a.url ?? "", sentiment, sentiment_score: score, published_at: a.publishedAt ?? a.published_at ?? undefined };
  });

  const velocity = headlines.length >= 5 ? "spiking" : headlines.length >= 2 ? "steady" : "declining";
  const entropy  = narrativeEntropy(headlines.map(h => h.text));
  const posCount = headlines.filter(h => h.sentiment === "positive").length;
  const negCount = headlines.filter(h => h.sentiment === "negative").length;
  const sentimentWord = posCount > negCount * 1.5 ? "predominantly positive" : negCount > posCount * 1.5 ? "predominantly negative" : "mixed";

  return {
    ticker, timestamp: new Date().toISOString(), headlines,
    narrative_summary: `${headlines.length} headlines for ${ticker}, sentiment is ${sentimentWord} (${posCount} pos, ${negCount} neg). Narrative entropy: ${entropy}.`,
    mention_velocity: velocity, narrative_entropy: entropy,
  } as FindingsBoard;
}

// ─── Analyst Agent (live) ─────────────────────────────────────────────────────

// Known CoinGecko IDs; unknown crypto tickers use a search fallback
const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin", ETH: "ethereum", SOL: "solana", XRP: "ripple",
  DOGE: "dogecoin", ADA: "cardano", AVAX: "avalanche-2", DOT: "polkadot",
  LINK: "chainlink", MATIC: "matic-network", LTC: "litecoin", BNB: "binancecoin",
};

const CRYPTO_TICKERS = new Set(Object.keys(COINGECKO_IDS));

async function resolveCoinGeckoId(ticker: string): Promise<string | null> {
  if (COINGECKO_IDS[ticker]) return COINGECKO_IDS[ticker];
  try {
    const r = await axios.get("https://api.coingecko.com/api/v3/search", {
      params: { query: ticker }, timeout: 8_000,
    });
    const coin = (r.data.coins ?? [])[0];
    return coin?.id ?? null;
  } catch { return null; }
}

async function fetchPriceLive(ticker: string): Promise<{ change_pct: number; price: number } | null> {
  const apiKey = process.env.ALPHA_VANTAGE_KEY || "";
  // Crypto detection: known set first, then try CoinGecko search as fallback
  const isCrypto = CRYPTO_TICKERS.has(ticker);

  try {
    if (isCrypto) {
      const coinId = await resolveCoinGeckoId(ticker);
      if (!coinId) return null;
      const r = await axios.get("https://api.coingecko.com/api/v3/simple/price", {
        params: { ids: coinId, vs_currencies: "usd", include_24hr_change: true },
        timeout: 8_000,
      });
      const data = r.data[coinId];
      return { price: data?.usd ?? 0, change_pct: data?.usd_24h_change ?? 0 };
    } else if (apiKey) {
      const r = await axios.get("https://www.alphavantage.co/query", {
        params: { function: "GLOBAL_QUOTE", symbol: ticker, apikey: apiKey },
        timeout: 8_000,
      });
      const q = r.data["Global Quote"];
      if (q?.["05. price"]) {
        return { price: parseFloat(q["05. price"]), change_pct: parseFloat(q["10. change percent"].replace("%","")) };
      }
    }
  } catch (e: any) { console.warn(`[Analyst] Price fetch failed: ${e.message}`); }
  return null;
}

async function runAnalystLive(ticker: string, findings: FindingsBoard): Promise<SignalLog> {
  console.log(`\n[Analyst] Scoring signal for ${ticker}...`);
  const priceData = await fetchPriceLive(ticker);

  const absChange = Math.abs(priceData?.change_pct ?? 0);
  let price_reaction: "already_moved"|"moving_now"|"not_yet_reacted";
  if (absChange > MOVED_THRESHOLD_PCT) price_reaction = "already_moved";
  else if (findings.mention_velocity === "spiking" && absChange < QUIET_THRESHOLD_PCT) price_reaction = "not_yet_reacted";
  else price_reaction = "moving_now";

  let score = SCORE_BASE;
  const breakdown: string[] = [];

  if (findings.mention_velocity === "spiking")      { score += SCORE_VELOCITY_SPIKING;   breakdown.push(`velocity +${SCORE_VELOCITY_SPIKING}`); }
  else if (findings.mention_velocity === "steady")  { score += SCORE_VELOCITY_STEADY;    breakdown.push(`velocity +${SCORE_VELOCITY_STEADY}`); }

  const avgSentiment = (findings as any).headlines?.length
    ? (findings as any).headlines.reduce((s: number, h: any) => s + (h.sentiment_score ?? 0), 0) / (findings as any).headlines.length
    : 0;
  const sentBonus = Math.round(avgSentiment * SCORE_SENTIMENT_MAX);
  score += sentBonus;
  breakdown.push(`sentiment ${sentBonus > 0 ? "+" : ""}${sentBonus}`);

  if ((findings as any).narrative_entropy === "high")   { score += SCORE_ENTROPY_HIGH;   breakdown.push(`entropy ${SCORE_ENTROPY_HIGH}`); }
  else if ((findings as any).narrative_entropy === "medium") { score += SCORE_ENTROPY_MEDIUM; breakdown.push(`entropy ${SCORE_ENTROPY_MEDIUM}`); }

  if (price_reaction === "not_yet_reacted") { score += SCORE_PRICE_EARLY_WINDOW; breakdown.push(`early window +${SCORE_PRICE_EARLY_WINDOW}`); }
  else if (price_reaction === "already_moved") { score += SCORE_PRICE_ALREADY_DONE; breakdown.push(`already moved ${SCORE_PRICE_ALREADY_DONE}`); }

  score = Math.max(0, Math.min(100, score));

  const signal_direction: "bullish"|"bearish"|"neutral" =
    score > 60 && avgSentiment > 0.05 ? "bullish" :
    score < 35 || avgSentiment < -0.05 ? "bearish" : "neutral";

  const changeLine = priceData ? ` Price ${priceData.change_pct > 0 ? "+" : ""}${priceData.change_pct.toFixed(2)}% today.` : " (Price data unavailable.)";
  const reasoning = `Signal ${score}/100 (${breakdown.join(", ")}).${changeLine} ${findings.narrative_summary}`;

  console.log(`[Analyst] Score: ${score}/100 | ${signal_direction.toUpperCase()} | ${price_reaction}`);

  return { ticker, timestamp: new Date().toISOString(), price_reaction, signal_score: score, signal_direction, reasoning };
}

// ─── Skeptic Agent (live) ─────────────────────────────────────────────────────

const CREDIBILITY = JSON.parse(fs.readFileSync(path.join(__dirname, "../market-signal-mcp/src/data/source-credibility.json"), "utf-8")) as {
  tiers: { high: string[]; medium: string[]; low: string[]; press_release_mills: string[] };
};

const MARKET_CAL = JSON.parse(fs.readFileSync(path.join(__dirname, "../market-signal-mcp/src/data/market-calendar.json"), "utf-8")) as {
  events: Record<string, { date: string; type: string; description: string }[]>;
};

const STOPWORDS_SET = new Set(["a","an","the","is","are","was","were","be","have","has","and","but","or","in","on","at","to","for","of","with","by","this","that","it","its","says","said"]);

function tokenize(text: string): Set<string> {
  return new Set(text.toLowerCase().replace(/[^a-z0-9\s]/g," ").split(/\s+/).filter(w => w.length > 2 && !STOPWORDS_SET.has(w)));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size && !b.size) return 1;
  if (!a.size || !b.size) return 0;
  let inter = 0; for (const w of a) if (b.has(w)) inter++;
  return inter / (a.size + b.size - inter);
}

function daysBetween(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86_400_000;
}

async function runSkepticLive(ticker: string, findings: FindingsBoard, signal: SignalLog): Promise<VerdictLog> {
  console.log(`\n[Skeptic] Challenging signal for ${ticker} (score: ${signal.signal_score}/100)...`);
  const challenges: string[] = [];
  const { tiers } = CREDIBILITY;

  // Hard Check 1: Source Credibility
  let flagged = 0, mills = 0;
  for (const h of (findings as any).headlines ?? []) {
    const d = (h.source ?? "").toLowerCase().replace(/^www\./,"");
    if (tiers.press_release_mills.includes(d)) { mills++; flagged++; }
    else if (tiers.low.includes(d) || (!tiers.high.includes(d) && !tiers.medium.includes(d))) flagged++;
  }
  const total = (findings as any).headlines?.length ?? 1;
  const credibility_check: "pass"|"flagged" = mills > 0 || flagged > total / 2 ? "flagged" : "pass";
  if (credibility_check === "flagged") {
    challenges.push(mills > 0
      ? `${mills} headline(s) from press release mills — company self-reported, not independently verified.`
      : `${flagged}/${total} sources are low-credibility or unknown.`);
  }

  // Hard Check 2: Recycled Content
  const texts: string[] = (findings as any).headlines?.map((h: any) => h.text) ?? [];
  let recycled = 0;
  for (let i = 0; i < texts.length; i++) {
    const others = texts.filter((_,j) => j !== i);
    const maxSim = Math.max(0, ...others.map(o => jaccard(tokenize(texts[i]), tokenize(o))));
    if (maxSim >= 0.65) recycled++;
  }
  const recycled_content_check: "pass"|"flagged" = recycled > Math.ceil(texts.length * 0.3) ? "flagged" : "pass";
  if (recycled_content_check === "flagged") {
    challenges.push(`${recycled}/${texts.length} headlines show high similarity — may be recycled to inflate coverage breadth.`);
  }

  // Hard Check 3: Volume Context
  const eventDate = findings.timestamp.split("T")[0];
  const allEvents = [...(MARKET_CAL.events[ticker] ?? []), ...(MARKET_CAL.events["MARKET"] ?? [])];
  let volume_context_check: "organic"|"explained_by_calendar_event" = "organic";
  let matchedEvent: { type: string; date: string; description: string } | null = null;
  for (const ev of allEvents) {
    if (daysBetween(eventDate, ev.date) <= 2) { volume_context_check = "explained_by_calendar_event"; matchedEvent = ev; break; }
  }
  if (matchedEvent) {
    challenges.push(`Volume coincides with a scheduled ${matchedEvent.type}: "${matchedEvent.description}" (${matchedEvent.date}).`);
  }

  // Advisory: Narrative Entropy
  const words = texts.join(" ").toLowerCase().split(/\s+/);
  const hype = words.filter(w => HYPE_WORDS_SET.has(w.replace(/[^a-z]/g,""))).length;
  const sub  = words.filter(w => SUBSTANCE_SET.has(w.replace(/[^a-z]/g,""))).length;
  const hypeRatio = hype / (hype + sub + 1);
  if (hypeRatio > 0.5) challenges.push(`Narrative entropy HIGH (${(hypeRatio*100).toFixed(0)}% hype vocabulary) — chatter shifted to retail buzzwords.`);

  const hardFlags = [credibility_check==="flagged", recycled_content_check==="flagged", volume_context_check==="explained_by_calendar_event"].filter(Boolean).length;
  const final_verdict = hardFlags === 0 ? "confirmed_signal" : hardFlags === 1 ? "weakened_signal" : "rejected_signal";
  const dir = signal.signal_direction === "bullish" ? "bullish" : signal.signal_direction === "bearish" ? "bearish" : "neutral";

  const verdict_reasoning =
    final_verdict === "confirmed_signal" ? `All Skeptic checks passed for ${ticker}. The Analyst's ${dir} signal (${signal.signal_score}/100) stands.` :
    final_verdict === "weakened_signal"  ? `${dir.toUpperCase()} signal for ${ticker} (${signal.signal_score}/100) WEAKENED: ${challenges[0]}` :
    `${dir.toUpperCase()} signal for ${ticker} (${signal.signal_score}/100) REJECTED. ${hardFlags} checks failed: ${challenges.slice(0,3).join(" | ")}`;

  console.log(`[Skeptic] Verdict: ${final_verdict.toUpperCase()} | ${hardFlags} flags | ${challenges.length} challenges`);

  return { ticker, timestamp: new Date().toISOString(), challenges_raised: challenges, credibility_check, recycled_content_check, volume_context_check, final_verdict, verdict_reasoning };
}

// ─── Main pipeline ─────────────────────────────────────────────────────────────

async function runPipeline(ticker: string, stub: boolean): Promise<void> {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  Multi-Agent Signal Pipeline — ${ticker}`);
  console.log(`  Mode: ${stub ? "STUB (seed data)" : "LIVE (real APIs)"}`);
  console.log(`${"═".repeat(60)}\n`);

  // ── Scout ──────────────────────────────────────────────────────────────────
  setStage(ticker, "scout", { startedAt: new Date().toISOString() });
  let findings: FindingsBoard;
  try {
    findings = stub ? loadSeedFindings(ticker) : await runScoutLive(ticker);
    if (stub) await sleep(SCOUT_DELAY_MS);
    writeFindingsBoard(findings);
    console.log(`[Scout] Written to findings_board: ${(findings as any).headlines?.length ?? 0} headlines, velocity=${findings.mention_velocity}`);
    setStage(ticker, "analyst", { findings });
  } catch (err: any) {
    setStage(ticker, "error", { error: `Scout failed: ${err.message}` });
    console.error(`[pipeline] Scout failed: ${err.message}`);
    process.exit(1);
  }

  await sleep(stub ? ANALYST_DELAY_MS : 500);

  // ── Analyst ────────────────────────────────────────────────────────────────
  let signal: SignalLog;
  try {
    signal = stub ? loadSeedSignal(ticker) : await runAnalystLive(ticker, findings);
    if (stub) await sleep(ANALYST_DELAY_MS);
    writeSignalLog(signal);
    console.log(`[Analyst] Written to signal_log: score=${signal.signal_score}, direction=${signal.signal_direction}`);
    setStage(ticker, "skeptic", { findings, signal });
  } catch (err: any) {
    setStage(ticker, "error", { error: `Analyst failed: ${err.message}` });
    console.error(`[pipeline] Analyst failed: ${err.message}`);
    process.exit(1);
  }

  await sleep(stub ? SKEPTIC_DELAY_MS : 300);

  // ── Skeptic ────────────────────────────────────────────────────────────────
  let verdict: VerdictLog;
  try {
    verdict = stub ? loadSeedVerdict(ticker) : await runSkepticLive(ticker, findings, signal);
    if (stub) await sleep(SKEPTIC_DELAY_MS);
    writeVerdictLog(verdict);
    console.log(`[Skeptic] Written to verdict_log: ${verdict.final_verdict}`);
    setStage(ticker, "done", { findings, signal, verdict });
  } catch (err: any) {
    setStage(ticker, "error", { error: `Skeptic failed: ${err.message}` });
    console.error(`[pipeline] Skeptic failed: ${err.message}`);
    process.exit(1);
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  Pipeline complete for ${ticker}`);
  console.log(`  Signal : ${signal.signal_score}/100 ${signal.signal_direction.toUpperCase()}`);
  console.log(`  Verdict: ${verdict.final_verdict.toUpperCase()}`);
  if (verdict.challenges_raised.length) {
    verdict.challenges_raised.forEach(c => console.log(`    ⚠  ${c}`));
  }
  console.log(`${"═".repeat(60)}\n`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── CLI entry ─────────────────────────────────────────────────────────────────
// Accepts: ticker symbol (AAPL), company name (Apple), or multi-word name ("MRF Tyres")
// Examples:
//   npx ts-node run-pipeline.ts AAPL
//   npx ts-node run-pipeline.ts Apple
//   npx ts-node run-pipeline.ts "Starbucks"
//   npx ts-node run-pipeline.ts Gold
//   npx ts-node run-pipeline.ts "MRF Tyres"

const args     = process.argv.slice(2);
const flagArgs = args.filter(a => a.startsWith("--"));
const nameArgs = args.filter(a => !a.startsWith("--"));
const rawInput = nameArgs.join(" ").trim() || "TSLA";
const stubMode = flagArgs.includes("--stub");

async function main() {
  const alphaKey = process.env.ALPHA_VANTAGE_KEY || "";
  let ticker = rawInput.toUpperCase();

  if (!stubMode) {
    const resolved = await resolveToSymbol(rawInput, alphaKey);
    ticker = resolved.symbol;
    if (resolved.name !== rawInput.toUpperCase()) {
      console.log(`[pipeline] Resolved "${rawInput}" → ${ticker} (${resolved.name}, ${resolved.region})`);
    }
  }

  await runPipeline(ticker, stubMode);
}

main().catch(err => {
  console.error("[pipeline] Unhandled error:", err);
  process.exit(1);
});
