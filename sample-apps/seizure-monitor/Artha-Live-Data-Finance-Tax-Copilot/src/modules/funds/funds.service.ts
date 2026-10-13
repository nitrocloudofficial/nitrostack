import { Injectable, Cache, OnApplicationBootstrap } from '@nitrostack/core';
import { httpGetJson, HttpError } from '../../common/http.js';
import { cagr, xirr, yearsBetween } from '../../common/xirr.js';
import { matchPopularFunds } from './funds.data.js';
import { coerceDateISO } from '../../common/validate.js';

const BASE_URL = process.env.MFAPI_BASE_URL ?? 'https://api.mfapi.in';

// ─── MFAPI.in response shapes ────────────────────────────────────────────────

interface SearchResultRaw {
    schemeCode: number;
    schemeName: string;
}

interface NavPointRaw {
    date: string; // "DD-MM-YYYY"
    nav: string;  // decimal string
}

interface SchemeMetaRaw {
    fund_house?: string;
    scheme_type?: string;
    scheme_category?: string;
    scheme_code: number;
    scheme_name: string;
    isin_growth?: string | null;
    isin_div_reinvestment?: string | null;
}

interface NavHistoryRaw {
    meta: SchemeMetaRaw;
    data: NavPointRaw[];
    status: string;
}

// ─── Public domain types ─────────────────────────────────────────────────────

export interface FundSearchResult {
    schemeCode: number;
    schemeName: string;
}

export interface FundNav {
    schemeCode: number;
    schemeName: string;
    fundHouse?: string;
    category?: string;
    nav: number;
    date: string; // ISO yyyy-mm-dd
    source: string;
    fetchedAt: string; // ISO timestamp of this fetch
}

export interface FundReturns {
    scheme: { schemeCode: number; schemeName: string; fundHouse?: string; category?: string };
    investedAmount: number;
    investedDate: string; // ISO
    navAtInvestment: number;
    navAtInvestmentDate: string; // ISO — actual NAV date used (on/before requested)
    latestNav: number;
    latestNavDate: string; // ISO
    unitsAllotted: number;
    currentValue: number;
    absoluteReturn: number;   // fraction
    absoluteGain: number;     // ₹
    holdingYears: number;
    cagr: number;             // fraction
    xirr: number;             // fraction
    source: string;
    fetchedAt: string;        // ISO timestamp of this fetch
}

export interface FundUniverseItem {
    schemeCode: number;
    schemeName: string;
    category: string;
}

export interface PopularFundsOutput {
    source: string;
    asOf: string;
    count: number;
    categories: string[];
    funds: FundUniverseItem[];
}

export interface MarketSnapshot {
    source: string;
    basis: string;
    fetchedAt: string;
    count: number;
    funds: Array<{ schemeCode: number; schemeName: string; nav: number | null; navDate?: string }>;
}

@Injectable()
export class FundsService implements OnApplicationBootstrap {
    /**
     * Warm the 24h/1h caches in the background at startup so the live resources
     * (funds/popular, market/snapshot) read instantly and never time out on first use.
     * Fire-and-forget: failures fall back to a lazy fetch on first read.
     */
    onApplicationBootstrap(): void {
        // Sequential so the shared scheme-universe cache is populated once.
        void (async () => {
            try { await this.getPopularFunds(); } catch { /* lazy on first read */ }
            try { await this.getMarketSnapshot(); } catch { /* lazy on first read */ }
        })();
    }

    /** Parse an MFAPI "DD-MM-YYYY" date into a JS Date (UTC midnight). */
    private parseApiDate(ddmmyyyy: string): Date {
        const [dd, mm, yyyy] = ddmmyyyy.split('-').map(Number);
        return new Date(Date.UTC(yyyy, mm - 1, dd));
    }

    private toIso(d: Date): string {
        return d.toISOString().slice(0, 10);
    }

    /**
     * Search schemes by (partial) name.
     *
     * MFAPI's raw search is unranked and noisy — for a query like "Parag Parikh"
     * it returns liquid/IDCW variants ahead of the flagship growth plan. We
     * re-rank so the most likely intended scheme (a Direct-Growth equity plan)
     * surfaces first, unless the query itself asks for a debt/IDCW variant.
     */
    async search(query: string, limit = 15): Promise<FundSearchResult[]> {
        // 1. Curated marquee funds (verified codes) always take priority — this
        //    fixes cases MFAPI search misses entirely (e.g. "HDFC Top 100").
        const curated: FundSearchResult[] = matchPopularFunds(query).map((f) => ({
            schemeCode: f.schemeCode,
            schemeName: f.schemeName,
        }));

        // 2. Live, relevance-ranked MFAPI search for the long tail. If MFAPI is
        //    unreachable but we already have a curated hit, degrade gracefully.
        let live: FundSearchResult[] = [];
        try {
            const url = `${BASE_URL}/mf/search?q=${encodeURIComponent(query)}`;
            const raw = await httpGetJson<SearchResultRaw[]>(url);
            live = this.rankResults(raw, query).map((r) => ({ schemeCode: r.schemeCode, schemeName: r.schemeName }));
        } catch (err) {
            if (curated.length === 0) throw err;
        }

        // 3. Merge curated-first, de-duplicating by scheme code.
        const seen = new Set<number>();
        const merged: FundSearchResult[] = [];
        for (const r of [...curated, ...live]) {
            if (!seen.has(r.schemeCode)) {
                seen.add(r.schemeCode);
                merged.push(r);
            }
        }
        return merged.slice(0, limit);
    }

