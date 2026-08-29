// Person 2 owns this resource. The Skeptic agent and widget read from here —
// only the Analyst agent (via assess_signal_strength tool) writes to this.

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import type { SignalLog } from "../types/shared.types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = path.join(__dirname, "../../data/signal-log-store.json");

// In-memory store keyed by ticker, loaded from file on startup
const store = new Map<string, SignalLog[]>();

function loadStore(): void {
  if (!fs.existsSync(STORE_PATH)) return;
  try {
    const raw = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8")) as Record<string, SignalLog[]>;
    for (const [ticker, entries] of Object.entries(raw)) {
      store.set(ticker, entries);
    }
  } catch {
    // Corrupted file — start fresh rather than crashing
  }
}

function persistStore(): void {
  const out: Record<string, SignalLog[]> = {};
  for (const [ticker, entries] of store.entries()) {
    out[ticker] = entries;
  }
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(out, null, 2), "utf-8");
}

loadStore();

export function writeSignalLog(signal: SignalLog): void {
  const key = signal.ticker.toUpperCase();
  const existing = store.get(key) ?? [];
  existing.push(signal);
  // Cap at 50 entries per ticker to avoid unbounded growth during a demo session
  store.set(key, existing.slice(-50));
  persistStore();
}

export function readLatestSignalLog(ticker: string): SignalLog | null {
  const entries = store.get(ticker.toUpperCase()) ?? [];
  return entries.length > 0 ? entries[entries.length - 1] : null;
}

export function readSignalLog(ticker: string): SignalLog | null {
  return readLatestSignalLog(ticker);
}

export function listSignalLogs(ticker?: string): SignalLog[] {
  if (ticker) {
    return store.get(ticker.toUpperCase()) ?? [];
  }
  const all: SignalLog[] = [];
  for (const entries of store.values()) {
    all.push(...entries);
  }
  return all.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function clearSignalLog(ticker?: string): void {
  if (ticker) {
    store.delete(ticker.toUpperCase());
  } else {
    store.clear();
  }
  persistStore();
}
