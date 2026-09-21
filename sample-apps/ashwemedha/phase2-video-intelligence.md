# Phase 2 — Video Prediction Intelligence Pipeline

> **Status:** Design finalized. Ready to split across 4 engineers.
> **Prerequisite:** Phase 1 (Scout / Analyst / Skeptic) is running and stable.
> **Timeframe assumption:** 2 weeks (10 working days) with 4 engineers in parallel.

---

## 1. What we're building (vision)

Phase 1 lets a user pass a **ticker or company name** into the pipeline and get a
reasoned buy / watch / sell verdict backed by news + price + skepticism.

Phase 2 extends the same pipeline to accept a **video URL** (YouTube, X/Twitter,
TikTok, Instagram Reels) containing a stock prediction — e.g. someone in a short
video says *"NVIDIA is going to rip tomorrow because Jensen speaks at the AI
Summit."*

The system must:

1. **Transcribe** the video (speech-to-text).
2. **Extract** the structured claim (ticker, direction, timeframe, reasoning, who
   said it).
3. **Validate** the claim against real data — is the stock real, is there a
   catalyst on the calendar, do historical patterns support this kind of move?
4. **Judge the source** — does this person / channel have a track record of
   correct predictions? What is their platform authority?
5. **Aggregate** everything into one **confidence score (0–100)** with a full
   breakdown so the user can see *why* the score is what it is.

The output should look like:

