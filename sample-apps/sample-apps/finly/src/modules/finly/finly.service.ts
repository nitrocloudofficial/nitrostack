/**
 * Finly's financial arithmetic, ported from mcp/tools/*.py.
 *
 * Pure functions. No network, no model, no state. Every figure a user sees comes
 * from here rather than from a language model, which is the whole point: the MCP
 * host supplies the conversation, and this supplies numbers that cannot be
 * hallucinated.
 *
 * The rule that shapes this file:
 *
 *     Affordability is judged against a WEAK month, not an average one.
 *
 * For someone whose income is irregular the mean is close to meaningless. What
 * governs their financial life is how bad a bad month is.
 *
 * Kept deliberately in step with the Python originals, including the 0.20
 * stability threshold and the second-lowest-month rule. If you change one side,
 * change the other.
 */

import { Injectable } from '@nitrostack/core';

export type Stability = 'stable' | 'variable' | 'highly_variable';
export type Verdict = 'affordable' | 'tight' | 'not_affordable';

export interface IncomePattern {
    average: number;
    weakMonth: number;
    strongestMonth: number;
    variation: number;
    stability: Stability;
    monthsObserved: number;
    swing: number;
}

export interface Affordability {
    verdict: Verdict;
    commitment: number;
    weakMonthSurplus: number;
    shortfall: number;
    safeCommitment: number;
    reason: string;
}

export interface EarlyExit {
    year: number;
    paidInByThen: number;
    surrenderValue: number;
    loss: number;
    lossPercent: number;
    note: string;
}

export interface RoadmapStep {
    order: number;
    title: string;
    why: string;
    targetAmount: number | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Coerce whatever arrived into a list of positive numbers.
 *
 * Callers are not all well behaved. NitroStudio renders an array input as a text
 * box, so it sends "12000, 30000, 14000" as a string. An MCP host may send
 * ["12000", "30000"] as strings. Both used to break, and the second broke
 * silently: "12000" + "30000" concatenates, so the average came out as
 * 3000075000350007000 with no error raised at all.
 *
 * A wrong number that looks like a number is worse than a crash, so this
 * normalises at the boundary rather than trusting the caller.
 */
/**
 * Split a string of numbers, resolving the comma ambiguity.
 *
 * In India a comma is both a separator and a digit group marker, so
 * "12,000, 30,000" is genuinely ambiguous on its face. The rule used here:
 *
 *   if a comma sits directly between digits with exactly three digits after it
 *   — "12,000" — every comma in the string is a thousands separator, and the
 *   values are split on whitespace instead.
 *
 * That reads "₹12,000 ₹30,000" and "12000, 30000" correctly, which covers what
 * NitroStudio's text box and a model actually produce. It cannot resolve
 * "12,000,30,000" with no spaces at all, and nothing can — that string means two
 * different things depending on intent.
 */
export function splitNumberList(input: string): string[] {
    const thousandsSeparated = /\d,\d{3}(\D|$)/.test(input);
    return thousandsSeparated
        ? input.replace(/,/g, '').split(/\s+/)
        : input.split(/[,\s]+/);
}

export function toPositiveNumbers(input: unknown): number[] {
    let values: unknown[];

    if (typeof input === 'string') {
        values = splitNumberList(input);
    } else if (Array.isArray(input)) {
        values = input;
    } else if (input === null || input === undefined) {
        values = [];
    } else {
        values = [input];
    }

    return values
        .map((v) => (typeof v === 'string' ? Number(v.replace(/[^0-9.\-]/g, '')) : Number(v)))
        .filter((n) => Number.isFinite(n) && n > 0);
}

function toNumber(input: unknown, fallback = 0): number {
    const n = typeof input === 'string' ? Number(input.replace(/[^0-9.\-]/g, '')) : Number(input);
    return Number.isFinite(n) ? n : fallback;
}

@Injectable()
export class FinlyService {
    /**
     * Describe an income stream by its variation, not just its average.
     *
     * `weakMonth` is the figure every affordability decision rests on. With four
     * or more months we take the second-lowest, so one freak month does not
     * permanently define the user's ceiling. Below that we take the true minimum,
     * because with little data the cautious reading is the honest one.
     */
    incomePattern(monthlyIncomes: number[] | unknown): IncomePattern {
        const months = toPositiveNumbers(monthlyIncomes);
        if (months.length === 0) {
            throw new Error(
                'Need at least one month of income above zero. Pass a list of numbers, ' +
                'for example [14000, 22000, 16000].',
            );
        }

        const ordered = [...months].sort((a, b) => a - b);
        const average = months.reduce((a, b) => a + b, 0) / months.length;
        const weak = months.length >= 4 ? ordered[1] : ordered[0];

        // Coefficient of variation, so a rider earning 14-22k and a manager
        // earning 140-220k are scored the same way.
        let variation = 0;
        if (months.length >= 2 && average > 0) {
            const meanSquares =
                months.reduce((sum, n) => sum + (n - average) ** 2, 0) / (months.length - 1);
            variation = Math.sqrt(meanSquares) / average;
        }

        // 0.20 is deliberately strict: income of roughly 12k-22k scores about
        // 0.23, and someone whose worst month is barely half their best needs the
        // strongest warning before taking on anything fixed.
        const stability: Stability =
            variation < 0.1 ? 'stable' : variation < 0.2 ? 'variable' : 'highly_variable';

        return {
            average: round2(average),
            weakMonth: round2(weak),
            strongestMonth: round2(ordered[ordered.length - 1]),
            variation: Math.round(variation * 10000) / 10000,
            stability,
            monthsObserved: months.length,
            swing: round2(ordered[ordered.length - 1] - weak),
        };
    }

