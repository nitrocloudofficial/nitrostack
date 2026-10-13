/**
 * Finly's MCP tools.
 *
 * The division of labour that makes this design work:
 *
 *   the host (ChatGPT)  holds the conversation, in whatever language the user
 *                       speaks, and decides which tool to call
 *   these tools         compute verified figures and render them as widgets
 *
 * So no language model is needed inside this server, and no figure a user sees
 * can be hallucinated. That is a stronger guarantee than any prompt.
 *
 * On regulated advice: notice there is no tool here that recommends a product.
 * Naming a specific fund or policy to buy is restricted to SEBI-registered
 * advisers in India, so the capability simply does not exist rather than being
 * offered and then refused. Every description says so explicitly, which is how
 * the host learns not to ask.
 */

import {
    ToolDecorator as Tool,
    Widget,
    ExecutionContext,
    Injectable,
    z,
} from '@nitrostack/core';

import { BEFORE_YOU_SIGN, GLOSSARY, findTerm } from './finly.data.js';
import { FinlyService, toPositiveNumbers } from './finly.service.js';

const DISCLAIMER =
    'Educational information only. This is not regulated financial advice.';

/**
 * Monthly income figures.
 *
 * Accepts an array of numbers, an array of numeric strings, or a single
 * comma-separated string. NitroStudio renders an array input as a text box and
 * sends "12000, 30000, 14000", and hosts vary in how strictly they type things.
 * Coercing here means a caller cannot silently produce a wrong answer — an array
 * of strings used to concatenate rather than add, giving an average of
 * 3000075000350007000 with no error at all.
 */
const IncomeSchema = z
    .preprocess(
        (value) => toPositiveNumbers(value),
        z.array(z.number().positive()).min(1).max(24),
    )
    .describe(
        'What the person earned in each of the last few months, as a list of numbers ' +
        'such as [14000, 22000, 16000]. Rough figures are fine. More months give a ' +
        'better reading, because the weakest month is what decides affordability.',
    );

/** Money in, coerced, so a numeric string does not become a string operation. */
const money = (description: string) =>
    z.preprocess(
        (v) => (typeof v === 'string' ? Number(v.replace(/[^0-9.]/g, '')) : v),
        z.number(),
    ).describe(description);

const AffordabilitySchema = z.object({
    monthlyAmount: money(
        'The monthly amount being considered — an instalment, premium or subscription.',
    ),
    monthlyIncomes: IncomeSchema,
    monthlyEssentials: money(
        'Must-pay costs each month: rent, food, travel, existing loan payments.',
    ),
});

const PositionSchema = z.object({
    monthlyIncomes: IncomeSchema,
    monthlyEssentials: money('Must-pay costs each month.'),
    savings: money('Money the person could reach today.'),
});

const ProductCostSchema = z.object({
    yearlyPayment: money('What the person would pay each year.'),
    stopAfterYear: money(
        'The year they might have to stop paying. 1, 3 and 5 are worth checking.',
    ),
    surrenderValueQuoted: money(
        'What the seller says they would get back if they stop then.',
    ),
});

const TermSchema = z.object({
    term: z.string().describe('The financial word to explain, for example "surrender value".'),
});

const RoadmapSchema = z.object({
    event: z
        .enum(['first_job', 'marriage', 'house'])
        .describe('The life change being planned for.'),
    monthlyEssentials: money('Must-pay costs each month.'),
    monthlyIncomes: IncomeSchema.optional().describe(
        'Optional. If given, an irregular income raises the recommended buffer from three ' +
        'months to six.',
    ),
});

@Injectable({ deps: [FinlyService] })
export class FinlyTools {
    constructor(private readonly finly: FinlyService) { }