    /** Heuristic relevance ranking that keeps MFAPI's order as a stable tie-break. */
    private rankResults(rows: SearchResultRaw[], query: string): SearchResultRaw[] {
        const q = query.toLowerCase();
        const wantsDebt = /(liquid|debt|overnight|money\s*market|duration|gilt|bond)/.test(q);
        const wantsIncome = /(idcw|dividend|payout|reinvest)/.test(q);
        const wantsUs = /\bus\b|overseas|global|international/.test(q);

        const score = (name: string): number => {
            const n = name.toLowerCase();
            let s = 0;
            if (n.includes('direct')) s += 3;
            if (n.includes('growth')) s += 3;
            if (!wantsIncome && /(idcw|dividend|payout|reinvest)/.test(n)) s -= 6;
            if (!wantsDebt && /(liquid|overnight|low\s*duration|ultra\s*short|money\s*market|gilt|debt|bond)/.test(n)) s -= 4;
            if (!wantsUs && /\bus\b|overseas|global|international/.test(n)) s -= 2;
            return s;
        };

        return rows
            .map((r, i) => ({ r, i, s: score(r.schemeName) }))
            .sort((a, b) => b.s - a.s || a.i - b.i)
            .map((x) => x.r);
    }

    /** Latest NAV for a scheme. */
    async getLatestNav(schemeCode: number): Promise<FundNav> {
        const url = `${BASE_URL}/mf/${schemeCode}/latest`;
        const raw = await this.fetchScheme(url, schemeCode);
        const point = raw.data[0];
        if (!point) throw new Error(`No NAV data available for scheme ${schemeCode}`);
        return {
            schemeCode: raw.meta.scheme_code,
            schemeName: raw.meta.scheme_name,
            fundHouse: raw.meta.fund_house,
            category: raw.meta.scheme_category,
            nav: Number(point.nav),
            date: this.toIso(this.parseApiDate(point.date)),
            source: 'AMFI / MFAPI.in',
            fetchedAt: new Date().toISOString(),
        };
    }

    /** Full NAV history for a scheme (newest first, as returned by the API). */
    private async getHistory(schemeCode: number): Promise<NavHistoryRaw> {
        const url = `${BASE_URL}/mf/${schemeCode}`;
        return this.fetchScheme(url, schemeCode);
    }

    private async fetchScheme(url: string, schemeCode: number): Promise<NavHistoryRaw> {
        try {
            const raw = await httpGetJson<NavHistoryRaw>(url);
            if (!raw || !Array.isArray(raw.data) || raw.data.length === 0) {
                throw new Error(`No data returned for scheme ${schemeCode}`);
            }
            return raw;
        } catch (err) {
            if (err instanceof HttpError && err.status === 404) {
                throw new Error(`Mutual fund scheme ${schemeCode} not found. Use search_mutual_funds to find a valid scheme code.`);
            }
            throw err;
        }
    }

    /**
     * Compute real returns for a lump-sum investment using live NAV history.
     * Finds the NAV on/before the investment date, values the units at the latest
     * NAV, and reports absolute return, CAGR and XIRR.
     */
    async computeLumpsumReturns(params: {
        schemeCode: number;
        investedAmount: number;
        investedDate: string; // ISO yyyy-mm-dd
    }): Promise<FundReturns> {
        const { schemeCode, investedAmount } = params;
        const iso = coerceDateISO(params.investedDate);
        if (!iso) {
            throw new Error(`Could not parse investedDate "${params.investedDate}". Try yyyy-mm-dd (e.g. 2024-01-23).`);
        }
        const investDate = new Date(`${iso}T00:00:00Z`);

        const history = await this.getHistory(schemeCode);
        const points = history.data; // newest first

        // Latest NAV
        const latestRaw = points[0];
        const latestDate = this.parseApiDate(latestRaw.date);
        const latestNav = Number(latestRaw.nav);

        // NAV on/before the investment date (points are newest-first, so scan for
        // the first entry whose date is <= the requested investment date).
        const buyRaw = points.find((p) => this.parseApiDate(p.date).getTime() <= investDate.getTime());
        if (!buyRaw) {
            const oldest = this.parseApiDate(points[points.length - 1].date);
            throw new Error(
                `No NAV available on/before ${params.investedDate}. This scheme's earliest NAV is ${this.toIso(oldest)}.`,
            );
        }
        const buyDate = this.parseApiDate(buyRaw.date);
        const navAtBuy = Number(buyRaw.nav);

        const units = investedAmount / navAtBuy;
        const currentValue = units * latestNav;
        const absoluteGain = currentValue - investedAmount;
        const absoluteReturn = investedAmount > 0 ? absoluteGain / investedAmount : 0;
        const holdingYears = yearsBetween(buyDate, latestDate);
        const cagrValue = cagr(investedAmount, currentValue, holdingYears);

        let xirrValue = cagrValue;
        try {
            xirrValue = xirr([
                { amount: -investedAmount, date: buyDate },
                { amount: currentValue, date: latestDate },
            ]);
        } catch {
            // fall back to CAGR if XIRR fails to converge (e.g. same-day)
        }

        return {
            scheme: {
                schemeCode: history.meta.scheme_code,
                schemeName: history.meta.scheme_name,
                fundHouse: history.meta.fund_house,
                category: history.meta.scheme_category,
            },
            investedAmount,
            investedDate: params.investedDate,
            navAtInvestment: navAtBuy,
            navAtInvestmentDate: this.toIso(buyDate),
            latestNav,
            latestNavDate: this.toIso(latestDate),
            unitsAllotted: Number(units.toFixed(4)),
            currentValue: Math.round(currentValue),
            absoluteReturn,
            absoluteGain: Math.round(absoluteGain),
            holdingYears: Number(holdingYears.toFixed(2)),
            cagr: cagrValue,
            xirr: xirrValue,
            source: 'AMFI / MFAPI.in',
            fetchedAt: new Date().toISOString(),
        };
    }

