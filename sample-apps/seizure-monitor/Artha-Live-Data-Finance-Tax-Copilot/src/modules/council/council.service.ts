import { Injectable } from '@nitrostack/core';
import { TaxService } from '../tax/tax.service.js';
import { formatINR, formatPercent } from '../../common/format.js';
import { DISCLAIMER } from '../../common/disclaimer.js';
import {
    ASSUMED_EQUITY_XIRR,
    DEFAULT_EMERGENCY_MONTHS,
    DEFAULT_LOAN_RATE,
    labelForVerdict,
    normalizeVerdict,
    SECTION_80C_LIMIT,
    Verdict,
    VERDICT_LABELS,
} from './council.data.js';

export interface CouncilInput {
    income: number;
    surplus: number;
    hasLoan: boolean;
    loanRate?: number;          // annual % (e.g. 9)
    loanOutstanding?: number;   // ₹
    regime?: 'old' | 'new';
    section80CUsed?: number;    // ₹
    emergencyFundMonths?: number;
    expectedEquityReturn?: number; // fraction (e.g. 0.12)
}

export interface AgentVerdict {
    agent: 'tax_saver' | 'growth' | 'safety';
    lens: string;
    verdict: Verdict;
    verdictLabel: string;
    reasoning: string;
    score: number; // 0–10
    details: Record<string, string | number>;
}

export interface ReconcileInput {
    taxVerdict: string;
    growthVerdict: string;
    safetyVerdict: string;
    taxScore: number;
    growthScore: number;
    safetyScore: number;
    taxReasoning?: string;
    growthReasoning?: string;
    safetyReasoning?: string;
}

export interface CouncilBreakdownRow {
    agent: string;
    verdict: string;
    verdictLabel: string;
    score: number;
    reasoning?: string;
}

export interface CouncilResult {
    finalRecommendation: string;
    finalLabel: string;
    agreementLevel: string;
    agreeCount: number;
    confidence: number; // 0–1
    breakdown: CouncilBreakdownRow[];
    rationale: string;
}

/** Full council session: the three agents' verdicts plus the reconciled result. */
export interface CouncilSession extends CouncilResult {
    agents: AgentVerdict[];
    disclaimer: string;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const pct = (fraction: number) => formatPercent(fraction, 1);

@Injectable({ deps: [TaxService] })
export class CouncilService {
    constructor(private readonly taxService: TaxService) { }

    /** TAX lens — reuses the real tax engine to price the 80C benefit of ELSS. */
    taxSaver(input: CouncilInput): AgentVerdict {
        const regime = input.regime ?? 'old';
        const used = input.section80CUsed ?? 0;
        const headroom = Math.max(0, SECTION_80C_LIMIT - used);
        const elss = Math.min(input.surplus, headroom);

        // Reuse the tax calculator: tax saved by routing `elss` through 80C (old regime).
        const base = this.taxService.calculate({ grossIncome: input.income, deductions: { section80C: used } });
        const withElss = this.taxService.calculate({ grossIncome: input.income, deductions: { section80C: used + elss } });
        const taxSaved = Math.max(0, base.old.totalTax - withElss.old.totalTax);
        const marginalRate = elss > 0 ? taxSaved / elss : 0;

        let verdict: Verdict;
        let score: number;
        let reasoning: string;

        if (regime === 'new') {
            verdict = 'invest_equity';
            score = 4;
            reasoning =
                `Under the NEW regime, ELSS earns no 80C deduction, so investing the surplus yields no direct ` +
                `tax saving — and loan prepayment has no tax benefit either. Equity still wins on long-term ` +
                `capital-gains efficiency (₹1.25L LTCG exemption), so the tax lens leans mildly toward investing.`;
        } else if (headroom > 0 && elss > 0) {
            verdict = 'invest_elss';
            score = clamp(Math.round((marginalRate / 0.30) * 7 + 2), 3, 10);
            reasoning =
                `Investing ${formatINR(elss)} in ELSS cuts this year's tax by ${formatINR(taxSaved)} ` +
                `(old regime, ≈${pct(marginalRate)} marginal saving). Loan prepayment gives no 80C benefit, ` +
                `so on a pure tax lens the ELSS route wins.`;
        } else {
            verdict = 'invest_equity';
            score = 3;
            reasoning =
                `Your ₹1.5L 80C limit is already fully used, so extra ELSS won't reduce tax further. From a tax ` +
                `lens there's little to separate investing from prepaying; equity keeps its long-term gains edge.`;
        }

        return {
            agent: 'tax_saver',
            lens: 'Tax minimization',
            verdict,
            verdictLabel: VERDICT_LABELS[verdict],
            reasoning,
            score,
            details: {
                regime,
                section80CHeadroom: headroom,
                elssConsidered: Math.round(elss),
                estimatedTaxSaved: Math.round(taxSaved),
            },
        };
    }

