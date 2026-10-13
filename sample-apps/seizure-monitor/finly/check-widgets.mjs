/**
 * Contract test: does every tool return the fields its widget needs?
 *
 *     node check-widgets.mjs
 *
 * This is the gap that produced a screen of ₹NaN. verify.mjs proves the
 * arithmetic; this proves the handover. A tool can be perfectly correct and
 * still render as nothing if it names a field `weak_month` where the widget
 * reads `weakMonth`, and nothing else in the project would catch it.
 *
 * The REQUIRED lists below must match the ones in each widget's page.tsx.
 */

import { FinlyTools } from './dist/modules/finly/finly.tools.js';
import { FinlyService } from './dist/modules/finly/finly.service.js';

const tools = new FinlyTools(new FinlyService());

// The tools take an ExecutionContext only to log.
const ctx = { logger: { info: () => {}, warn: () => {}, error: () => {} } };

let checks = 0;
const failures = [];

function check(ok, message) {
    checks += 1;
    if (!ok) failures.push(message);
}

/** Every field a widget reads, and the ones it refuses to render without. */
const CONTRACTS = [
    {
        tool: 'check_affordability',
        widget: 'affordability',
        call: () =>
            tools.checkAffordability(
                {
                    monthlyAmount: 6000,
                    monthlyIncomes: [12000, 30000, 14000, 28000],
                    monthlyEssentials: 9000,
                },
                ctx,
            ),
        required: ['verdict', 'monthlyAmount', 'weakMonth'],
        numeric: ['monthlyAmount', 'weakMonth', 'averageMonth', 'safeMonthlyAmount', 'shortfall', 'swing'],
        expect: (r) => {
            check(r.verdict === 'not_affordable', `affordability: expected not_affordable, got ${r.verdict}`);
            check(r.weakMonth === 14000, `affordability: weakMonth should be 14000, got ${r.weakMonth}`);
            check(typeof r.reason === 'string' && r.reason.length > 0, 'affordability: reason must be present');
        },
    },
    {
        tool: 'show_money_position',
        widget: 'money-position',
        call: () =>
            tools.showMoneyPosition(
                {
                    monthlyIncomes: [14000, 22000, 16000, 19000],
                    monthlyEssentials: 9000,
                    savings: 12000,
                },
                ctx,
            ),
        required: ['runwayDays', 'weakMonth', 'emergencyFundTarget'],
        numeric: ['runwayDays', 'weakMonth', 'averageMonth', 'strongestMonth', 'swing', 'savings', 'emergencyFundTarget', 'stillNeeded', 'bufferMonths', 'safeMonthlyAmount'],
        expect: (r) => {
            check(r.runwayDays === 40, `money-position: runwayDays should be 40, got ${r.runwayDays}`);
            check(r.bufferMonths === 6, `money-position: variable income should give a 6-month buffer, got ${r.bufferMonths}`);
            check(r.emergencyFundTarget === 54000, `money-position: target should be 54000, got ${r.emergencyFundTarget}`);
        },
    },
    {
        tool: 'check_product_cost',
        widget: 'product-cost',
        call: () =>
            tools.checkProductCost(
                { yearlyPayment: 50000, stopAfterYear: 3, surrenderValueQuoted: 40000 },
                ctx,
            ),
        required: ['paidInByThen', 'surrenderValue', 'loss'],
        numeric: ['year', 'paidInByThen', 'surrenderValue', 'loss', 'lossPercent', 'yearlyPayment'],
        expect: (r) => {
            check(r.loss === 110000, `product-cost: loss should be 110000, got ${r.loss}`);
            check(r.lossPercent > 60, `product-cost: lossPercent should exceed 60, got ${r.lossPercent}`);
            check(Array.isArray(r.questionsBeforeSigning) && r.questionsBeforeSigning.length > 0,
                'product-cost: questionsBeforeSigning must be a non-empty array');
        },
    },
    {
        tool: 'life_event_roadmap',
        widget: 'roadmap',
        call: () =>
            tools.lifeEventRoadmap(
                {
                    event: 'first_job',
                    monthlyEssentials: 9000,
                    monthlyIncomes: [14000, 22000, 16000, 19000],
                },
                ctx,
            ),
        required: ['title', 'steps'],
        numeric: ['bufferMonths'],
        expect: (r) => {
            check(Array.isArray(r.steps) && r.steps.length === 5, `roadmap: expected 5 steps, got ${r.steps?.length}`);
            check(r.steps.every((s) => s.title && s.why), 'roadmap: every step needs a title and a reason');
            check(r.steps.every((s) => Number.isFinite(s.order)), 'roadmap: every step needs a numeric order');
            check(r.bufferMonths === 6, `roadmap: variable income should give 6 months, got ${r.bufferMonths}`);
        },
    },
    {
        tool: 'explain_money_term',
        widget: null,
        call: () => tools.explainMoneyTerm({ term: 'surrender value' }, ctx),
        required: ['found', 'word', 'plain'],
        numeric: [],
        expect: (r) => {
            check(r.found === true, 'explain: should find "surrender value"');
            check(/surrender/i.test(r.word), `explain: unexpected word ${r.word}`);
            check(typeof r.watchOut === 'string' && r.watchOut.length > 0, 'explain: watchOut must be present');
        },
    },
];

console.log('=== tool output against widget contract ===\n');

for (const c of CONTRACTS) {
    let result;
    try {
        result = await c.call();
    } catch (e) {
        failures.push(`${c.tool}: threw ${e.constructor.name}: ${e.message}`);
        console.log(`  FAIL  ${c.tool} — threw`);
        continue;
    }

    const missing = c.required.filter((f) => result[f] === undefined || result[f] === null);
    check(missing.length === 0, `${c.tool}: widget "${c.widget}" needs ${missing.join(', ')} but the tool did not return them`);

    // A field that is present but not a finite number renders as NaN.
    const notNumbers = c.numeric.filter(
        (f) => result[f] !== undefined && !Number.isFinite(Number(result[f])),
    );
    check(notNumbers.length === 0, `${c.tool}: these are present but not finite numbers, so would render as NaN: ${notNumbers.join(', ')}`);

    c.expect(result);
    check(typeof result.disclaimer === 'string' || c.widget === null,
        `${c.tool}: every user-facing result should carry a disclaimer`);

    const status = missing.length === 0 && notNumbers.length === 0 ? 'ok  ' : 'FAIL';
    console.log(`  ${status}  ${c.tool.padEnd(22)} -> ${c.widget ?? '(no widget)'}`);
    console.log(`        ${c.required.map((f) => `${f}=${JSON.stringify(result[f])}`).join('  ').slice(0, 110)}`);
}

console.log();
if (failures.length > 0) {
    console.log(`FAILED — ${failures.length} of ${checks} checks\n`);
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
}
console.log(`check-widgets: ${checks} checks passed — every tool returns what its widget reads`);
process.exit(0);
