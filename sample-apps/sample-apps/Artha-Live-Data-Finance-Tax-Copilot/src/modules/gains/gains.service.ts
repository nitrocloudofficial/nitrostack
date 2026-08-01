import { Injectable } from '@nitrostack/core';
import { FundsService } from '../funds/funds.service.js';
import { TaxService } from '../tax/tax.service.js';
import { formatINR, formatPercent } from '../../common/format.js';
import { coerceNumber, coercePositive, normalizeEnum, coerceDateISO } from '../../common/validate.js';
import { CAPITAL_GAINS, FundType, isEquityType } from './gains.data.js';

export interface CapitalGainsInput {
    fundType: FundType;
    investedAmount: number;
    investedDate: string; // ISO
    schemeCode?: number;   // fetch live current value
    currentValue?: number; // explicit alternative
    sellDate?: string;     // ISO, default = latest NAV date / today
    income?: number;       // to derive slab rate for debt
    marginalRatePct?: number; // explicit slab rate override for debt
}

export interface CapitalGainsEstimate {
    fundType: FundType;
    gainType: 'LTCG' | 'STCG' | 'Slab-rate (debt)';
    investedAmount: number;
    currentValue: number;
    investedDate: string;
    sellDate: string;
    holdingMonths: number;
    capitalGain: number;
    exemptionApplied: number;
    taxableGain: number;
    headlineRate: number;   // fraction
    taxBeforeCess: number;
    cess: number;
    totalTax: number;
    netProceeds: number;
    effectiveTaxRate: number;
    reasoning: string;
    scheme?: { schemeCode: number; schemeName: string };
    source?: string;
    fetchedAt?: string;
    note: string;
}

function monthsBetween(a: Date, b: Date): number {
    let m = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
    if (b.getUTCDate() < a.getUTCDate()) m -= 1;
    return Math.max(0, m);
}

@Injectable({ deps: [FundsService, TaxService] })
export class GainsService {
    constructor(
        private readonly funds: FundsService,
        private readonly tax: TaxService,
    ) { }