    /** Categorize a scheme by its name; null = not an equity/index Direct-Growth plan we track. */
    private categorize(name: string): string | null {
        const n = name.toLowerCase();
        if (!n.includes('direct') || !n.includes('growth')) return null;
        if (/idcw|dividend|payout|reinvest/.test(n)) return null;
        if (/nifty\s*50/.test(n) && n.includes('index')) return 'Index (Nifty 50)';
        if (/large\s*cap|top\s*100|blue\s*chip/.test(n)) return 'Large Cap';
        if (/flexi\s*cap|multi\s*cap/.test(n)) return 'Flexi/Multi Cap';
        if (/mid\s*cap/.test(n)) return 'Mid Cap';
        if (/small\s*cap/.test(n)) return 'Small Cap';
        return null;
    }

    /**
     * Build the fund universe LIVE from AMFI/MFAPI's full scheme master, filtered
     * to Direct-Growth equity/index plans. Cached 24h (NAVs change once daily, so
     * a daily cache is correct, not just convenient).
     */
    @Cache({ ttl: 86400 })
    async getSchemeUniverse(): Promise<FundUniverseItem[]> {
        const raw = await httpGetJson<Array<{ schemeCode: number; schemeName: string }>>(
            `${BASE_URL}/mf`,
            { timeoutMs: 30000 },
        );
        const items: FundUniverseItem[] = [];
        for (const r of raw) {
            const category = this.categorize(r.schemeName);
            if (category) items.push({ schemeCode: r.schemeCode, schemeName: r.schemeName, category });
        }
        return items;
    }

    /** Popular funds derived from the live universe (major AMCs × tracked categories). Cached 24h. */
    @Cache({ ttl: 86400 })
    async getPopularFunds(): Promise<PopularFundsOutput> {
        const universe = await this.getSchemeUniverse();
        const amcs = ['hdfc', 'icici', 'sbi ', 'axis', 'mirae', 'nippon', 'kotak', 'parag parikh', 'uti', 'quant'];
        const perCategory = new Map<string, number>();
        const funds: FundUniverseItem[] = [];
        for (const item of universe) {
            const n = item.schemeName.toLowerCase();
            if (!amcs.some((a) => n.includes(a))) continue;
            const seen = perCategory.get(item.category) ?? 0;
            if (seen >= 8) continue; // cap per category
            funds.push(item);
            perCategory.set(item.category, seen + 1);
        }
        return {
            source: 'AMFI / MFAPI.in scheme master (live, cached 24h)',
            asOf: new Date().toISOString().slice(0, 10),
            count: funds.length,
            categories: [...new Set(funds.map((f) => f.category))],
            funds,
        };
    }

    /** Live market snapshot derived from Nifty-50 index-fund NAVs. Cached 1h. */
    @Cache({ ttl: 3600 })
    async getMarketSnapshot(): Promise<MarketSnapshot> {
        const universe = await this.getSchemeUniverse();
        const indexFunds = universe.filter((f) => f.category === 'Index (Nifty 50)').slice(0, 6);
        const results = await Promise.allSettled(indexFunds.map((f) => this.getLatestNav(f.schemeCode)));
        const funds = results.map((r, i) =>
            r.status === 'fulfilled'
                ? { schemeCode: r.value.schemeCode, schemeName: r.value.schemeName, nav: r.value.nav, navDate: r.value.date }
                : { schemeCode: indexFunds[i].schemeCode, schemeName: indexFunds[i].schemeName, nav: null },
        );
        return {
            source: 'AMFI / MFAPI.in',
            basis: 'Nifty 50 index funds (Direct-Growth), fetched live',
            fetchedAt: new Date().toISOString(),
            count: funds.length,
            funds,
        };
    }
}
