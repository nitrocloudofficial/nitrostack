// Person 3 owns this resource. Widget and no other agent writes here —
// only the Skeptic agent (via generate_verdict tool) writes to this.

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import type { VerdictLog } from "../types/shared.types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = path.join(__dirname, "../../data/verdict-log-store.json");

// In-memory store keyed by ticker, loaded from file on startup
const store = new Map<string, VerdictLog[]>();

function loadStore(): void {
  if (!fs.existsSync(STORE_PATH)) return;
  try {
    const raw = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8")) as Record<string, VerdictLog[]>;
    for (const [ticker, entries] of Object.entries(raw)) {
      store.set(ticker, entries);
    }
  } catch {
    // Corrupted file — start fresh rather than crashing
  }
}

function persistStore(): void {
  const out: Record<string, VerdictLog[]> = {};
  for (const [ticker, entries] of store.entries()) {
    out[ticker] = entries;
  }
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(out, null, 2), "utf-8");
}

loadStore();

export function writeVerdictLog(verdict: VerdictLog): void {
  const key = verdict.ticker.toUpperCase();
  const existing = store.get(key) ?? [];
  existing.push(verdict);
  // Cap at 50 entries per ticker to avoid unbounded growth during a demo session
  store.set(key, existing.slice(-50));
  persistStore();
}

export function readLatestVerdictLog(ticker: string): VerdictLog | null {
  const entries = store.get(ticker.toUpperCase()) ?? [];
  return entries.length > 0 ? entries[entries.length - 1] : null;
}

export function listVerdictLogs(ticker?: string): VerdictLog[] {
  if (ticker) {
    return store.get(ticker.toUpperCase()) ?? [];
  }
  const all: VerdictLog[] = [];
  for (const entries of store.values()) {
    all.push(...entries);
  }
  return all.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function clearVerdictLog(ticker?: string): void {
  if (ticker) {
    store.delete(ticker.toUpperCase());
  } else {
    store.clear();
  }
  persistStore();
}
