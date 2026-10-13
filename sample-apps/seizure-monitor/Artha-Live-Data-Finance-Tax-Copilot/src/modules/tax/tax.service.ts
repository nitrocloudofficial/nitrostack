import { Injectable } from '@nitrostack/core';
import { coercePositive } from '../../common/validate.js';
import { DISCLAIMER } from '../../common/disclaimer.js';
import {
    AgeGroup,
    ASSESSMENT_YEAR,
    CESS_RATE,
    FINANCIAL_YEAR,
    TAX_SOURCE,
    NEW_REGIME,
    OLD_REGIME,
    OLD_REGIME_DEDUCTION_CAPS,
    Regime,
    RegimeConfig,
    Slab,
    SURCHARGE_TIERS,
} from './tax.data.js';

/** Deductions a taxpayer may claim under the old regime. */
export interface Deductions {
    section80C?: number;
    section80D?: number;
    nps80CCD1B?: number;
    homeLoanInterest24b?: number;
    hraExemption?: number;
    otherChapterVIA?: number;
}

export interface TaxCalcInput {
    grossIncome: number;
    isSalaried?: boolean;
    ageGroup?: AgeGroup;
    deductions?: Deductions;
}

export interface SlabBreakdownRow {
    band: string;
    rate: number;
    taxableInBand: number;
    taxForBand: number;
}

export interface RegimeResult {
    regime: Regime;
    grossIncome: number;
    standardDeduction: number;
    otherDeductions: number;
    totalDeductions: number;
    taxableIncome: number;
    taxBeforeRebate: number;
    rebate87A: number;
    taxAfterRebate: number;
    surcharge: number;
    cess: number;
    totalTax: number;
    effectiveRate: number;
    slabBreakdown: SlabBreakdownRow[];
    appliedDeductions: Record<string, number>;
}

export interface TaxComparison {
    financialYear: string;
    assessmentYear: string;
    grossIncome: number;
    ageGroup: AgeGroup;
    old: RegimeResult;
    new: RegimeResult;
    recommendation: {
        regime: Regime;
        totalTax: number;
        savesVsOther: number;
        note: string;
    };
    source: string;
    disclaimer: string;
}

export interface DeductionOptimizerInput {
    grossIncome: number;
    ageGroup?: AgeGroup;
    regime?: Regime;
    deductions: Deductions;
}

export interface DeductionLine {
    name: string;
    section: string;
    used: number;
    cap: number;
    status: 'over' | 'under' | 'optimal';
    wasted: number;
    headroom: number;
    potentialTaxSaving: number;
}

export interface DeductionOptimizerResult {
    regime: Regime;
    grossIncome: number;
    lines: DeductionLine[];
    totalWasted: number;
    totalUnclaimedSaving: number;
    flags: string[];
    note: string;
}

@Injectable()
export class TaxService {
    /** Compute tax on income using progressive slabs, returning the breakdown. */
    private computeSlabTax(taxableIncome: number, slabs: Slab[]): {
        tax: number;
        rows: SlabBreakdownRow[];
    } {
        const rows: SlabBreakdownRow[] = [];
        let tax = 0;
        let lower = 0;

        for (const slab of slabs) {
            if (taxableIncome <= lower) break;
            const upper = Math.min(taxableIncome, slab.upTo);
            const taxableInBand = Math.max(0, upper - lower);
            const taxForBand = taxableInBand * slab.rate;
            tax += taxForBand;

            const upperLabel = slab.upTo === Infinity ? 'above' : this.inr(slab.upTo);
            rows.push({
                band: `${this.inr(lower)} – ${upperLabel}`,
                rate: slab.rate,
                taxableInBand: Math.round(taxableInBand),
                taxForBand: Math.round(taxForBand),
            });

            lower = slab.upTo;
        }

        return { tax, rows };
    }

    /** Section 87A rebate, with marginal relief for the new regime. */
    private computeRebate(taxBeforeRebate: number, taxableIncome: number, cfg: RegimeConfig): number {
        if (taxableIncome <= cfg.rebateIncomeThreshold) {
            return Math.min(taxBeforeRebate, cfg.rebateMaxAmount);
        }
        // Marginal relief: just above the threshold, tax payable is capped at the
        // amount by which income exceeds the threshold.
        if (cfg.rebateMarginalRelief) {
            const excess = taxableIncome - cfg.rebateIncomeThreshold;
            if (taxBeforeRebate > excess) {
                return taxBeforeRebate - excess;
            }
        }
        return 0;
    }

    /** Surcharge on base tax for high incomes (with regime-specific cap). */
    private computeSurcharge(baseTax: number, taxableIncome: number, cfg: RegimeConfig): number {
        let rate = 0;
        for (const tier of SURCHARGE_TIERS) {
            if (taxableIncome > tier.aboveIncome) rate = tier.rate;
        }
        rate = Math.min(rate, cfg.surchargeCap);
        return baseTax * rate;
    }

