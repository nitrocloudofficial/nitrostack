/**
 * Verify the ported arithmetic against the Python originals.
 *
 *     cd mcp/server && npm run build && node verify.mjs
 *
 * The TypeScript service in finly.service.ts is a port of mcp/tools/*.py, and two
 * copies of the same maths drift unless something checks. These are the same
 * cases the Python self-checks use, with the same expected answers — including
 * the weak-month rule, which is the one that matters most.
 */

import { FinlyService } from './dist/modules/finly/finly.service.js';

const finly = new FinlyService();
let checks = 0;
const failures = [];

function check(condition, message) {
    checks += 1;
    if (!condition) failures.push(message);
}

function near(a, b, tolerance = 1) {
    return Math.abs(a - b) <= tolerance;
}

/* ------------------------------------------------ income pattern */

const steady = finly.incomePattern([50000, 50000, 50000, 50000]);
check(steady.stability === 'stable', `steady income should be stable, got ${steady.stability}`);
check(steady.weakMonth === 50000, `steady weak month should be 50000, got ${steady.weakMonth}`);

const gig = finly.incomePattern([14000, 22000, 16000, 19000, 12000, 21000]);
check(gig.weakMonth === 14000, `gig weak month should be 14000 (second lowest), got ${gig.weakMonth}`);
check(near(gig.average, 17333, 1), `gig average should be ~17333, got ${gig.average}`);
check(gig.strongestMonth === 22000, `strongest should be 22000, got ${gig.strongestMonth}`);
check(gig.swing === 8000, `swing should be 8000, got ${gig.swing}`);

// Short history uses the true minimum, not the second lowest.
const short = finly.incomePattern([20000, 12000, 18000]);
check(short.weakMonth === 12000, `3 months should use true minimum, got ${short.weakMonth}`);

// Variation is scale-free: same shape at 10x should score the same.
const small = finly.incomePattern([14000, 22000, 16000, 19000]);
const large = finly.incomePattern([140000, 220000, 160000, 190000]);
check(
    Math.abs(small.variation - large.variation) < 1e-6,
    `variation must be scale-free: ${small.variation} vs ${large.variation}`,
);

// The pinned thresholds. Changing these changes who gets warned.
check(finly.incomePattern([100, 100, 100, 100]).stability === 'stable', 'flat -> stable');
check(finly.incomePattern([90, 100, 110, 120]).stability === 'variable', '~0.13 -> variable');
check(
    finly.incomePattern([60, 100, 120, 140]).stability === 'highly_variable',
    '~0.30 -> highly_variable',
);

/* ------------------------------------------------------- runway */

check(finly.runwayDays(18000, 9000) === 60, 'runway: 18000 against 9000/month should be 60 days');
check(finly.runwayDays(50000, 0) === 0, 'no essentials means 0, not infinity');
check(finly.runwayDays(-500, 9000) === 0, 'negative funds must not give negative days');

/* ------------------------------------------- the core rule */

// The average can carry this. A weak month cannot. It must be refused.
const volatile = [12000, 30000, 14000, 28000];
const refused = finly.canAfford(6000, volatile, 9000);
check(
    refused.verdict === 'not_affordable',
    `average covers it but weak month does not -> not_affordable, got ${refused.verdict}`,
);
check(refused.shortfall > 0, 'a refused commitment must report a shortfall');
check(
    finly.incomePattern(volatile).average > 20000,
    'the volatile fixture must have an average above 20000 for this test to mean anything',
);

// The app must be able to say yes.
const yes = finly.canAfford(500, [18000, 20000, 19000, 21000], 9000);
check(yes.verdict === 'affordable', `small commitment should be affordable, got ${yes.verdict}`);
check(yes.shortfall === 0, 'an affordable commitment has no shortfall');

// Tight sits between the two.
const tight = finly.canAfford(10000, [20000, 22000, 21000, 23000], 9000);
check(tight.verdict === 'tight', `expected tight, got ${tight.verdict}`);

// A larger buffer must be stricter.
const generous = finly.canAfford(10500, [20000, 20000, 20000, 20000], 9000, 0);
const cautious = finly.canAfford(10500, [20000, 20000, 20000, 20000], 9000, 0.2);
check(generous.verdict === 'affordable', 'zero buffer should allow 10500');
check(cautious.verdict !== 'affordable', 'a 20% buffer should not allow 10500');

// Every verdict explains itself.
for (const amount of [100, 10000, 99999]) {
    const r = finly.canAfford(amount, [18000, 20000, 19000, 21000], 9000);
    check(r.reason.trim().length > 0, `reason must never be empty (amount ${amount})`);
}

/* ------------------------------------------------- early exit */

