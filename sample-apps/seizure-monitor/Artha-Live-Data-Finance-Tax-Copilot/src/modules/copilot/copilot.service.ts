import { Injectable } from '@nitrostack/core';
import { TaxService, TaxComparison, Deductions } from '../tax/tax.service.js';
import { AgeGroup } from '../tax/tax.data.js';
import { FundsService, FundReturns } from '../funds/funds.service.js';
import { BankService, BankBranch } from '../bank/bank.service.js';
import { ComplianceService, UpcomingEvent } from '../compliance/compliance.service.js';
import { formatINR, formatPercent } from '../../common/format.js';
import { DISCLAIMER } from '../../common/disclaimer.js';

export interface FinancePlanInput {
    grossIncome: number;
    isSalaried?: boolean;
    ageGroup?: AgeGroup;
    deductions?: Deductions;
    fund?: {
        schemeCode: number;
        investedAmount: number;
        investedDate: string; // ISO yyyy-mm-dd
    };
    ifsc?: string;
    deadlineWindowDays?: number;
}

/** A section that either succeeded (`data`) or failed gracefully (`error`). */
type Section<T> = { ok: true; data: T } | { ok: false; error: string };

export interface FinancePlan {
    generatedAt: string;
    request: {
        grossIncome: number;
        checkedFund: boolean;
        checkedBank: boolean;
    };
    tax: TaxComparison;
    fund: Section<FundReturns> | null;
    bank: Section<BankBranch> | null;
    deadlines: UpcomingEvent[];
    summary: string;
    actionItems: string[];
    disclaimer: string;
}

@Injectable({ deps: [TaxService, FundsService, BankService, ComplianceService] })
export class CopilotService {
    constructor(
        private readonly taxService: TaxService,
        private readonly fundsService: FundsService,
        private readonly bankService: BankService,
        private readonly complianceService: ComplianceService,
    ) { }

    /**
     * The core agentic workflow: run every relevant sub-service and stitch the
     * results into a single coherent finance plan. `onProgress` is invoked before
     * each step so a task-augmented tool can stream progress to the client.
     */
    async buildPlan(
        input: FinancePlanInput,
        onProgress?: (message: string) => void,
    ): Promise<FinancePlan> {
        const progress = (m: string) => onProgress?.(m);

        // ── Step 1: tax (old vs new regime) ──────────────────────────────────
        progress('🧮 Calculating income tax under the old and new regime…');
        const tax = this.taxService.calculate({
            grossIncome: input.grossIncome,
            isSalaried: input.isSalaried,
            ageGroup: input.ageGroup,
            deductions: input.deductions,
        });

        // ── Step 2: mutual fund returns (optional) ───────────────────────────
        let fund: Section<FundReturns> | null = null;
        if (input.fund) {
            progress('📈 Fetching live NAV history and computing your fund returns…');
            try {
                const data = await this.fundsService.computeLumpsumReturns(input.fund);
                fund = { ok: true, data };
            } catch (err) {
                fund = { ok: false, error: (err as Error).message };
            }
        }

        // ── Step 3: bank IFSC verification (optional) ────────────────────────
        let bank: Section<BankBranch> | null = null;
        if (input.ifsc) {
            progress('🏦 Verifying your bank IFSC details…');
            try {
                const data = await this.bankService.verifyIfsc(input.ifsc);
                bank = { ok: true, data };
            } catch (err) {
                bank = { ok: false, error: (err as Error).message };
            }
        }

        // ── Step 4: upcoming compliance deadlines ────────────────────────────
        progress('📅 Surfacing your upcoming tax deadlines…');
        const deadlines = this.complianceService.getUpcoming({
            from: new Date(),
            withinDays: input.deadlineWindowDays ?? 180,
            limit: 6,
        });

        // ── Step 5: synthesize ───────────────────────────────────────────────
        progress('🧠 Compiling your personalized finance plan…');
        const { summary, actionItems } = this.synthesize(input, tax, fund, bank, deadlines);

        return {
            generatedAt: new Date().toISOString(),
            request: {
                grossIncome: input.grossIncome,
                checkedFund: Boolean(input.fund),
                checkedBank: Boolean(input.ifsc),
            },
            tax,
            fund,
            bank,
            deadlines,
            summary,
            actionItems,
            disclaimer: DISCLAIMER,
        };
    }

    private synthesize(
        input: FinancePlanInput,
        tax: TaxComparison,
        fund: Section<FundReturns> | null,
        bank: Section<BankBranch> | null,
        deadlines: UpcomingEvent[],
    ): { summary: string; actionItems: string[] } {
        const lines: string[] = [];
        const actions: string[] = [];

        // Tax
        const rec = tax.recommendation;
        lines.push(
            `On a gross income of ${formatINR(input.grossIncome)}, the ${rec.regime.toUpperCase()} regime is cheaper — ` +
            `total tax ${formatINR(rec.totalTax)} (old: ${formatINR(tax.old.totalTax)}, new: ${formatINR(tax.new.totalTax)}).`,
        );
        if (rec.savesVsOther > 0) {
            actions.push(`Opt for the ${rec.regime} regime — it saves ${formatINR(rec.savesVsOther)} vs the other regime.`);
        }
        if (rec.regime === 'old') {
            actions.push('Keep proof of your 80C/80D/NPS investments handy, since the old regime requires them.');
        }

        // Fund
        if (fund) {
            if (fund.ok) {
                const f = fund.data;
                lines.push(
                    `Your ${formatINR(f.investedAmount)} invested in "${f.scheme.schemeName}" on ${f.investedDate} ` +
                    `is now worth ${formatINR(f.currentValue)} — that's ${formatPercent(f.absoluteReturn)} absolute ` +
                    `(XIRR ${formatPercent(f.xirr)}, CAGR ${formatPercent(f.cagr)}) over ${f.holdingYears} years.`,
                );
                if (f.absoluteGain > 0) {
                    actions.push(`Note the ${formatINR(f.absoluteGain)} gain on this fund for capital-gains reporting when you redeem.`);
                }
            } else {
                lines.push(`Could not compute fund returns: ${fund.error}`);
            }
        }

        // Bank
        if (bank) {
            if (bank.ok) {
                const b = bank.data;
                lines.push(
                    `Refund/payout account verified: ${b.bank}, ${b.branch}, ${b.city}, ${b.state} (IFSC ${b.ifsc}).`,
                );
                actions.push(`Use IFSC ${b.ifsc} (${b.bank}, ${b.city}) for your income-tax refund account.`);
            } else {
                lines.push(`Bank IFSC check failed: ${bank.error}`);
            }
        }

        // Deadlines
        const next = deadlines[0];
        if (next) {
            lines.push(
                `Your next deadline is "${next.title}" on ${next.dueDate} (${next.daysRemaining} day${next.daysRemaining === 1 ? '' : 's'} away).`,
            );
            for (const d of deadlines.slice(0, 3)) {
                actions.push(`⏰ ${d.title} — due ${d.dueDate} (${d.daysRemaining} days).`);
            }
        }

        return { summary: lines.join(' '), actionItems: actions };
    }
}