    private inr(n: number): string {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(n);
    }

    /**
     * Resolve an age group robustly. MCP clients often pass the raw age (40),
     * a numeric string ("40"), or a display label ("Below 60") instead of the
     * enum value — coerce all of these to a valid AgeGroup, defaulting safely.
     */
    private resolveAgeGroup(value: unknown): AgeGroup {
        const s = String(value ?? '').toLowerCase().replace(/[\s_-]/g, '');
        if (s === 'below60' || s === '60to80' || s === 'above80') return s as AgeGroup;

        const n = typeof value === 'number' ? value : parseInt(s, 10);
        if (Number.isFinite(n) && n > 0 && n < 130) {
            if (n >= 80) return 'above80';
            if (n >= 60) return '60to80';
            return 'below60';
        }

        if (s.includes('above') || s.includes('super') || s.includes('80')) return 'above80';
        if (s.includes('senior') || s.includes('60')) return '60to80';
        return 'below60';
    }

    /** Total deductible amount for a regime given the taxpayer's inputs. */
    private resolveDeductions(cfg: RegimeConfig, input: TaxCalcInput): {
        standardDeduction: number;
        otherDeductions: number;
        applied: Record<string, number>;
    } {
        const salaried = input.isSalaried ?? true;
        const standardDeduction = salaried ? cfg.standardDeduction : 0;
        const applied: Record<string, number> = {
            standardDeduction,
        };

        // The new regime does NOT allow the common Chapter VI-A deductions.
        if (cfg.regime === 'new') {
            return { standardDeduction, otherDeductions: 0, applied };
        }

        const d = input.deductions ?? {};
        const caps = OLD_REGIME_DEDUCTION_CAPS;
        const s80C = Math.min(coercePositive(d.section80C), caps.section80C);
        const s80D = Math.min(coercePositive(d.section80D), caps.section80D);
        const nps = Math.min(coercePositive(d.nps80CCD1B), caps.nps80CCD1B);
        const homeLoan = Math.min(coercePositive(d.homeLoanInterest24b), caps.homeLoanInterest24b);
        const hra = coercePositive(d.hraExemption);
        const other = coercePositive(d.otherChapterVIA);

        applied.section80C = s80C;
        applied.section80D = s80D;
        applied.nps80CCD1B = nps;
        applied.homeLoanInterest24b = homeLoan;
        applied.hraExemption = hra;
        applied.otherChapterVIA = other;

        const otherDeductions = s80C + s80D + nps + homeLoan + hra + other;
        return { standardDeduction, otherDeductions, applied };
    }

    private computeRegime(cfg: RegimeConfig, input: TaxCalcInput): RegimeResult {
        const ageGroup = this.resolveAgeGroup(input.ageGroup);
        const grossIncome = coercePositive(input.grossIncome);
        const { standardDeduction, otherDeductions, applied } = this.resolveDeductions(cfg, input);
        const totalDeductions = standardDeduction + otherDeductions;
        const taxableIncome = Math.max(0, grossIncome - totalDeductions);

        const { tax: taxBeforeRebate, rows } = this.computeSlabTax(taxableIncome, cfg.slabs[ageGroup]);
        const rebate = this.computeRebate(taxBeforeRebate, taxableIncome, cfg);
        const taxAfterRebate = Math.max(0, taxBeforeRebate - rebate);
        const surcharge = this.computeSurcharge(taxAfterRebate, taxableIncome, cfg);
        const cess = (taxAfterRebate + surcharge) * CESS_RATE;
        const totalTax = taxAfterRebate + surcharge + cess;

        return {
            regime: cfg.regime,
            grossIncome,
            standardDeduction,
            otherDeductions,
            totalDeductions,
            taxableIncome: Math.round(taxableIncome),
            taxBeforeRebate: Math.round(taxBeforeRebate),
            rebate87A: Math.round(rebate),
            taxAfterRebate: Math.round(taxAfterRebate),
            surcharge: Math.round(surcharge),
            cess: Math.round(cess),
            totalTax: Math.round(totalTax),
            effectiveRate: grossIncome > 0 ? totalTax / grossIncome : 0,
            slabBreakdown: rows,
            appliedDeductions: applied,
        };
    }