    /** Days of essentials the user could cover if income stopped today. */
    runwayDays(availableFunds: unknown, monthlyEssentials: unknown): number {
        const essentials = toNumber(monthlyEssentials);
        const funds = toNumber(availableFunds);
        if (essentials <= 0) return 0;
        return Math.floor(Math.max(funds, 0) / (essentials / 30));
    }

    /** The largest monthly commitment that is safe in a weak month. */
    safeCommitment(
        monthlyIncomes: number[] | unknown,
        monthlyEssentials: unknown,
        bufferRatio = 0.1,
    ): number {
        const pattern = this.incomePattern(monthlyIncomes);
        const buffer = pattern.weakMonth * bufferRatio;
        return round2(Math.max(0, pattern.weakMonth - toNumber(monthlyEssentials) - buffer));
    }

    /**
     * Judge a recurring commitment against the user's weak month.
     *
     * `bufferRatio` is the slice of weak-month income deliberately left
     * untouched. Committing every last rupee of a bad month is not affordability.
     */
    canAfford(
        commitment: unknown,
        monthlyIncomes: number[] | unknown,
        monthlyEssentials: unknown,
        bufferRatio = 0.1,
    ): Affordability {
        const amount = toNumber(commitment);
        const essentials = toNumber(monthlyEssentials);
        const pattern = this.incomePattern(monthlyIncomes);
        const buffer = pattern.weakMonth * bufferRatio;
        const surplus = pattern.weakMonth - essentials - buffer;
        const rs = (n: number) => `Rs ${Math.round(n).toLocaleString('en-IN')}`;

        let verdict: Verdict;
        let shortfall = 0;
        let reason: string;

        if (amount <= surplus) {
            verdict = 'affordable';
            reason =
                `In your weakest month you had ${rs(pattern.weakMonth)}. After essentials ` +
                `of ${rs(essentials)} and a safety margin, ${rs(surplus)} was still ` +
                `free — enough for this.`;
        } else if (amount <= surplus + buffer) {
            verdict = 'tight';
            reason =
                `This fits only if you use your safety margin. In a month like your weakest ` +
                `(${rs(pattern.weakMonth)}) you would have almost nothing spare, so one ` +
                `unexpected cost would mean missing a payment.`;
        } else {
            verdict = 'not_affordable';
            shortfall = amount - surplus;
            reason =
                `In a month like your weakest (${rs(pattern.weakMonth)}) you would be short ` +
                `by about ${rs(shortfall)}. Your average month can cover it, but the weak ` +
                `months are the ones that break a fixed payment.`;
        }

        return {
            verdict,
            commitment: round2(amount),
            weakMonthSurplus: round2(surplus),
            shortfall: round2(shortfall),
            safeCommitment: round2(Math.max(0, surplus)),
            reason,
        };
    }

    /** Recommended emergency fund. Irregular income needs a deeper buffer. */
    emergencyFundTarget(monthlyEssentials: unknown, months = 3): number {
        return round2(Math.max(0, toNumber(monthlyEssentials)) * months);
    }