    async estimate(rawInput: CapitalGainsInput): Promise<CapitalGainsEstimate> {
        // Defensive input coercion (NitroStack does not enforce Zod).
        const input: CapitalGainsInput = {
            ...rawInput,
            fundType: normalizeEnum(rawInput.fundType, ['equity', 'debt', 'hybrid_equity', 'hybrid_debt'] as const, 'equity'),
            investedDate: coerceDateISO(rawInput.investedDate) ?? rawInput.investedDate,
            sellDate: rawInput.sellDate != null ? (coerceDateISO(rawInput.sellDate) ?? rawInput.sellDate) : undefined,
            investedAmount: coercePositive(rawInput.investedAmount),
            currentValue: rawInput.currentValue != null ? coercePositive(rawInput.currentValue) : undefined,
            income: rawInput.income != null ? coercePositive(rawInput.income) : undefined,
            marginalRatePct: rawInput.marginalRatePct != null ? coerceNumber(rawInput.marginalRatePct, { min: 0, max: 50 }) : undefined,
            schemeCode: rawInput.schemeCode != null ? coerceNumber(rawInput.schemeCode, { min: 0 }) : undefined,
        };

        const investDate = new Date(`${input.investedDate}T00:00:00Z`);
        if (Number.isNaN(investDate.getTime())) {
            throw new Error(`Invalid investedDate "${input.investedDate}" — use ISO yyyy-mm-dd`);
        }

        // Resolve current value + sell date (live if a scheme code is supplied).
        let currentValue: number;
        let sellDateIso: string;
        let scheme: CapitalGainsEstimate['scheme'];
        let source: string | undefined;
        let fetchedAt: string | undefined;

        if (input.schemeCode != null) {
            const r = await this.funds.computeLumpsumReturns({
                schemeCode: input.schemeCode,
                investedAmount: input.investedAmount,
                investedDate: input.investedDate,
            });
            currentValue = r.currentValue;
            sellDateIso = input.sellDate ?? r.latestNavDate;
            scheme = { schemeCode: r.scheme.schemeCode, schemeName: r.scheme.schemeName };
            source = 'MFAPI.in';
            fetchedAt = new Date().toISOString();
        } else if (input.currentValue != null) {
            currentValue = input.currentValue;
            sellDateIso = input.sellDate ?? new Date().toISOString().slice(0, 10);
        } else {
            throw new Error('Provide either schemeCode (for live valuation) or currentValue.');
        }

        const sellDate = new Date(`${sellDateIso}T00:00:00Z`);
        const holdingMonths = monthsBetween(investDate, sellDate);
        const capitalGain = Math.round(currentValue - input.investedAmount);

        const equity = isEquityType(input.fundType);
        const rules = CAPITAL_GAINS;

        let gainType: CapitalGainsEstimate['gainType'];
        let headlineRate: number;
        let exemptionApplied = 0;
        let taxableGain = Math.max(0, capitalGain);
        let taxBeforeCess = 0;

        if (capitalGain <= 0) {
            gainType = equity ? (holdingMonths > rules.equity.ltcgHoldingMonths ? 'LTCG' : 'STCG') : 'Slab-rate (debt)';
            headlineRate = 0;
            taxableGain = 0;
        } else if (equity) {
            if (holdingMonths > rules.equity.ltcgHoldingMonths) {
                gainType = 'LTCG';
                headlineRate = rules.equity.ltcgRate;
                exemptionApplied = Math.min(capitalGain, rules.equity.ltcgExemption);
                taxableGain = Math.max(0, capitalGain - exemptionApplied);
                taxBeforeCess = taxableGain * headlineRate;
            } else {
                gainType = 'STCG';
                headlineRate = rules.equity.stcgRate;
                taxableGain = capitalGain;
                taxBeforeCess = taxableGain * headlineRate;
            }
        } else {
            // Debt fund — slab rate.
            gainType = 'Slab-rate (debt)';
            headlineRate =
                input.marginalRatePct != null
                    ? input.marginalRatePct / 100
                    : input.income != null
                        ? this.tax.marginalSlabRate(Math.max(0, input.income - 50000), 'old')
                        : rules.defaultDebtMarginalRate;
            taxableGain = capitalGain;
            taxBeforeCess = taxableGain * headlineRate;
        }

        const cess = taxBeforeCess * rules.cessRate;
        const totalTax = Math.round(taxBeforeCess + cess);
        const netProceeds = Math.round(currentValue - totalTax);
        const effectiveTaxRate = capitalGain > 0 ? totalTax / capitalGain : 0;

        const reasoning = this.buildReasoning({
            equity, gainType, holdingMonths, capitalGain, exemptionApplied, headlineRate, totalTax,
        });

        const note =
            capitalGain <= 0
                ? 'This is a capital loss — no tax is due, and the loss may be set off against other capital gains.'
                : equity
                    ? 'Equity-fund rules applied (Section 111A/112A). The ₹1.25L LTCG exemption is annual and shared across all equity LTCG.'
                    : 'Debt-fund gains (units bought on/after 1 Apr 2023) are taxed at your slab rate — no LTCG benefit or indexation.';

        return {
            fundType: input.fundType,
            gainType,
            investedAmount: input.investedAmount,
            currentValue: Math.round(currentValue),
            investedDate: input.investedDate,
            sellDate: sellDateIso,
            holdingMonths,
            capitalGain,
            exemptionApplied: Math.round(exemptionApplied),
            taxableGain: Math.round(taxableGain),
            headlineRate,
            taxBeforeCess: Math.round(taxBeforeCess),
            cess: Math.round(cess),
            totalTax,
            netProceeds,
            effectiveTaxRate,
            reasoning,
            scheme,
            source,
            fetchedAt,
            note,
        };
    }

    private buildReasoning(p: {
        equity: boolean;
        gainType: string;
        holdingMonths: number;
        capitalGain: number;
        exemptionApplied: number;
        headlineRate: number;
        totalTax: number;
    }): string {
        if (p.capitalGain <= 0) {
            return `Held ${p.holdingMonths} months with no gain — no capital-gains tax applies.`;
        }
        if (p.equity && p.gainType === 'LTCG') {
            return (
                `Equity fund held ${p.holdingMonths} months (>12) → LTCG at ${formatPercent(p.headlineRate, 1)} on ` +
                `${formatINR(p.capitalGain)} gain after the ${formatINR(p.exemptionApplied)} exemption → ` +
                `est. tax ${formatINR(p.totalTax)} (incl. 4% cess).`
            );
        }
        if (p.equity) {
            return (
                `Equity fund held ${p.holdingMonths} months (≤12) → STCG at ${formatPercent(p.headlineRate, 1)} on ` +
                `${formatINR(p.capitalGain)} → est. tax ${formatINR(p.totalTax)} (incl. 4% cess). ` +
                `Holding past 12 months would switch this to the lower 12.5% LTCG rate.`
            );
        }
        return (
            `Debt fund → gains taxed at your ${formatPercent(p.headlineRate, 1)} slab rate on ${formatINR(p.capitalGain)} ` +
            `→ est. tax ${formatINR(p.totalTax)} (incl. 4% cess).`
        );
    }
}
