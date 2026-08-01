import { ResourceDecorator as Resource, Injectable, ExecutionContext } from '@nitrostack/core';
import {
    ASSESSMENT_YEAR,
    CESS_RATE,
    FINANCIAL_YEAR,
    NEW_REGIME,
    OLD_REGIME,
    OLD_REGIME_DEDUCTION_CAPS,
    Slab,
    SURCHARGE_TIERS,
} from '../tax/tax.data.js';
import { COMPLIANCE_EVENTS } from '../compliance/compliance.data.js';
import { FundsService } from '../funds/funds.service.js';
import { RATE_SOURCES, RATES_ASOF, REPO_RATE } from '../rates/rates.data.js';

function formatSlabs(slabs: Slab[]) {
    return slabs.map((s) => ({
        upTo: s.upTo === Infinity ? 'and above' : s.upTo,
        rate: `${(s.rate * 100).toFixed(0)}%`,
    }));
}

/**
 * Read-only MCP Resources — the third MCP primitive alongside Tools and Prompts.
 * These expose the server's authoritative reference data (tax law, calendar,
 * fund map, data provenance, methodology) so clients can inspect the ground truth
 * behind every tool's output.
 */
@Injectable({ deps: [FundsService] })
export class FinanceResources {
    constructor(private readonly funds: FundsService) { }

    @Resource({
        uri: 'finance://tax/slabs/2025-26',
        name: 'Income Tax Slabs (FY 2025-26)',
        description: 'Old vs new regime slabs, standard deduction, Section 87A rebate, surcharge tiers and cess for FY 2025-26 (AY 2026-27).',
        mimeType: 'application/json',
    })
    async taxSlabs(_uri: string, _ctx: ExecutionContext) {
        return {
            financialYear: FINANCIAL_YEAR,
            assessmentYear: ASSESSMENT_YEAR,
            cess: `${(CESS_RATE * 100).toFixed(0)}%`,
            newRegime: {
                standardDeduction: NEW_REGIME.standardDeduction,
                rebate87AUpToTaxableIncome: NEW_REGIME.rebateIncomeThreshold,
                slabs: formatSlabs(NEW_REGIME.slabs.below60),
            },
            oldRegime: {
                standardDeduction: OLD_REGIME.standardDeduction,
                rebate87AUpToTaxableIncome: OLD_REGIME.rebateIncomeThreshold,
                deductionCaps: OLD_REGIME_DEDUCTION_CAPS,
                slabs: formatSlabs(OLD_REGIME.slabs.below60),
            },
            surchargeTiers: SURCHARGE_TIERS.map((t) => ({ aboveIncome: t.aboveIncome, rate: `${(t.rate * 100).toFixed(0)}%` })),
            source: 'Finance Act 2025',
        };
    }

    @Resource({
        uri: 'finance://compliance/calendar',
        name: 'Tax Compliance Calendar (AY 2026-27)',
        description: 'Statutory Indian tax & filing due dates (ITR, advance tax, audit, tax-saving investment cut-offs).',
        mimeType: 'application/json',
    })
    async complianceCalendar(_uri: string, _ctx: ExecutionContext) {
        return { count: COMPLIANCE_EVENTS.length, events: COMPLIANCE_EVENTS };
    }

    @Resource({
        uri: 'finance://funds/popular',
        name: 'Popular Mutual Funds (live, category-filtered)',
        description: 'Built LIVE from AMFI/MFAPI\'s full scheme master — major AMCs across large/flexi/mid/small-cap and index Direct-Growth plans. Cached 24h.',
        mimeType: 'application/json',
    })
    async popularFunds(_uri: string, _ctx: ExecutionContext) {
        try {
            return await this.funds.getPopularFunds();
        } catch (err) {
            return { error: `Fund universe temporarily unavailable: ${(err as Error).message}`, count: 0, funds: [] };
        }
    }