    @Tool({
        name: 'check_affordability',
        description:
            'Check whether someone can afford a recurring monthly payment, judged against ' +
            'their WEAKEST recent month rather than their average. Use this for questions ' +
            'like "can I afford a Rs 5,000 EMI?" or "is this premium too much for me?". ' +
            'Returns a verdict, the calculation behind it, and the largest amount that would ' +
            'be safe. Does NOT recommend any product — only a SEBI-registered adviser may do ' +
            'that.',
        inputSchema: AffordabilitySchema,
        examples: {
            request: {
                monthlyAmount: 6000,
                monthlyIncomes: [14000, 22000, 16000, 19000],
                monthlyEssentials: 9000,
            },
            response: {
                verdict: 'not_affordable',
                monthlyAmount: 6000,
                weakMonth: 16000,
                averageMonth: 17750,
                safeMonthlyAmount: 5400,
                shortfall: 600,
                incomeStability: 'variable',
                reason:
                    'In a month like your weakest (Rs 16,000) you would be short by about ' +
                    'Rs 600. Your average month can cover it, but the weak months are the ' +
                    'ones that break a fixed payment.',
                disclaimer: DISCLAIMER,
            },
        },
    })
    @Widget('affordability')
    async checkAffordability(
        args: z.infer<typeof AffordabilitySchema>,
        ctx: ExecutionContext,
    ) {
        const pattern = this.finly.incomePattern(args.monthlyIncomes);
        const result = this.finly.canAfford(
            args.monthlyAmount,
            args.monthlyIncomes,
            args.monthlyEssentials,
        );

        ctx.logger.info('Affordability check', {
            verdict: result.verdict,
            weakMonth: pattern.weakMonth,
        });

        return {
            verdict: result.verdict,
            monthlyAmount: result.commitment,
            weakMonth: pattern.weakMonth,
            averageMonth: pattern.average,
            strongestMonth: pattern.strongestMonth,
            swing: pattern.swing,
            safeMonthlyAmount: result.safeCommitment,
            shortfall: result.shortfall,
            incomeStability: pattern.stability,
            monthsObserved: pattern.monthsObserved,
            essentials: args.monthlyEssentials,
            reason: result.reason,
            disclaimer: DISCLAIMER,
        };
    }

    @Tool({
        name: 'show_money_position',
        description:
            'Show how long someone could cover their essential costs if their income ' +
            'stopped, plus how much their income varies between good and bad months. Use for ' +
            '"how long would my money last?" or "how am I doing?". Reports runway in days, ' +
            'because days are easier to act on than a percentage.',
        inputSchema: PositionSchema,
        examples: {
            request: {
                monthlyIncomes: [14000, 22000, 16000, 19000],
                monthlyEssentials: 9000,
                savings: 12000,
            },
            response: {
                runwayDays: 40,
                weakMonth: 16000,
                averageMonth: 17750,
                strongestMonth: 22000,
                swing: 6000,
                incomeStability: 'variable',
                emergencyFundTarget: 54000,
                stillNeeded: 42000,
                bufferMonths: 6,
                disclaimer: DISCLAIMER,
            },
        },
    })
    @Widget('money-position')
    async showMoneyPosition(args: z.infer<typeof PositionSchema>, ctx: ExecutionContext) {
        const pattern = this.finly.incomePattern(args.monthlyIncomes);
        const runwayDays = this.finly.runwayDays(args.savings, args.monthlyEssentials);

        // Irregular income needs a deeper buffer: it absorbs variation as well as
        // interruption.
        const bufferMonths = pattern.stability === 'stable' ? 3 : 6;
        const target = this.finly.emergencyFundTarget(args.monthlyEssentials, bufferMonths);

        ctx.logger.info('Money position', { runwayDays, stability: pattern.stability });

        return {
            runwayDays,
            weakMonth: pattern.weakMonth,
            averageMonth: pattern.average,
            strongestMonth: pattern.strongestMonth,
            swing: pattern.swing,
            incomeStability: pattern.stability,
            monthsObserved: pattern.monthsObserved,
            savings: args.savings,
            essentials: args.monthlyEssentials,
            emergencyFundTarget: target,
            stillNeeded: Math.max(0, Math.round((target - args.savings) * 100) / 100),
            bufferMonths,
            safeMonthlyAmount: this.finly.safeCommitment(
                args.monthlyIncomes,
                args.monthlyEssentials,
            ),
            disclaimer: DISCLAIMER,
        };
    }

