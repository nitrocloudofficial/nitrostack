// DEV STUB for Person 3 — replace with Person 1's real implementation.
// This stub tries to read from data/findings-board-store.json (which Person 1 writes to),
// and falls back to hardcoded mock data so Person 3 can develop and test independently.

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import type { FindingsBoard } from "../types/shared.types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = path.join(__dirname, "../../data/findings-board-store.json");

// Mock data covers all demo tickers with realistic variation:
// - TSLA: press-release mill source (triggers credibility flag)
// - NVDA: clean tier-1 sources (should pass all checks)
// - AAPL: bearish regulatory news
// - BTC: hype vocabulary spike (triggers narrative entropy flag)
const MOCK_DATA: FindingsBoard[] = [
  {
    ticker: "TSLA",
    timestamp: new Date().toISOString(),
    headlines: [
      {
        source: "reuters.com",
        text: "Tesla Q2 deliveries beat expectations as China demand recovers strongly",
        url: "https://reuters.com/example/tsla-q2",
        sentiment: "positive",
        sentiment_score: 0.72,
        published_at: new Date(Date.now() - 3 * 3600_000).toISOString(),
      },
      {
        source: "prnewswire.com",
        text: "Tesla announces record delivery numbers in groundbreaking second quarter milestone",
        url: "https://prnewswire.com/example/tsla-release",
        sentiment: "positive",
        sentiment_score: 0.88,
        published_at: new Date(Date.now() - 1.5 * 3600_000).toISOString(),
      },
    ],
    narrative_summary:
      "Tesla Q2 delivery numbers exceeded analyst expectations, driven by China market recovery.",
    mention_velocity: "spiking",
  },
  {
    ticker: "NVDA",
    timestamp: new Date().toISOString(),
    headlines: [
      {
        source: "bloomberg.com",
        text: "Nvidia data center revenue surges as AI chip demand shows no signs of slowing",
        url: "https://bloomberg.com/example/nvda",
        sentiment: "positive",
        sentiment_score: 0.88,
        published_at: new Date(Date.now() - 6 * 3600_000).toISOString(),
      },
      {
        source: "reuters.com",
        text: "Nvidia quarterly earnings beat on strong enterprise AI infrastructure spending",
        url: "https://reuters.com/example/nvda-q2",
        sentiment: "positive",
        sentiment_score: 0.81,
        published_at: new Date(Date.now() - 4 * 3600_000).toISOString(),
      },
    ],
    narrative_summary:
      "Nvidia AI chip demand remains strong, with data center revenue driven by enterprise AI buildout.",
    mention_velocity: "steady",
  },
  {
    ticker: "AAPL",
    timestamp: new Date().toISOString(),
    headlines: [
      {
        source: "wsj.com",
        text: "Apple faces antitrust scrutiny as EU regulators widen investigation into App Store",
        url: "https://wsj.com/example/aapl-antitrust",
        sentiment: "negative",
        sentiment_score: -0.55,
        published_at: new Date(Date.now() - 8 * 3600_000).toISOString(),
      },
    ],
    narrative_summary:
      "Regulatory pressure on Apple intensifies in Europe, App Store practices under investigation.",
    mention_velocity: "declining",
  },
  {
    ticker: "BTC",
    timestamp: new Date().toISOString(),
    headlines: [
      {
        source: "zerohedge.com",
        text: "Bitcoin to the moon rocket massive pump guaranteed gains YOLO 100x parabolic squeeze",
        url: "https://zerohedge.com/example/btc",
        sentiment: "positive",
        sentiment_score: 0.91,
        published_at: new Date(Date.now() - 0.5 * 3600_000).toISOString(),
      },
      {
        source: "zerohedge.com",
        text: "BTC mooning diamond hands easy money millionaire guaranteed parabolic explosion",
        url: "https://zerohedge.com/example/btc-2",
        sentiment: "positive",
        sentiment_score: 0.89,
        published_at: new Date(Date.now() - 0.25 * 3600_000).toISOString(),
      },
    ],
    narrative_summary:
      "Bitcoin social chatter dominated by extreme hype language and retail excitement.",
    mention_velocity: "spiking",
  },
];

export function readFindingsBoard(ticker: string): FindingsBoard | null {
  // Prefer live data from Person 1's writer
  if (fs.existsSync(STORE_PATH)) {
    try {
      const raw = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8")) as Record<string, FindingsBoard>;
      if (raw[ticker.toUpperCase()]) return raw[ticker.toUpperCase()];
    } catch {
      // Fall through
    }
  }
  return MOCK_DATA.find((d) => d.ticker === ticker.toUpperCase()) ?? null;
}

export function listFindingsBoard(): FindingsBoard[] {
  if (fs.existsSync(STORE_PATH)) {
    try {
      const raw = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8")) as Record<string, FindingsBoard>;
      return Object.values(raw);
    } catch {
      // Fall through
    }
  }
  return MOCK_DATA;
}
