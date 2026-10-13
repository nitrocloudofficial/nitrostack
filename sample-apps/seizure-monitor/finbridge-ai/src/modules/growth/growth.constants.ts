export type FundCategory = 'equity' | 'debt' | 'hybrid' | 'index';

export const FUND_CATEGORY_SCHEME_CODES: Record<FundCategory, { schemeCode: string; schemeName: string }> = {
  equity: { schemeCode: '118632', schemeName: 'Nippon India Large Cap Fund - Direct Plan - Growth' },
  index: { schemeCode: '120716', schemeName: 'UTI Nifty 50 Index Fund - Direct Plan - Growth' },
  hybrid: { schemeCode: '118968', schemeName: 'HDFC Balanced Advantage Fund - Direct Plan - Growth' },
  debt: { schemeCode: '120197', schemeName: 'ICICI Prudential Liquid Fund - Direct Plan - Growth' }
};

/**
 * Used only when both a live fetch and the in-memory cache are unavailable.
 * Long-term published category averages for Indian mutual funds — cited in
 * the README handoff (docs/handoff/praneeth-readme-sections.md) rather than
 * presented here as precise.
 */
export const STATIC_FALLBACK_BANDS: Record<FundCategory, { low: number; high: number }> = {
  equity: { low: 0.1, high: 0.14 },
  index: { low: 0.1, high: 0.13 },
  hybrid: { low: 0.08, high: 0.11 },
  debt: { low: 0.05, high: 0.07 }
};