    @Tool({
        name: 'check_product_cost',
        description:
            'Work out what stopping an insurance or savings product early would cost, using ' +
            'the surrender value the seller quoted. This is the most useful question a buyer ' +
            'can ask and the one least often answered. Also returns the questions to ask ' +
            'before signing. Works only from figures the user supplies — it never looks up a ' +
            'product, and never claims to know what commission a product pays.',
        inputSchema: ProductCostSchema,
        examples: {
            request: { yearlyPayment: 50000, stopAfterYear: 3, surrenderValueQuoted: 40000 },
            response: {
                year: 3,
                paidInByThen: 150000,
                surrenderValue: 40000,
                loss: 110000,
                lossPercent: 73.3,
                note:
                    'Stopping after 3 year(s) would lose most of what you paid. If there is ' +
                    'any chance you cannot keep this up, that matters more than the returns ' +
                    'you were shown.',
                questionsBeforeSigning: BEFORE_YOU_SIGN,
                disclaimer: DISCLAIMER,
            },
        },
    })
    @Widget('product-cost')
    async checkProductCost(args: z.infer<typeof ProductCostSchema>, ctx: ExecutionContext) {
        const exit = this.finly.earlyExit(
            args.yearlyPayment,
            args.stopAfterYear,
            args.surrenderValueQuoted,
        );

        ctx.logger.info('Product cost check', {
            lossPercent: exit.lossPercent,
            year: args.stopAfterYear,
        });

        return {
            ...exit,
            yearlyPayment: args.yearlyPayment,
            questionsBeforeSigning: BEFORE_YOU_SIGN,
            disclaimer: DISCLAIMER,
        };
    }

    @Tool({
        name: 'explain_money_term',
        description:
            'Explain a financial word in plain language, with what commonly goes wrong for ' +
            'people around it. Use whenever a term appears that the user may not know — ' +
            'surrender value, EMI, compounding, lock-in period and so on. Returns the full ' +
            'list of available terms when the word is not recognised.',
        inputSchema: TermSchema,
        examples: {
            request: { term: 'surrender value' },
            response: {
                found: true,
                word: 'Surrender value',
                plain:
                    'What an insurance company pays you if you stop a policy before it finishes.',
                watchOut:
                    'In the early years this is often far less than you paid in, and can be ' +
                    'nothing at all. Ask for the figure in writing before signing.',
            },
        },
    })
    async explainMoneyTerm(args: z.infer<typeof TermSchema>, ctx: ExecutionContext) {
        const term = findTerm(args.term);

        if (!term) {
            ctx.logger.info('Unknown term requested', { term: args.term });
            return {
                found: false,
                requested: args.term,
                message: `No plain-language entry for "${args.term}".`,
                availableTerms: GLOSSARY.map((t) => t.word).sort(),
            };
        }

        return {
            found: true,
            word: term.word,
            plain: term.plain,
            watchOut: term.watchOut,
        };
    }

    @Tool({
        name: 'life_event_roadmap',
        description:
            'Build an ordered plan for a life change: starting a first job, getting married, ' +
            'or buying a house. The ORDER is the value — each step protects the one after ' +
            'it, so an emergency fund comes before an investment and protection before ' +
            'growth. If income figures are supplied, an irregular income raises the ' +
            'recommended buffer from three months to six.',
        inputSchema: RoadmapSchema,
        examples: {
            request: {
                event: 'first_job',
                monthlyEssentials: 9000,
                monthlyIncomes: [14000, 22000, 16000, 19000],
            },
            response: {
                event: 'first_job',
                title: 'starting your first job',
                bufferMonths: 6,
                incomeStability: 'variable',
                steps: [
                    {
                        order: 1,
                        title: 'Work out what you must pay each month',
                        why: 'Until you know your essential costs, every other number is a guess.',
                        targetAmount: null,
                    },
                    {
                        order: 2,
                        title: 'Build 6 months of essentials in reachable savings',
                        why: 'This is what stops a bad month turning into a loan.',
                        targetAmount: 54000,
                    },
                ],
                disclaimer: DISCLAIMER,
            },
        },
    })
    @Widget('roadmap')
    async lifeEventRoadmap(args: z.infer<typeof RoadmapSchema>, ctx: ExecutionContext) {
        let stability: 'stable' | 'variable' | 'highly_variable' = 'stable';
        if (args.monthlyIncomes && args.monthlyIncomes.length > 0) {
            stability = this.finly.incomePattern(args.monthlyIncomes).stability;
        }

        const plan = this.finly.roadmap(args.event, args.monthlyEssentials, stability);
        ctx.logger.info('Roadmap', { event: args.event, bufferMonths: plan.bufferMonths });

        return {
            event: args.event,
            title: plan.title,
            bufferMonths: plan.bufferMonths,
            incomeStability: stability,
            steps: plan.steps,
            disclaimer: DISCLAIMER,
        };
    }
}
