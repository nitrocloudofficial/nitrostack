/**
 * Market news & events dataset loader.
 *
 * Backed by `src/data/financial_news_events.csv` (a provided dataset — NOT a live
 * feed; the live sources remain AMFI NAV and Razorpay IFSC). Parsed once at
 * startup with a quote-aware CSV parser (some headlines contain commas) and cached.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface MarketEvent {
    date: string;
    headline: string;
    source: string;
    event: string;
    index: string;
    indexChangePercent: number;
    tradingVolume: number;
    sentiment: string; // Positive | Negative | Neutral | Unknown
    sector: string;
    impact: string; // High | Medium | Low
    company: string;
    url: string;
}

/** RFC-4180-style single-line parser (handles quoted fields with embedded commas). */
function parseCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (inQuotes) {
            if (c === '"') {
                if (line[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = false; }
            } else {
                cur += c;
            }
        } else if (c === '"') {
            inQuotes = true;
        } else if (c === ',') {
            out.push(cur);
            cur = '';
        } else {
            cur += c;
        }
    }
    out.push(cur);
    return out;
}

function findCsvPath(): string | null {
    const candidates = [
        join(process.cwd(), 'src', 'data', 'financial_news_events.csv'),
        join(process.cwd(), 'data', 'financial_news_events.csv'),
        join(process.cwd(), 'dist', 'data', 'financial_news_events.csv'),
    ];
    return candidates.find((p) => existsSync(p)) ?? null;
}

let cache: MarketEvent[] | null = null;

/** Load & parse the dataset once; returns [] if the file is missing (graceful). */
export function loadMarketEvents(): MarketEvent[] {
    if (cache) return cache;
    const path = findCsvPath();
    if (!path) {
        cache = [];
        return cache;
    }
    const raw = readFileSync(path, 'utf-8');
    const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const events: MarketEvent[] = [];
    for (let i = 1; i < lines.length; i++) {
        const f = parseCsvLine(lines[i]);
        if (f.length < 12) continue;
        events.push({
            date: f[0].trim(),
            headline: f[1].trim(),
            source: f[2].trim(),
            event: f[3].trim(),
            index: f[4].trim(),
            indexChangePercent: Number(f[5]) || 0,
            tradingVolume: Number(f[6]) || 0,
            sentiment: (f[7].trim() || 'Unknown'),
            sector: f[8].trim(),
            impact: f[9].trim(),
            company: f[10].trim(),
            url: f[11].trim(),
        });
    }
    cache = events;
    return cache;
}