const exit3 = finly.earlyExit(50000, 3, 40000);
check(exit3.paidInByThen === 150000, `paid in should be 150000, got ${exit3.paidInByThen}`);
check(exit3.loss === 110000, `loss should be 110000, got ${exit3.loss}`);
check(exit3.lossPercent > 60, `loss percent should exceed 60, got ${exit3.lossPercent}`);
check(exit3.note.includes('most of what you paid'), 'a heavy loss must say so plainly');

const noLoss = finly.earlyExit(50000, 5, 300000);
check(noLoss.loss === 0, 'getting back more than paid in is not a loss');

/* --------------------------------------------- emergency fund */

check(finly.emergencyFundTarget(9000) === 27000, 'default buffer is 3 months');
check(finly.emergencyFundTarget(9000, 6) === 54000, 'irregular income gets 6 months');

/* -------------------------------------------------- roadmaps */

for (const event of ['first_job', 'marriage', 'house']) {
    const plan = finly.roadmap(event, 9000, 'variable');
    check(plan.steps.length === 5, `${event} should have 5 steps, got ${plan.steps.length}`);
    check(plan.bufferMonths === 6, `${event} on variable income should use a 6-month buffer`);
    check(
        plan.steps.every((s) => s.title && s.why),
        `${event}: every step needs a title and a reason`,
    );
    check(
        plan.steps.map((s) => s.order).join(',') === '1,2,3,4,5',
        `${event}: steps must be ordered 1..5`,
    );
}
check(
    finly.roadmap('first_job', 9000, 'stable').bufferMonths === 3,
    'stable income uses the usual 3-month buffer',
);

/* ------------------------------------------------ bad input */

try {
    finly.incomePattern([]);
    failures.push('empty income should throw');
} catch {
    checks += 1;
}
try {
    finly.incomePattern([0, 0]);
    failures.push('all-zero income should throw');
} catch {
    checks += 1;
}

/* -------------------------------------- loosely typed input
 *
 * Callers are not all well behaved. NitroStudio renders an array input as a
 * text box and sends "12000, 30000, 14000" as a string; a host may send
 * ["12000", "30000"] as strings.
 *
 * The string case used to throw "filter is not a function". The array-of-strings
 * case was worse: it did not throw, it concatenated, and the average came back
 * as 3000075000350007000. A wrong number that looks like a number is the failure
 * mode worth guarding hardest against. */

const expected = finly.incomePattern([12000, 30000, 14000, 28000]);

const looseForms = [
    ['array of numeric strings', ['12000', '30000', '14000', '28000']],
    ['comma separated string', '12000, 30000, 14000, 28000'],
    ['space separated string', '12000 30000 14000 28000'],
    // The comma is both a separator and a digit group marker in India, so
    // "12,000" must not become 12 and 000. This case caught exactly that.
    ['thousands separators and currency marks', '₹12,000 ₹30,000 ₹14,000 ₹28,000'],
    ['thousands separators, comma delimited', '12,000, 30,000, 14,000, 28,000'],
];

for (const [label, input] of looseForms) {
    try {
        const got = finly.incomePattern(input);
        check(
            got.weakMonth === expected.weakMonth,
            `${label}: weakMonth ${got.weakMonth} should equal ${expected.weakMonth}`,
        );
        check(
            got.average === expected.average,
            `${label}: average ${got.average} should equal ${expected.average} — a string ` +
            `average means concatenation, not addition`,
        );
    } catch (e) {
        failures.push(`${label} threw: ${e.message}`);
    }
}

// A single number is a legitimate one-month history.
check(finly.incomePattern(15000).weakMonth === 15000, 'a lone number should be one month');

// Money arguments coerce too.
check(
    finly.canAfford('6000', [12000, 30000, 14000, 28000], '9000').verdict === 'not_affordable',
    'string money arguments must give the same verdict as numbers',
);
check(finly.runwayDays('18000', '9000') === 60, 'runwayDays must accept numeric strings');
check(
    finly.earlyExit('50000', '3', '40000').loss === 110000,
    'earlyExit must accept numeric strings',
);

/* ---------------------------------------------------- report */

if (failures.length > 0) {
    console.error(`verify: FAILED - ${failures.length} of ${checks} checks\n`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
}

console.log(`verify: ${checks} checks passed`);
console.log(`  gig weak month Rs ${gig.weakMonth} vs average Rs ${gig.average}`);
console.log(`  volatile-income check -> ${refused.verdict}`);
console.log(`    ${refused.reason}`);

// Explicit, because importing from the built bundle leaves a handle open and the
// process would otherwise sit there — which would hang a CI job.
process.exit(0);
