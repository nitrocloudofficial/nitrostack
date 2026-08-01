/**
 * Curated map of popular Indian mutual funds → verified AMFI scheme codes.
 *
 * WHY THIS EXISTS: MFAPI.in's /mf/search is unreliable for common names — e.g.
 * "HDFC Top 100" returns zero results (the fund was renamed to "HDFC Large Cap
 * Fund" under SEBI recategorization), and "Parag Parikh" surfaces liquid funds
 * ahead of the flagship. Every code below was confirmed against MFAPI's full
 * /mf list on 2026-07-26. FundsService checks these first so marquee funds
 * always resolve, then falls back to live search for the long tail.
 */

export interface KnownFund {
    schemeCode: number;
    schemeName: string;
    /** Lowercase name fragments a query may use for this fund. */
    aliases: string[];
}

export const POPULAR_FUNDS: KnownFund[] = [
    {
        schemeCode: 119018,
        schemeName: 'HDFC Large Cap Fund (erstwhile HDFC Top 100) - Direct Plan - Growth',
        aliases: ['hdfc top 100', 'hdfc top100', 'hdfc large cap'],
    },
    {
        schemeCode: 118955,
        schemeName: 'HDFC Flexi Cap Fund - Direct Plan - Growth',
        aliases: ['hdfc flexi cap', 'hdfc flexicap', 'hdfc equity fund'],
    },
    {
        schemeCode: 122639,
        schemeName: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth',
        aliases: ['parag parikh flexi cap', 'parag parikh flexicap', 'ppfas flexi cap', 'parag parikh'],
    },
    {
        schemeCode: 120586,
        schemeName: 'ICICI Prudential Large Cap Fund (erstwhile Bluechip) - Direct Plan - Growth',
        aliases: ['icici prudential bluechip', 'icici bluechip', 'icici prudential large cap', 'icici large cap'],
    },
    {
        schemeCode: 125497,
        schemeName: 'SBI Small Cap Fund - Direct Plan - Growth',
        aliases: ['sbi small cap', 'sbi smallcap'],
    },
    {
        schemeCode: 118825,
        schemeName: 'Mirae Asset Large Cap Fund - Direct Plan - Growth',
        aliases: ['mirae asset large cap', 'mirae large cap', 'mirae bluechip'],
    },
    {
        schemeCode: 118632,
        schemeName: 'Nippon India Large Cap Fund - Direct Plan - Growth',
        aliases: ['nippon india large cap', 'nippon large cap', 'reliance large cap'],
    },
    {
        schemeCode: 120828,
        schemeName: 'quant Small Cap Fund - Direct Plan - Growth',
        aliases: ['quant small cap', 'quant smallcap'],
    },
    {
        schemeCode: 120716,
        schemeName: 'UTI Nifty 50 Index Fund - Direct Plan - Growth',
        aliases: ['uti nifty 50', 'uti nifty index', 'uti nifty 50 index'],
    },
];

/** Return curated funds whose aliases match the (free-text) query. */
export function matchPopularFunds(query: string): KnownFund[] {
    const qn = query.toLowerCase().trim();
    if (!qn) return [];
    return POPULAR_FUNDS.filter((f) =>
        f.aliases.some((a) => qn.includes(a) || (qn.length >= 6 && a.includes(qn))),
    );
}