    /** GROWTH lens — compares expected equity return against the loan rate. */
    growth(input: CouncilInput): AgentVerdict {
        const equity = input.expectedEquityReturn ?? ASSUMED_EQUITY_XIRR;
        const loan = input.hasLoan ? (input.loanRate != null ? input.loanRate / 100 : DEFAULT_LOAN_RATE) : null;

        let verdict: Verdict;
        let score: number;
        let reasoning: string;

        if (loan === null) {
            verdict = 'invest_equity';
            score = 8;
            reasoning =
                `There's no loan to prepay, so the surplus should compound. Long-term Indian equity has ` +
                `historically returned ≈${pct(equity)} (XIRR), well above cash — stay invested for growth.`;
        } else {
            const spread = equity - loan;
            if (spread > 0.02) {
                verdict = 'invest_equity';
                score = clamp(Math.round(5 + spread * 100 * 0.6), 5, 10);
                reasoning =
                    `Expected equity ≈${pct(equity)} outpaces your ${pct(loan)} loan by ${pct(spread)}. Over a long ` +
                    `horizon, investing should build more wealth than prepaying, so growth favors investing.`;
            } else if (spread < -0.02) {
                verdict = 'prepay_loan';
                score = clamp(Math.round(5 + -spread * 100 * 0.6), 5, 10);
                reasoning =
                    `Your loan costs ${pct(loan)}, above the ≈${pct(equity)} expected from equity. Prepaying is a ` +
                    `risk-free "return" equal to the loan rate, so growth-adjusted-for-risk favors prepaying.`;
            } else {
                verdict = 'invest_equity';
                score = 5;
                reasoning =
                    `Equity (≈${pct(equity)}) and your loan (${pct(loan)}) are close, so it's roughly a wash. A slight ` +
                    `edge to investing over long horizons, but a guaranteed prepay return is defensible too.`;
            }
        }

        return {
            agent: 'growth',
            lens: 'Long-term wealth compounding',
            verdict,
            verdictLabel: VERDICT_LABELS[verdict],
            reasoning,
            score,
            details: {
                expectedEquityReturnPct: Number((equity * 100).toFixed(1)),
                loanRatePct: loan === null ? 0 : Number((loan * 100).toFixed(1)),
            },
        };
    }

    /** SAFETY lens — liquidity buffer first, then leverage. */
    safety(input: CouncilInput): AgentVerdict {
        const emFund = input.emergencyFundMonths ?? DEFAULT_EMERGENCY_MONTHS;
        const dti =
            input.loanOutstanding && input.income
                ? input.loanOutstanding / input.income
                : input.hasLoan
                    ? 0.5
                    : 0;

        let verdict: Verdict;
        let score: number;
        let reasoning: string;

        if (emFund < 6) {
            verdict = 'build_emergency_fund';
            score = clamp(Math.round(9 - emFund), 6, 10);
            reasoning =
                `Your emergency fund covers ≈${emFund} month(s) of expenses — below the 6-month safety floor. ` +
                `Build liquid savings before locking money into ELSS (3-year lock-in) or an illiquid prepayment.`;
        } else if (dti > 0.5) {
            verdict = 'prepay_loan';
            score = clamp(Math.round(6 + dti * 4), 6, 10);
            reasoning =
                `Debt is high relative to income (≈${dti.toFixed(1)}× annual income). Reducing leverage lowers ` +
                `financial risk, so the safety lens puts loan prepayment first.`;
        } else {
            verdict = 'invest_equity';
            score = 5;
            reasoning =
                `You have an adequate emergency buffer (${emFund}+ months) and manageable leverage, so a measured ` +
                `equity investment is acceptable from a risk standpoint.`;
        }

        return {
            agent: 'safety',
            lens: 'Liquidity & risk',
            verdict,
            verdictLabel: VERDICT_LABELS[verdict],
            reasoning,
            score,
            details: {
                emergencyFundMonths: emFund,
                debtToIncome: Number(dti.toFixed(2)),
            },
        };
    }