    @Resource({
        uri: 'finance://data-sources',
        name: 'Live Data Sources & Provenance',
        description: 'Which data is fetched live per request vs authoritative dated reference — the backbone of the "real data, not mocked" guarantee.',
        mimeType: 'application/json',
    })
    async dataSources(_uri: string, _ctx: ExecutionContext) {
        return {
            live: [
                { source: 'AMFI / MFAPI.in', use: 'Mutual fund NAV, history, XIRR', url: 'https://api.mfapi.in', auth: 'none (keyless)' },
                { source: 'Razorpay IFSC', use: 'Bank / branch verification', url: 'https://ifsc.razorpay.com', auth: 'none (keyless)' },
            ],
            reference: [
                { source: RATE_SOURCES.repo, use: 'RBI repo rate', asOf: RATES_ASOF, current: `${(REPO_RATE * 100).toFixed(2)}%`, note: 'No free RBI API; authoritative dated value, env-overridable.' },
                { source: RATE_SOURCES.fd, use: 'Representative FD rates', asOf: RATES_ASOF },
            ],
        };
    }

    @Resource({
        uri: 'finance://methodology',
        name: 'Calculation Methodology',
        description: 'How income tax, mutual fund returns (CAGR/XIRR) and capital-gains tax are computed by this server.',
        mimeType: 'text/markdown',
    })
    async methodology(_uri: string, _ctx: ExecutionContext) {
        return [
            '# Calculation Methodology',
            '',
            '## Income tax',
            '- Progressive slab tax under both regimes (FY 2025-26), Section 87A rebate with marginal relief (new regime),',
            '  surcharge tiers (capped at 25% for the new regime) and 4% Health & Education Cess.',
            '- Old-regime deductions are capped: 80C ₹1.5L, 80CCD(1B) ₹50k, 24(b) ₹2L.',
            '',
            '## Mutual fund returns',
            '- NAV history is fetched live from AMFI (MFAPI.in). Units = amount / NAV on/before the buy date.',
            '- CAGR = (currentValue / invested)^(1/years) − 1.',
            '- XIRR solves Σ amount_i / (1+r)^(days_i/365) = 0 via Newton–Raphson with a bisection fallback.',
            '',
            '## Capital gains',
            '- Equity: STCG 20% (≤12 months); LTCG 12.5% above the ₹1.25L exemption (>12 months).',
            '- Debt (units bought on/after 1 Apr 2023): taxed at the slab rate; 4% cess applies to all.',
            '',
            '_Informational only — not professional tax advice._',
        ].join('\n');
    }

    @Resource({
        uri: 'finance://market/snapshot',
        name: 'Live Market Snapshot',
        description: 'CURRENT NAVs of Nifty-50 index funds, fetched live from AMFI (derived from the live scheme master, cached 1h) — a dynamic, real-data resource.',
        mimeType: 'application/json',
    })
    async marketSnapshot(_uri: string, _ctx: ExecutionContext) {
        try {
            return await this.funds.getMarketSnapshot();
        } catch (err) {
            return {
                source: 'AMFI / MFAPI.in',
                error: `Live snapshot temporarily unavailable: ${(err as Error).message}`,
                count: 0,
                funds: [],
            };
        }
    }

    @Resource({
        uri: 'finance://security',
        name: 'Security Posture',
        description: 'Summary of the server\'s security controls: auth, input validation, rate limiting, privacy, transport and error handling.',
        mimeType: 'application/json',
    })
    async security(_uri: string, _ctx: ExecutionContext) {
        return {
            authentication: 'Optional API-key guard (env-gated via API_KEY); the public demo is keyless.',
            inputValidation: 'Zod schemas plus defensive coercion of numbers and enums on every tool.',
            rateLimiting: '30 requests/minute on all outbound-API tools and the orchestrators.',
            dataPrivacy: 'No PII is persisted; nothing is written to disk; inputs are used in-memory only.',
            transport: 'Outbound calls are HTTPS with a request timeout; no secrets or API keys required.',
            errorHandling: 'A global exception filter returns clean messages; stack traces never leak.',
            externalSources: ['AMFI / MFAPI.in (keyless)', 'Razorpay IFSC (keyless)'],
        };
    }
}