> **NVDA — Prediction: UP (by 2026-07-27)**
> **Confidence: 78 / 100 — MODERATE-HIGH**
>   • Signal score: 28 / 35   (bullish sentiment, spiking mentions)
>   • Calendar alignment: 25 / 30   (Jensen's AI Summit keynote confirmed 2026-07-27)
>   • Predictor accuracy: 20 / 25   (@chartguy has 12 correct / 15 tracked predictions)
>   • Platform authority: 5 / 10    (58k followers, verified, 3-year-old account)
> **Verdict:** Prediction is well-aligned with a known catalyst and comes from a
> creator with a strong track record. Historically, NVDA has moved +3–7% around
> Jensen keynotes (5 of last 6 occurrences).

**Framing discipline (same as Phase 1):** we surface reasoning to support a
human decision. We do not claim predictive accuracy.

---

## 2. End-to-end pipeline

```
Video URL (YouTube / X / TikTok / Instagram Reels)
        │
        ▼
┌─────────────────────────┐
│  VIDEO INGESTION AGENT  │  → extract audio track
│  yt-dlp + Whisper STT   │  → speech-to-text transcript
└─────────┬───────────────┘
          │  raw transcript + video metadata
          ▼
┌─────────────────────────┐
│  CONTEXT EXTRACTION     │  → ticker / company name
│  AGENT (Claude LLM)     │  → direction: UP / DOWN
│                         │  → timeframe (absolute date)
│                         │  → reason given
│                         │  → predictor name + platform
└─────────┬───────────────┘
          │  structured claim  →  writes to video_claims Resource
          ▼
   ┌──────┴──────────────────────────────────────────┐
   ▼                                                  ▼
┌────────────────────┐                  ┌─────────────────────────┐
│  SIGNAL VALIDATION │                  │  PREDICTOR CREDIBILITY  │
│  AGENT             │                  │  AGENT                  │
│                    │                  │                         │
│  • Stock exists?   │                  │  • Who are they?        │
│  • Calendar event  │                  │  • Past predictions     │
│    on the date?    │                  │  • Accuracy rate        │
│  • Historical      │                  │  • Platform authority   │
│    correlation     │                  │                         │
└──────────┬─────────┘                  └─────────────┬───────────┘
   writes to                                    writes to
   calendar_events +                            predictor_profiles
   correlation_matches                          Resource
           │                                            │
           └───────────────┬────────────────────────────┘
                           ▼
             ┌─────────────────────────┐
             │  CONFIDENCE AGGREGATOR  │
             │  (enhanced Skeptic)     │
             │                         │
             │  final_score =          │
             │    signal    (0–35)     │
             │  + calendar  (0–30)     │
             │  + predictor (0–25)     │
             │  + platform  (0–10)     │
             │  ─────────────── /100   │
             │                         │
             │  writes to              │
             │  video_verdict Resource │
             └─────────────────────────┘
                           │
                           ▼
                 Widget renders full breakdown
```

---

## 3. Shared data contracts (agree on these BEFORE coding)

These are the JSON shapes that flow between agents through MCP Resources.
**Don't change them without team-wide sign-off.** Any change forces every other
person to update their code.

### 3.1 `VideoManifest` (Person 1 → all)

Produced by `ingest_video`, consumed by everyone downstream.

```typescript
interface VideoManifest {
  video_id:       string;               // stable hash of URL, primary key
  source_url:     string;
  platform:       'youtube' | 'twitter' | 'tiktok' | 'instagram' | 'other';
  title?:         string;
  channel_name?:  string;
  channel_handle?:string;               // @username where possible
  channel_id?:    string;               // platform-native ID
  posted_at?:     string;               // ISO 8601
  duration_sec?:  number;
  transcript:     string;               // full plain-text transcript
  transcript_segments?: {               // optional word-level timing for UI highlighting
    start_sec: number;
    end_sec:   number;
    text:      string;
  }[];
  fetched_at:     string;               // ISO 8601
}
```

### 3.2 `StockClaim` (Person 1 → Persons 2, 3, 4)

Produced by `extract_stock_claim`.

```typescript
interface StockClaim {
  video_id:               string;       // FK to VideoManifest
  ticker:                 string;       // canonical, resolved via Phase-1 resolve_ticker
  company_name:           string;
  direction:              'up' | 'down' | 'neutral';
  timeframe_iso:          string;       // absolute date, e.g. "2026-07-27"
  timeframe_hint_raw:     string;       // what the speaker literally said, e.g. "tomorrow"
  reason_given?:          string;       // free-text reason from transcript
  predictor_name:         string;       // display name
  predictor_handle:       string;       // @handle
  platform:               VideoManifest['platform'];
  extraction_confidence:  'high' | 'medium' | 'low';
  transcript_evidence:    string;       // the specific sentence(s) the claim came from
}
```

### 3.3 `CalendarCheckResult` (Person 2 → Person 4)

```typescript
interface CalendarCheckResult {
  video_id:  string;
  ticker:    string;
  events_in_window: {
    type:        'earnings' | 'fed_meeting' | 'cpi' | 'product_launch' | 'conference' | 'other';
    date:        string;                // ISO 8601
    source:      string;                // 'finnhub' | 'fred' | 'av_news' | ...
    description: string;
  }[];
  historically_correlated: boolean;     // has this event type moved this ticker before?
  correlation_strength:    number;      // 0–1 score
  calendar_alignment_score: number;     // 0–30 (feeds into aggregator)
  reasoning: string;                    // human-readable justification
}
```

### 3.4 `PredictorProfile` (Person 3 → Person 4)

```typescript
interface PredictorProfile {
  handle:              string;
  platform:            VideoManifest['platform'];
  display_name?:       string;
  follower_count?:     number;
  account_age_years?:  number;
  verified?:           boolean;
  past_predictions_sampled: {
    date_made:      string;
    ticker:         string;
    direction:      'up' | 'down';
    timeframe_iso:  string;
    outcome:        'correct' | 'incorrect' | 'unclear' | 'pending';
    evidence_url?:  string;
  }[];
  accuracy_rate?:      number;          // 0–1  = correct / (correct + incorrect)
  sample_size:         number;
  predictor_score:     number;          // 0–25 (feeds into aggregator)
  platform_score:      number;          // 0–10 (feeds into aggregator)
  reasoning:           string;
}
```

### 3.5 `VideoVerdict` (Person 4 → widget)

```typescript
interface VideoVerdict {
  video_id:      string;
  claim:         StockClaim;
  final_score:   number;                // 0–100
  band:          'HIGH' | 'MODERATE' | 'WEAK' | 'DISMISS';
  breakdown: {
    signal_score:          number;      // 0–35
    calendar_alignment:    number;      // 0–30
    predictor_accuracy:    number;      // 0–25
    platform_authority:    number;      // 0–10
  };
  calendar_evidence?:      CalendarCheckResult;
  predictor_evidence?:     PredictorProfile;
  signal_evidence?:        any;         // Phase-1 signal_log entry
  reasoning_narrative:     string;      // paragraph explanation for judges/users
  contrarian_or_consensus: 'contrarian' | 'consensus' | 'unclear';
  generated_at:            string;
}
```

### 3.6 New MCP Resources (blackboard entries)

Mirroring Phase 1's `findings_board` / `signal_log` / `verdict_log`:

| Resource URI                    | Owner    | Consumers          | Content            |
| ------------------------------- | -------- | ------------------ | ------------------ |
| `video://manifests`             | Person 1 | Persons 2, 3, 4    | `VideoManifest[]`  |
| `video://claims`                | Person 1 | Persons 2, 3, 4    | `StockClaim[]`     |
| `video://calendar-checks`       | Person 2 | Person 4           | `CalendarCheckResult[]` |
| `video://predictor-profiles`    | Person 3 | Person 4           | `PredictorProfile[]` |
| `video://verdicts`              | Person 4 | Widget             | `VideoVerdict[]`   |

---

## 4. Work split — 4 engineers, clear ownership

Each person owns their agent end-to-end: schemas, MCP tool code, tests, and
documentation for their module. Cross-team coordination happens *only* at the
data contracts above.

Persons are ordered by dependency depth — Person 1 has to land first for
Persons 2/3/4 to unblock, but 2/3 can develop against **mocked** `StockClaim`
fixtures in parallel from day 1.

---

### PERSON 1 — Video Ingestion + Context Extraction Agent

**Owns:** `market-signal-mcp/src/modules/video-ingest/` (new module)
**Depends on:** Nothing (front door of the pipeline)
**Unblocks:** Everyone else

#### 4.1.1 Responsibilities

1. Accept a video URL from any of the 4 supported platforms.
2. Download the audio track only (no video — bandwidth + storage).
3. Run speech-to-text and produce a clean plain-text transcript with optional
   word-level timing.
4. Extract structured metadata (channel handle, posted-at, title) from the
   platform.
5. Call an LLM (Claude via `@anthropic-ai/sdk` or via the NitroStack agent) to
   turn the transcript into a `StockClaim`.
6. Validate the extracted ticker against Phase-1's `resolve_ticker` tool. If no
   ticker resolves → mark claim as `extraction_confidence: 'low'` and set a
   `rejected_reason` so downstream agents skip cleanly.

#### 4.1.2 Files to create

```
market-signal-mcp/src/modules/video-ingest/
├── video-ingest.module.ts         # @McpApp registration
├── video-ingest.tools.ts          # @Tool decorators
├── ingest.impl.ts                 # yt-dlp wrapper + Whisper wrapper
├── claim-extraction.impl.ts       # Claude prompt + parser
├── manifests.resource.ts          # video://manifests
├── claims.resource.ts             # video://claims
└── __tests__/
    ├── ingest.test.ts             # test against 3 known-good fixture URLs
    └── extraction.test.ts         # test against 5 fixture transcripts
```

#### 4.1.3 MCP tools to build

| Tool                    | Input                              | Output                                             |
| ----------------------- | ---------------------------------- | -------------------------------------------------- |
| `ingest_video`          | `{ url: string }`                  | `VideoManifest`                                    |
| `extract_stock_claim`   | `{ video_id: string }`             | `StockClaim` (or `{ rejected_reason: string }`)   |
| `list_video_manifests`  | `{ limit?: number }`               | `VideoManifest[]` from resource                    |
| `list_video_claims`     | `{ ticker?: string }`              | `StockClaim[]` from resource                       |

#### 4.1.4 Concrete task breakdown

- [ ] **Day 1:** Install `yt-dlp` binary + Node wrapper (`yt-dlp-exec`). Confirm
      audio extraction works on 1 YouTube + 1 X post + 1 TikTok video.
- [ ] **Day 2:** Install Whisper. Decide: local `whisper.cpp` (offline, free) vs
      OpenAI Whisper API (paid, faster). Recommendation: `whisper.cpp` with
      `base.en` model — free, fast enough for demo. Fall back to OpenAI Whisper
      API if a longer video needs speed.
- [ ] **Day 3:** Wire `ingest_video` end-to-end: URL → audio → transcript →
      write to `video://manifests`.
- [ ] **Day 4:** Write the Claude extraction prompt (see template below). Wire
      `extract_stock_claim` end-to-end.
- [ ] **Day 5:** Validate ticker via Phase-1's `resolve_ticker`. Publish
      fixtures (5 transcripts + expected claims) into `src/data/fixtures/` so
      Persons 2/3/4 can develop against real shapes.
- [ ] **Days 6–8:** Handle edge cases — no speech, non-English, multi-ticker
      claims (pick the primary one and set `secondary_tickers[]`), joke/satire
      detection (low confidence).
- [ ] **Days 9–10:** Integration testing with Person 4, demo polish.

#### 4.1.5 Claude extraction prompt template

```
You are analyzing a transcript of a short video to determine whether the speaker
is making a stock prediction, and if so, to extract it in structured form.

TRANSCRIPT:
"""
{transcript}
"""

VIDEO METADATA:
- Platform: {platform}
- Channel: {channel_name} ({channel_handle})
- Posted: {posted_at}

Extract as JSON matching this exact shape (or return { "not_a_stock_prediction": true }):

{
  "ticker":                "e.g. NVDA — best-guess ticker symbol",
  "company_name":          "e.g. NVIDIA — as spoken",
  "direction":             "up | down | neutral",
  "timeframe_iso":         "absolute date, resolving 'tomorrow' etc against posted_at",
  "timeframe_hint_raw":    "what they literally said",
  "reason_given":          "why they think this — one sentence",
  "predictor_name":        "{channel_name}",
  "predictor_handle":      "{channel_handle}",
  "extraction_confidence": "high | medium | low",
  "transcript_evidence":   "the exact sentence(s) the claim came from"
}

Rules:
- If multiple tickers are mentioned, pick the PRIMARY one — the one the whole
  claim is about — and list others in `secondary_tickers`.
- Set `extraction_confidence` to `low` if the video is a joke, sarcastic, or
  vague ("stonks go brrr").
- Never invent a ticker. If you cannot identify a specific stock, return
  `{ "not_a_stock_prediction": true }`.
```

#### 4.1.6 Definition of done (Person 1)

- [ ] Given any of these 3 canonical demo URLs, `ingest_video` produces a
      `VideoManifest` within 30 seconds:
      - a YouTube Short (< 60 s)
      - an X/Twitter video post
      - a TikTok video
- [ ] Given a `video_id`, `extract_stock_claim` produces a `StockClaim` that
      resolves to a real ticker via `resolve_ticker`.
- [ ] Fixtures published to `src/data/fixtures/video-claims.json` (10+ real
      examples).
- [ ] All 3 supported platforms have at least one end-to-end passing test.
- [ ] Handles the "not a stock video" case gracefully.

---

### PERSON 2 — Signal Validation Agent (Calendar + Historical Correlation)

**Owns:** `market-signal-mcp/src/modules/signal-validation/` (new module)
**Depends on:** `StockClaim` shape (from Person 1) — can mock initially
**Unblocks:** Person 4 (aggregator)

#### 4.2.1 Responsibilities

1. Given a `StockClaim`, find every calendar event for that ticker within the
   claim's timeframe window (± 3 days).
2. Classify each event (earnings, Fed meeting, product launch, etc.).
3. Check whether this ticker has *historically* moved after events of the same
   type — is a Jensen keynote a real catalyst for NVDA, or is the speaker just
   hyping something inconsequential?
4. Produce a `CalendarCheckResult` with a `calendar_alignment_score` from 0 to
   30 and a plain-English explanation.

#### 4.2.2 Files to create

```
market-signal-mcp/src/modules/signal-validation/
├── signal-validation.module.ts
├── signal-validation.tools.ts
├── calendar.impl.ts               # Finnhub + FRED integrations
├── correlation.impl.ts            # historical event matching logic
├── calendar-checks.resource.ts    # video://calendar-checks
└── __tests__/
    └── calendar.test.ts
```

Also extends: `market-signal-mcp/src/data/historical-signals.json` — add an
`event_tag` field to every entry (e.g. `"event_tag": "earnings_beat"`).

#### 4.2.3 MCP tools to build

| Tool                            | Input                                       | Output                                    |
| ------------------------------- | ------------------------------------------- | ----------------------------------------- |
| `check_calendar_events`         | `{ ticker: string, window_days?: number }`  | `CalendarCheckResult` (calendar section)  |
| `correlate_historical_events`   | `{ ticker: string, event_type: string }`    | `{ correlated: boolean, strength: 0..1, past_examples: [] }` |
| `validate_claim_against_signal` | `{ video_id: string }`                      | `CalendarCheckResult` (full, written to resource) |

#### 4.2.4 External APIs

| API      | Endpoint                                         | Notes                                                          |
| -------- | ------------------------------------------------ | -------------------------------------------------------------- |
| Finnhub  | `/calendar/earnings?symbol=NVDA&from=…&to=…`     | 60 calls/min free. Requires `FINNHUB_KEY` in `.env`.           |
| Finnhub  | `/company-news?symbol=NVDA&from=…&to=…`          | Corporate announcements / product launches.                    |
| FRED     | `/fred/releases/dates`                           | US macro schedule (CPI, PPI, NFP, FOMC). Free, needs API key.  |
| AV News  | (already integrated in Phase 1)                  | Reuse via existing `alpha_vantage` key. Scan for keywords like "keynote", "launch", "reveal". |

#### 4.2.5 Historical correlation algorithm

```
Given: ticker=NVDA, event_type=conference

1. Load historical-signals.json entries for NVDA.
2. Filter to entries where event_tag == "conference".
3. For each match, look at price movement in the 3 trading days AFTER the event.
4. If ≥ 60% of past occurrences moved > 2%, this event type is "correlated".
5. correlation_strength = correct_direction_matches / total_matches
6. If we have fewer than 3 historical examples: return correlated=false,
   strength=null, reasoning="insufficient historical precedent".
```

#### 4.2.6 Scoring rubric (calendar_alignment_score, 0–30)

| Situation                                                                 | Points |
| ------------------------------------------------------------------------- | ------ |
| Event found in window AND historically strong (strength ≥ 0.7)            | 25–30  |
| Event found in window AND historically moderate (strength 0.4–0.7)        | 15–24  |
| Event found in window BUT no historical precedent                         | 8–14   |
| No event found in window (prediction is unsupported by any known catalyst) | 0–7   |

#### 4.2.7 Concrete task breakdown

- [ ] **Day 1:** Sign up for Finnhub free account, add `FINNHUB_KEY` to
      `.env.example`. Confirm earnings calendar API returns data for AAPL.
- [ ] **Day 2:** Sign up for FRED API. Build a small in-repo lookup of upcoming
      macro events (FOMC, CPI, PPI, NFP) — can be a static JSON refreshed
      weekly, doesn't have to be live.
- [ ] **Day 3:** Build `check_calendar_events` — Finnhub + FRED + AV News scan.
- [ ] **Day 4:** Extend `historical-signals.json` schema. Add `event_tag` to
      existing entries (backfill with best guesses OR leave as `null` for old
      entries).
- [ ] **Day 5:** Build `correlate_historical_events` and unit test with 3
      known correlations (e.g. NVDA + earnings, TSLA + delivery report).
- [ ] **Day 6:** Wire `validate_claim_against_signal` — reads the claim from
      `video://claims`, produces `CalendarCheckResult`, writes to
      `video://calendar-checks`.
- [ ] **Days 7–8:** Edge cases — no data, ticker not in FMP, event during
      market close, timezone handling.
- [ ] **Days 9–10:** Integration testing with Person 4, demo polish.

#### 4.2.8 Definition of done (Person 2)

- [ ] Given a claim `{ticker: "NVDA", timeframe_iso: "2026-07-27"}` where NVDA
      has confirmed earnings on that date, the tool returns
      `calendar_alignment_score >= 20`.
- [ ] Given a claim for a ticker with NO events in the window, returns
      `calendar_alignment_score <= 7` and explains why.
- [ ] `historical-signals.json` has `event_tag` filled for every entry.
- [ ] All external API calls have graceful failure paths (never throw
      unhandled).

---

### PERSON 3 — Predictor Credibility Agent

**Owns:** `market-signal-mcp/src/modules/predictor-credibility/` (new module)
**Depends on:** `StockClaim` shape (from Person 1) — can mock initially
**Unblocks:** Person 4 (aggregator)

#### 4.3.1 Responsibilities

1. Given a `predictor_handle` + `platform`, fetch profile stats (followers,
   account age, verified status).
2. Fetch the person's last ~50 posts / videos.
3. Extract past stock claims from those posts (use Claude — same style as
   Person 1's `extract_stock_claim`).
4. Backtest each past claim against actual price history — did the price move
   as they predicted, in the timeframe they predicted?
5. Compute an accuracy rate and a final `predictor_score` (0–25) +
   `platform_score` (0–10).

#### 4.3.2 Files to create

```
market-signal-mcp/src/modules/predictor-credibility/
├── predictor-credibility.module.ts
├── predictor-credibility.tools.ts
├── social-profile.impl.ts         # per-platform profile fetching
├── past-post-scraper.impl.ts      # per-platform post fetching
├── backtest.impl.ts               # price lookup + verdict
├── predictor-profiles.resource.ts # video://predictor-profiles
└── __tests__/
    └── backtest.test.ts
```

#### 4.3.3 MCP tools to build

| Tool                          | Input                                                     | Output               |
| ----------------------------- | --------------------------------------------------------- | -------------------- |
| `fetch_predictor_profile`     | `{ handle: string, platform: string }`                    | Partial `PredictorProfile` (stats only) |
| `fetch_predictor_history`     | `{ handle: string, platform: string, limit?: number }`    | `{ posts: [...] }`   |
| `score_predictor_accuracy`    | `{ handle: string, platform: string }`                    | Full `PredictorProfile` (writes to resource) |

#### 4.3.4 External APIs

| Platform  | API                                                       | Free tier                                     |
| --------- | --------------------------------------------------------- | --------------------------------------------- |
| Twitter/X | Twitter API v2 (`GET /2/users/by/username/:handle/tweets`) | 500k reads/month on free tier. Needs approval — **apply on day 1**. |
| YouTube   | YouTube Data API v3 (`GET /channels`, `/search`)          | 10,000 units/day free. Instant sign-up.       |
| TikTok    | Official API is developer-locked; use `TikTokApi` (open source Python) or fall back to yt-dlp channel scraping. | Free but rate-limited. |
| Instagram | No official public API. Fall back to scraping profile page HTML (fragile — mark as "unsupported" for MVP if too flaky). | — |

**MVP recommendation:** support Twitter/X and YouTube well. Return
`predictor_score = null, platform_score = null, reasoning = "unsupported platform"`
for TikTok/Instagram in v1 — Person 4 handles that gracefully in the aggregator.

#### 4.3.5 Backtest algorithm

```
For each past claim (t, ticker, direction, timeframe_iso):

1. Fetch actual close prices for `ticker` from t through timeframe_iso via
   the Phase-1 fetch_price_volume tool (already handles Yahoo / AV / CoinGecko).
2. Compute actual return: (close_at_timeframe / close_at_t) - 1
3. If direction=="up" and actual_return >= +2%: outcome="correct"
   If direction=="down" and actual_return <= -2%: outcome="correct"
   If |actual_return| < 2%: outcome="unclear"
   Otherwise: outcome="incorrect"
4. If timeframe_iso is in the future: outcome="pending".

accuracy_rate = correct / (correct + incorrect)   # unclear/pending don't count
sample_size   = correct + incorrect + unclear
```

#### 4.3.6 Scoring formulas

```
predictor_score (0–25):
  15 × accuracy_rate                    // 0.80 → 12
+ min(5, follower_tier_points())        // 100k+ = 5, 10k+ = 3, 1k+ = 1
+ min(5, account_age_years)             // cap at 5

platform_score (0–10):
+ 5 if verified
+ 3 if account_age_years >= 3
+ 2 if follower_count >= 10000
(cap at 10)

// If sample_size < 3: predictor_score = max(0, base_platform_score - 5)
//   → "insufficient track record" is a mild penalty, not a full zero.
```

#### 4.3.7 Concrete task breakdown

- [ ] **Day 1:** Apply for Twitter Developer access. Sign up for YouTube Data
      API. Add `TWITTER_BEARER_TOKEN` and `YOUTUBE_API_KEY` to `.env.example`.
- [ ] **Day 2:** Build `fetch_predictor_profile` for Twitter — profile stats.
- [ ] **Day 3:** Build `fetch_predictor_profile` for YouTube — channel stats.
- [ ] **Day 4:** Build `fetch_predictor_history` for both platforms — last 50
      posts / video titles + descriptions.
- [ ] **Day 5:** Build claim extractor for past posts. Can reuse Person 1's
      Claude extraction prompt with slight tweaks (posts are shorter than video
      transcripts).
- [ ] **Day 6:** Build backtest loop — for each past claim, fetch actual price
      via `fetch_price_volume` and mark outcome.
- [ ] **Day 7:** Compute final `predictor_score` + `platform_score`. Wire
      `score_predictor_accuracy` — writes to `video://predictor-profiles`.
- [ ] **Days 8–9:** Edge cases — private accounts, deleted posts, tickers that
      have since delisted, rate-limit handling.
- [ ] **Day 10:** Integration testing with Person 4, demo polish.

#### 4.3.8 Definition of done (Person 3)

- [ ] Given a well-known FinTwit handle (e.g. `@zerohedge`, `@AswathDamodaran`,
      pick any real one for demo), returns a `PredictorProfile` with
      `sample_size >= 3` and a defensible accuracy rate.
- [ ] Handles at least Twitter/X and YouTube.
- [ ] TikTok / Instagram degrade gracefully to
      `{ predictor_score: null, reasoning: "unsupported platform for MVP" }`.
- [ ] Backtest uses the SAME price source as Phase 1 (`fetch_price_volume`) so
      numbers are consistent.

---

### PERSON 4 — Confidence Aggregator + Widget + End-to-End Integration

**Owns:**
- `market-signal-mcp/src/modules/video-verdict/` (new module)
- `widget/` (extend the existing Next.js widget with a video-analysis page)
- End-to-end pipeline glue script

**Depends on:** All three data contracts (`StockClaim`, `CalendarCheckResult`,
`PredictorProfile`) — can mock initially
**Unblocks:** The demo

#### 4.4.1 Responsibilities

1. Take a `video_id` and produce a `VideoVerdict` by reading the outputs of
   Persons 1, 2, 3 from their resources.
2. Compute the final 0–100 score using the rubric below.
3. Write a plain-English `reasoning_narrative` for the widget to display.
4. Build the new **Video Analysis** page in the widget:
   - Paste-a-URL input at the top.
   - Progress tracker showing all 4 agents (Ingest → Claim → Signal → Predictor
     → Verdict) with tick marks as each stage completes.
   - Final verdict card with the score, band, breakdown bar chart, and full
     reasoning.
5. Write the orchestrator script (`orchestrator/run-video-pipeline.ts`) that
   calls the 4 tools in sequence with proper error handling — analogous to
   Phase 1's `run-pipeline.ts`.

#### 4.4.2 Files to create / modify

```
market-signal-mcp/src/modules/video-verdict/
├── video-verdict.module.ts
├── video-verdict.tools.ts
├── aggregator.impl.ts
├── narrative-builder.impl.ts
├── video-verdict.resource.ts     # video://verdicts
└── __tests__/
    └── aggregator.test.ts

widget/src/pages/video-analysis/           # new Next.js route
  ├── index.tsx                            # paste URL + progress + verdict
  ├── components/
  │   ├── UrlInput.tsx
  │   ├── PipelineProgress.tsx
  │   ├── VerdictCard.tsx
  │   └── BreakdownBar.tsx
  └── styles.module.css

orchestrator/
  └── run-video-pipeline.ts        # end-to-end runner
```

#### 4.4.3 MCP tools to build

| Tool                          | Input                | Output           |
| ----------------------------- | -------------------- | ---------------- |
| `aggregate_video_confidence`  | `{ video_id: string }` | `VideoVerdict` (writes to resource) |
| `list_video_verdicts`         | `{ limit?: number }`   | `VideoVerdict[]` |

#### 4.4.4 Aggregation rubric

```
inputs (all read from resources by video_id):
  signal_evidence           ← Phase-1 signal_log[ticker] (existing pipeline)
  calendar_evidence         ← video://calendar-checks
  predictor_evidence        ← video://predictor-profiles

Missing-input handling:
  - No signal_evidence?     → signal_score = 12  (neutral baseline out of 35)
  - No calendar_evidence?   → calendar_alignment = 10 (neutral out of 30)
  - No predictor_evidence?  → predictor_accuracy = 8 (neutral out of 25)
                              → platform_authority = 3 (neutral out of 10)
                              → append "predictor could not be verified" to reasoning

Signal-score mapping (from Phase 1's 0–100 score into our 0–35 slot):
  signal_score = round( phase1_score * 0.35 )
  Then adjust ±5 based on direction agreement:
    if claim.direction == signal.signal_direction:  +5
    if opposite direction:                          -5

final_score = signal_score + calendar_alignment + predictor_accuracy + platform_authority

band:
  80–100 → HIGH
  60–79  → MODERATE
  40–59  → WEAK
  0–39   → DISMISS

contrarian_or_consensus:
  if signal.signal_direction == claim.direction and calendar_evidence.events_in_window.length > 0:
    "consensus"
  elif signal.signal_direction != claim.direction:
    "contrarian"
  else:
    "unclear"
```

#### 4.4.5 Concrete task breakdown

- [ ] **Days 1–2:** Write mock fixtures for all three input types so you can
      build the aggregator without waiting for anyone else. Save under
      `src/data/fixtures/video-mocks/`.
- [ ] **Day 3:** Build `aggregate_video_confidence` end-to-end against mocks.
- [ ] **Day 4:** Write `narrative-builder.impl.ts` — turns raw scores into a
      2-paragraph human-readable explanation (this is what judges will read out
      loud in the demo).
- [ ] **Days 5–6:** Build the widget page — URL input, progress tracker, final
      verdict card.
- [ ] **Day 7:** Write `run-video-pipeline.ts` orchestrator with the same
      style as `run-pipeline.ts`.
- [ ] **Days 8–9:** Swap mocks for real inputs from Persons 1/2/3. Fix
      integration bugs.
- [ ] **Day 10:** Demo dry-run with the whole team.

#### 4.4.6 Definition of done (Person 4)

- [ ] Given a `video_id` where all 3 upstream agents have written to their
      resources, `aggregate_video_confidence` returns a `VideoVerdict` with all
      fields populated and a final score consistent with the rubric.
- [ ] Given a `video_id` where 1+ upstream agents are missing, still returns a
      valid verdict using neutral defaults + explicit "could not verify X" text.
- [ ] Widget page shows the pipeline running in real time (poll resources every
      1s) and renders the final verdict card.
- [ ] `orchestrator/run-video-pipeline.ts your-video-url` runs the whole
      pipeline end-to-end from the command line and prints the verdict.

---

## 5. Shared plumbing (everyone reads this)

### 5.1 Environment variables (`.env.example` additions)

```
# Person 1
OPENAI_API_KEY=                 # only if using OpenAI Whisper API (optional)
ANTHROPIC_API_KEY=              # for Claude claim extraction

# Person 2
FINNHUB_KEY=
FRED_API_KEY=

# Person 3
TWITTER_BEARER_TOKEN=
YOUTUBE_API_KEY=

# Person 4 — no new keys
```

### 5.2 New system dependencies

Person 1 needs these installed on the host machine (add to `README.md` install
section):

- `yt-dlp` (Python-based CLI; `pip install yt-dlp` or use `yt-dlp-exec` npm
  wrapper which bundles it)
- `ffmpeg` (audio extraction — required by yt-dlp)
- `whisper.cpp` compiled with the `base.en` model, OR set `OPENAI_API_KEY` to
  use the hosted Whisper API

### 5.3 MCP module registration

Every new module must register itself in the main MCP app entry point:

```typescript
// market-signal-mcp/src/index.ts (or wherever @McpApp lives)
@McpApp({
  modules: [
    ScoutModule,
    AnalystModule,
    SkepticModule,
    // Phase 2 additions:
    VideoIngestModule,          // Person 1
    SignalValidationModule,     // Person 2
    PredictorCredibilityModule, // Person 3
    VideoVerdictModule,         // Person 4
  ],
})
export class AppModule {}
```

### 5.4 Naming discipline

- Resource URIs: `video://<noun>` (all lowercase, plural).
- Tool names: `snake_case`, verb-first (`ingest_video`, not `video_ingest`).
- Every tool has a Zod `inputSchema` and a JSDoc `description` that a judge
  can read out loud.

### 5.5 Branching strategy

- Each person works on `phase2/<agent-name>` branch off `main`.
- PRs into `phase2/integration` (a long-lived integration branch).
- `phase2/integration` merges into `main` only after Person 4's dry-run passes.

---

## 6. Milestones & checkpoints

| Day  | Checkpoint                                                                          | Owner   |
| ---- | ----------------------------------------------------------------------------------- | ------- |
| 1    | Data contracts (Section 3) reviewed & signed off by all four                        | Team    |
| 2    | Mock fixtures published so Persons 2, 3, 4 can unblock                              | Person 1 |
| 3    | All API keys acquired, `.env.example` updated                                       | Persons 2, 3 |
| 5    | Each agent works end-to-end against fixtures                                        | All     |
| 7    | First integration test — Person 1's real output flows through Person 4              | Team    |
| 8    | Widget renders a real verdict from a real video URL                                 | Person 4 |
| 9    | Demo dry-run: everyone watches the whole pipeline on 3 different video URLs         | Team    |
| 10   | Bug bash + final polish                                                             | All     |

---

## 7. Definition of done for Phase 2 (whole team)

- [ ] `orchestrator/run-video-pipeline.ts <url>` runs end-to-end on 5 different
      real video URLs (mix of YouTube, X, TikTok) without crashing.
- [ ] Widget's Video Analysis page renders the full verdict for any of those 5
      URLs.
- [ ] Every agent's failure paths are honest — if a step fails, the verdict
      still renders with `"could not verify X"` in the reasoning, no fake data.
- [ ] `phase2-video-intelligence.md` (this file) is updated with any schema
      changes made during implementation.
- [ ] Demo script written: which URL to paste, what to point at on screen, in
      what order.

---

## 8. Risk log (mitigate on day 1)

| Risk                                                       | Owner    | Mitigation                                                                 |
| ---------------------------------------------------------- | -------- | -------------------------------------------------------------------------- |
| Twitter API access rejected or slow to approve             | Person 3 | Apply day 1. Fallback: use a scraper library (`snscrape`) for the demo.    |
| TikTok / Instagram have no reliable public API             | Person 3 | Scope MVP to Twitter + YouTube; degrade gracefully on the others.          |
| Whisper transcription too slow on long videos              | Person 1 | Cap ingested videos at 5 minutes for MVP. Show a friendly error otherwise. |
| Finnhub earnings calendar sparse for micro-caps            | Person 2 | Log the miss, fall through to AV News keyword scan.                        |
| Alpha Vantage rate limits (25 calls/day free) hit          | All      | Cache aggressively. Consider paid tier for demo day.                       |
| Claude prompt returns malformed JSON                       | Persons 1, 3 | Use `response_format: json_object` + retry once + fall back to `low` extraction confidence. |
| Two people accidentally edit the same shared resource file | Team     | Only the OWNER of a resource writes to it. Others read only.               |

---

## 9. Reference: Phase 1 tools that Phase 2 reuses

Do **not** re-implement any of these — call them from the new modules:

- `resolve_ticker` (Scout) — Person 1 uses this to validate extracted tickers.
- `fetch_price_volume` (Analyst) — Person 3 uses this for backtesting.
- `assess_signal_strength` (Analyst) — Person 4 reads the resulting
  `signal_log` entry as `signal_evidence`.
- `historical_pattern_lookup` (Analyst) — Person 2 extends the underlying
  `historical-signals.json`; the tool itself is reused.

---

**Owner of this document:** whoever runs the Phase 2 kickoff. Update the schemas
in Section 3 as they evolve, and add any decisions the team makes to Section 8.
