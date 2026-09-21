import { Injectable } from '@nitrostack/core';
import { MfApiClient, MfApiNavPoint } from '../../clients/mfapi.js';
import { FundCategory, FUND_CATEGORY_SCHEME_CODES, STATIC_FALLBACK_BANDS } from './growth.constants.js';

export interface CagrBand {
  low: number;
  high: number;
  source: 'live' | 'cached' | 'static';
  asOf: string;
  schemeName: string;
}

interface CacheEntry {
  band: { low: number; high: number };
  asOf: string;
  schemeName: string;
}

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

function parseNavDate(ddmmyyyy: string): Date {
  const [day, month, year] = ddmmyyyy.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Finds the NAV point closest to `yearsBack` before the most recent entry and
 * computes CAGR using the actual elapsed time to that point, not the nominal
 * horizon — a fund with less history than requested returns null rather than
 * silently extrapolating.
 */
export function computeCagr(history: MfApiNavPoint[], yearsBack: number): number | null {
  if (history.length === 0) return null;

  const latest = history[0];
  const latestDate = parseNavDate(latest.date);
  const latestNav = parseFloat(latest.nav);
  const targetTime = latestDate.getTime() - yearsBack * MS_PER_YEAR;

  let closest: MfApiNavPoint | null = null;
  let closestDiff = Infinity;

  for (const point of history) {
    const diff = Math.abs(parseNavDate(point.date).getTime() - targetTime);
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = point;
    }
  }

  if (!closest) return null;

  const pastDate = parseNavDate(closest.date);
  const actualYears = (latestDate.getTime() - pastDate.getTime()) / MS_PER_YEAR;
  if (actualYears < yearsBack * 0.9) return null; // not enough real history for this horizon

  const pastNav = parseFloat(closest.nav);
  if (pastNav <= 0) return null;

  return Math.pow(latestNav / pastNav, 1 / actualYears) - 1;
}

@Injectable({ deps: [MfApiClient] })
export class NavCacheService {
  private cache = new Map<FundCategory, CacheEntry>();

  constructor(private readonly mfApiClient: MfApiClient) {}

  async getCagrBand(category: FundCategory): Promise<CagrBand> {
    const { schemeCode, schemeName } = FUND_CATEGORY_SCHEME_CODES[category];

    try {
      const { data } = await this.mfApiClient.getSchemeHistory(schemeCode);
      const rates = [computeCagr(data, 3), computeCagr(data, 5)].filter(
        (r): r is number => r !== null
      );

      if (rates.length === 0) {
        throw new Error(`Not enough NAV history for ${schemeName} to compute a trailing CAGR`);
      }

      const band = { low: Math.min(...rates), high: Math.max(...rates) };
      const asOf = data[0].date;
      this.cache.set(category, { band, asOf, schemeName });

      return { ...band, source: 'live', asOf, schemeName };
    } catch {
      const cached = this.cache.get(category);
      if (cached) {
        return { ...cached.band, source: 'cached', asOf: cached.asOf, schemeName: cached.schemeName };
      }

      const fallback = STATIC_FALLBACK_BANDS[category];
      return { ...fallback, source: 'static', asOf: 'N/A', schemeName: `${schemeName} (static assumption)` };
    }
  }
}