    /**
     * Reconcile the three verdicts by COMBINED SCORE PER VERDICT: each agent's
     * score is summed onto the verdict it chose; the verdict with the highest
     * total wins (tie-break: agreement count, then highest single score).
     */
    reconcile(input: ReconcileInput): CouncilResult {
        const entries = [
            { agent: 'tax_saver', verdict: normalizeVerdict(input.taxVerdict), score: input.taxScore, reasoning: input.taxReasoning },
            { agent: 'growth', verdict: normalizeVerdict(input.growthVerdict), score: input.growthScore, reasoning: input.growthReasoning },
            { agent: 'safety', verdict: normalizeVerdict(input.safetyVerdict), score: input.safetyScore, reasoning: input.safetyReasoning },
        ];

        const totals = new Map<string, { total: number; count: number; maxSingle: number }>();
        for (const e of entries) {
            const t = totals.get(e.verdict) ?? { total: 0, count: 0, maxSingle: 0 };
            t.total += e.score;
            t.count += 1;
            t.maxSingle = Math.max(t.maxSingle, e.score);
            totals.set(e.verdict, t);
        }

        let winner = entries[0].verdict;
        let best = { total: -1, count: 0, maxSingle: 0 };
        for (const [verdict, t] of totals) {
            const better =
                t.total > best.total ||
                (t.total === best.total && (t.count > best.count || (t.count === best.count && t.maxSingle > best.maxSingle)));
            if (better) {
                winner = verdict;
                best = t;
            }
        }

        const sumAll = entries.reduce((s, e) => s + e.score, 0);
        const agreeCount = entries.filter((e) => e.verdict === winner).length;
        const confidence = sumAll > 0 ? best.total / sumAll : 0;
        const finalLabel = labelForVerdict(winner);

        const breakdown: CouncilBreakdownRow[] = entries.map((e) => ({
            agent: e.agent,
            verdict: e.verdict,
            verdictLabel: labelForVerdict(e.verdict),
            score: e.score,
            reasoning: e.reasoning,
        }));

        const rationale =
            `${agreeCount} of 3 lenses back "${finalLabel}" with the highest combined conviction ` +
            `(${best.total}/${sumAll} points, ${pct(confidence)} of the total). ` +
            (agreeCount < 2
                ? 'The council is split — weigh the dissenting lenses before deciding.'
                : 'The council is largely aligned.');

        return {
            finalRecommendation: winner,
            finalLabel,
            agreementLevel: `${agreeCount} of 3 agents agree`,
            agreeCount,
            confidence,
            breakdown,
            rationale,
        };
    }

    /**
     * Convene the full council in ONE deterministic pass — the robust machine.
     *
     * Runs all three lenses in-process and feeds their REAL verdicts + scores
     * straight into reconcile(), so the reconciliation inputs can never be
     * mis-typed or invented by an LLM. Each lens is isolated: if one throws, it
     * degrades to a neutral verdict rather than crashing the council. `onProgress`
     * streams a callback before each step for task-augmented streaming.
     */
    convene(input: CouncilInput, onProgress?: (message: string) => void): CouncilSession {
        const progress = (m: string) => onProgress?.(m);

        // Defensive coercion — NitroStack does not enforce Zod on inputs.
        const safe: CouncilInput = {
            ...input,
            income: Math.max(1, Number(input.income) || 0),
            surplus: Math.max(1, Number(input.surplus) || 0),
            hasLoan: Boolean(input.hasLoan),
        };

        const runLens = (agent: AgentVerdict['agent'], fn: (i: CouncilInput) => AgentVerdict): AgentVerdict => {
            try {
                return fn(safe);
            } catch (err) {
                return {
                    agent,
                    lens: `${agent} (unavailable)`,
                    verdict: 'invest_equity',
                    verdictLabel: VERDICT_LABELS.invest_equity,
                    reasoning: `This lens could not evaluate: ${(err as Error).message}`,
                    score: 0,
                    details: {},
                };
            }
        };

        progress('🧾 Tax lens deliberating…');
        const tax = runLens('tax_saver', (i) => this.taxSaver(i));

        progress('📈 Growth lens deliberating…');
        const growth = runLens('growth', (i) => this.growth(i));

        progress('🛡️ Safety lens deliberating…');
        const safety = runLens('safety', (i) => this.safety(i));

        progress('⚖️ Reconciling the council…');
        const verdict = this.reconcile({
            taxVerdict: tax.verdict, taxScore: tax.score, taxReasoning: tax.reasoning,
            growthVerdict: growth.verdict, growthScore: growth.score, growthReasoning: growth.reasoning,
            safetyVerdict: safety.verdict, safetyScore: safety.score, safetyReasoning: safety.reasoning,
        });

        return { agents: [tax, growth, safety], ...verdict, disclaimer: DISCLAIMER };
    }
}
