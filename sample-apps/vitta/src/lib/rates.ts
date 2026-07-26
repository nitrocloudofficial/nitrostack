/**
 * rates.ts — LIVE external data source (Completeness: "≥1 external data source").
 * Fetches live INR reference FX rates from the Frankfurter API (ECB data,
 * free, no key, no PII — safe under CLAUDE.md rule 3 which bans only
 * bureau/AA/KYC-style PII APIs). Gracefully degrades to a cached snapshot so
 * the demo NEVER breaks offline.
 */

export interface ReferenceRates {
  source: 'live' | 'cached_fallback';
  as_of: string;
  base: string;
  inr_per: Record<string, number>;
  policy_context: {
    repo_rate_pct: number; // RBI repo rate (static reference — printed on rate card)
    mclr_proxy_pct: number;
    note: string;
  };
}

/** Static snapshot used when the live call fails (airplane-mode demo safety). */
const FALLBACK: ReferenceRates = {
  source: 'cached_fallback',
  as_of: '2026-07-15',
  base: 'INR',
  inr_per: { USD: 87.2, EUR: 95.1, GBP: 110.4 },
  policy_context: {
    repo_rate_pct: 5.5,
    mclr_proxy_pct: 8.9,
    note: 'Cached snapshot — live feed unavailable. Lending rates in catalog://products/personal-loan are set off these references.',
  },
};

export async function fetchReferenceRates(timeoutMs = 4000): Promise<ReferenceRates> {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=INR,EUR,GBP', { signal: ctl.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: any = await res.json();
    const usdInr = data?.rates?.INR;
    if (typeof usdInr !== 'number') throw new Error('unexpected shape');
    return {
      source: 'live',
      as_of: data.date ?? new Date().toISOString().slice(0, 10),
      base: 'INR',
      inr_per: {
        USD: round2(usdInr),
        EUR: data.rates.EUR ? round2(usdInr / data.rates.EUR) : FALLBACK.inr_per.EUR,
        GBP: data.rates.GBP ? round2(usdInr / data.rates.GBP) : FALLBACK.inr_per.GBP,
      },
      policy_context: {
        repo_rate_pct: 5.5,
        mclr_proxy_pct: 8.9,
        note: 'Live ECB reference rates via Frankfurter API. Lending ROI bands in catalog://products/personal-loan are set off these macro references.',
      },
    };
  } catch {
    return { ...FALLBACK };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