    /**
     * What stopping a policy early actually costs, from the figure the user was
     * quoted.
     *
     * The most useful calculation in the module. Someone with irregular income is
     * far more likely than average to have to stop paying, and the loss is
     * usually invisible until it happens.
     */
    earlyExit(annualPayment: unknown, stopAfterYear: unknown, surrenderValue: unknown): EarlyExit {
        const yearly = toNumber(annualPayment);
        const year = Math.trunc(toNumber(stopAfterYear));
        const surrender = toNumber(surrenderValue);
        if (year <= 0) throw new Error('stopAfterYear must be a positive whole number.');

        const paid = yearly * year;
        const loss = Math.max(0, paid - surrender);
        const pct = paid > 0 ? (loss / paid) * 100 : 0;
        const rs = (n: number) => `Rs ${Math.round(n).toLocaleString('en-IN')}`;

        let note: string;
        if (pct >= 60) {
            note =
                `Stopping after ${year} year(s) would lose most of what you paid. ` +
                `If there is any chance you cannot keep this up, that matters more than the ` +
                `returns you were shown.`;
        } else if (pct >= 25) {
            note = `Stopping after ${year} year(s) would cost you about ${rs(loss)} of what you paid in.`;
        } else if (pct > 0) {
            note = `Stopping after ${year} year(s) would cost about ${rs(loss)}.`;
        } else {
            note = `You would get back at least what you paid in after ${year} year(s).`;
        }

        return {
            year,
            paidInByThen: round2(paid),
            surrenderValue: round2(surrender),
            loss: round2(loss),
            lossPercent: Math.round(pct * 10) / 10,
            note,
        };
    }

    /**
     * Ordered roadmap for a life event.
     *
     * The order is the value: an emergency fund before an investment, protection
     * before growth. Each step protects the one after it.
     */
    roadmap(
        event: 'first_job' | 'marriage' | 'house',
        monthlyEssentials: unknown,
        stability: Stability,
    ): { title: string; bufferMonths: number; steps: RoadmapStep[] } {
        const essentials = toNumber(monthlyEssentials);
        const bufferMonths = stability === 'stable' ? 3 : 6;
        const fund = essentials > 0 ? this.emergencyFundTarget(essentials, bufferMonths) : null;
        const step = (order: number, title: string, why: string, targetAmount: number | null = null) => ({
            order,
            title,
            why,
            targetAmount,
        });

        if (event === 'first_job') {
            return {
                title: 'starting your first job',
                bufferMonths,
                steps: [
                    step(1, 'Work out what you must pay each month',
                        'Until you know your essential costs, every other number is a guess.'),
                    step(2, `Build ${bufferMonths} months of essentials in reachable savings`,
                        'This is what stops a bad month turning into a loan.', fund),
                    step(3, 'Check what deductions you are entitled to',
                        'Money you are already owed, requiring no change in habits.'),
                    step(4, 'Take life cover only if someone depends on your income',
                        'If nobody relies on your earnings yet, this can wait.'),
                    step(5, 'Start putting aside what is genuinely spare',
                        'Only after the buffer exists. Committing money you may need soon means pulling it out at the worst moment.'),
                ],
            };
        }

        if (event === 'marriage') {
            return {
                title: 'getting married',
                bufferMonths,
                steps: [
                    step(1, 'Agree what you each earn, owe and expect',
                        'Undisclosed debt is the most common financial shock in a new marriage.'),
                    step(2, 'Set the wedding budget as a fixed figure first',
                        'Costs expand to fill whatever number is left open.'),
                    step(3, `Keep the ${bufferMonths}-month buffer intact`,
                        'Spending the emergency fund on the wedding is the most common mistake here.', fund),
                    step(4, 'Update every nominee',
                        'Accounts still naming a parent cause long delays for a spouse later.'),
                    step(5, 'Review life cover now that someone depends on you',
                        'This is the point at which term cover starts to matter.'),
                ],
            };
        }

        return {
            title: 'buying a house',
            bufferMonths,
            steps: [
                step(1, 'Save the deposit without touching the emergency fund',
                    'You need both. A house with no buffer behind it is fragile.', fund),
                step(2, 'Test the instalment against your weakest month',
                    'A home loan payment does not shrink when income falls.'),
                step(3, 'Add registration, stamp duty and repairs to the budget',
                    'These are large, certain, and routinely left out.'),
                step(4, 'Check the total repayable, not just the interest rate',
                    'Fees frequently sit outside the advertised rate.'),
                step(5, 'Only then compare lenders',
                    'Comparing offers before knowing your safe limit invites you to borrow up to that limit.'),
            ],
        };
    }
}