    /** Calculate and compare tax under both regimes; recommend the cheaper one. */
    calculate(input: TaxCalcInput): TaxComparison {
        const oldResult = this.computeRegime(OLD_REGIME, input);
        const newResult = this.computeRegime(NEW_REGIME, input);

        const cheaper = newResult.totalTax <= oldResult.totalTax ? newResult : oldResult;
        const other = cheaper.regime === 'new' ? oldResult : newResult;
        const savesVsOther = other.totalTax - cheaper.totalTax;

        const note =
            savesVsOther === 0
                ? 'Both regimes result in the same tax. The new regime is simpler (no proof of investments needed).'
                : `The ${cheaper.regime} regime saves ${this.inr(savesVsOther)} for this profile.`;

        return {
            financialYear: FINANCIAL_YEAR,
            assessmentYear: ASSESSMENT_YEAR,
            grossIncome: input.grossIncome,
            ageGroup: this.resolveAgeGroup(input.ageGroup),
            old: oldResult,
            new: newResult,
            recommendation: {
                regime: cheaper.regime,
                totalTax: cheaper.totalTax,
                savesVsOther,
                note,
            },
            source: TAX_SOURCE,
            disclaimer: DISCLAIMER,
        };
    }

    /**
     * Deduction Optimizer — flags over-used caps (money earning no deduction) and
     * unused allowances, quantifying the exact extra tax a taxpayer could save by
     * filling each headroom. Reuses the real tax engine for precise savings.
     */
    optimizeDeductions(input: DeductionOptimizerInput): DeductionOptimizerResult {
        const regime = input.regime ?? 'old';
        const caps = OLD_REGIME_DEDUCTION_CAPS;
        const d = input.deductions ?? {};

        const specs: Array<{ key: keyof Deductions; name: string; section: string; cap: number }> = [
            { key: 'section80C', name: 'ELSS / PPF / EPF / life insurance', section: '80C', cap: caps.section80C },
            { key: 'section80D', name: 'Health insurance premium', section: '80D', cap: caps.section80D },
            { key: 'nps80CCD1B', name: 'Additional NPS contribution', section: '80CCD(1B)', cap: caps.nps80CCD1B },
            { key: 'homeLoanInterest24b', name: 'Home-loan interest (self-occupied)', section: '24(b)', cap: caps.homeLoanInterest24b },
        ];

        const baseTax = this.calculate({ grossIncome: input.grossIncome, ageGroup: input.ageGroup, deductions: d }).old.totalTax;

        const lines: DeductionLine[] = specs.map((s) => {
            const used = coercePositive(d[s.key]);
            const wasted = Math.max(0, used - s.cap);
            const headroom = Math.max(0, s.cap - used);

            let potentialTaxSaving = 0;
            if (headroom > 0) {
                const filledTax = this.calculate({
                    grossIncome: input.grossIncome,
                    ageGroup: input.ageGroup,
                    deductions: { ...d, [s.key]: s.cap },
                }).old.totalTax;
                potentialTaxSaving = Math.max(0, baseTax - filledTax);
            }

            const status: DeductionLine['status'] = wasted > 0 ? 'over' : headroom > 0 ? 'under' : 'optimal';
            return { name: s.name, section: s.section, used, cap: s.cap, status, wasted, headroom, potentialTaxSaving: Math.round(potentialTaxSaving) };
        });

        const flags: string[] = [];
        for (const l of lines) {
            if (l.status === 'over') {
                flags.push(`${l.section}: ${this.inr(l.used)} exceeds the ${this.inr(l.cap)} cap — ${this.inr(l.wasted)} earns you no deduction.`);
            } else if (l.status === 'under' && l.headroom > 0) {
                flags.push(
                    `${l.section}: ${this.inr(l.headroom)} of headroom unused` +
                    (l.potentialTaxSaving > 0 ? ` — filling it could save up to ${this.inr(l.potentialTaxSaving)} in tax.` : '.'),
                );
            }
        }

        const note =
            regime === 'new'
                ? 'You are on the NEW regime, which disallows these deductions — this shows what the OLD regime would allow. Compare with calculate_income_tax before deciding.'
                : 'Analysis under the OLD regime, where these deductions apply.';

        return {
            regime,
            grossIncome: coercePositive(input.grossIncome),
            lines,
            totalWasted: lines.reduce((a, l) => a + l.wasted, 0),
            totalUnclaimedSaving: lines.reduce((a, l) => a + l.potentialTaxSaving, 0),
            flags,
            note,
        };
    }

    /** Marginal slab rate (fraction, no cess) applicable at a given taxable income. */
    marginalSlabRate(taxableIncome: number, regime: Regime = 'old', ageGroup: AgeGroup = 'below60'): number {
        const cfg = regime === 'new' ? NEW_REGIME : OLD_REGIME;
        const slabs = cfg.slabs[this.resolveAgeGroup(ageGroup)];
        for (const s of slabs) {
            if (taxableIncome <= s.upTo) return s.rate;
        }
        return slabs[slabs.length - 1].rate;
    }
}
