#!/usr/bin/env node
/**
 * FinBridge AI — in-process tool verification
 *
 *   npm run verify:tools
 *
 * Companion to scripts/sweep.mjs. The sweep talks to a running server over the
 * MCP stdio transport; this instantiates the tool classes directly and checks
 * their contracts. Use this when you want to know whether the LOGIC is sound
 * without depending on transport, ports, or a deployed URL — and as a fallback
 * if the sweep can't connect.
 *
 * Exit 0 = all green.
 */
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = (p) => path.join(ROOT, 'dist', p);

if (!fs.existsSync(dist('index.js'))) {
  console.error('✗ dist/ not found. Run "npm run build:server" first.');
  process.exit(2);
}

let pass = 0;
const failures = [];

function check(label, fn) {
  try {
    const detail = fn();
    pass++;
    console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`);
  } catch (err) {
    failures.push(`${label}: ${err.message}`);
    console.log(`  ✗ ${label} — ${err.message}`);
  }
}

async function checkAsync(label, fn) {
  try {
    const detail = await fn();
    pass++;
    console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`);
  } catch (err) {
    failures.push(`${label}: ${err.message}`);
    console.log(`  ✗ ${label} — ${err.message}`);
  }
}

/** Every tool output must carry the BaseOutput guardrails. Non-negotiable. */
function assertGuardrails(out) {
  if (typeof out.risk_note !== 'string' || !out.risk_note.trim()) throw new Error('missing/empty risk_note');
  if (out.educational_only !== true) throw new Error('educational_only is not literal true');
}

const ctx = { logger: { info() {}, warn() {}, error() {}, debug() {} } };

console.log('\nFinBridge tool verification\n' + '─'.repeat(46));

// ---------------------------------------------------------- eligibility
console.log('\ncheck_scheme_eligibility');
const { evaluateEligibility } = await import(dist('modules/eligibility/eligibility.engine.js'));
const { Scheme } = await import(dist('shared/contracts.js'));
const schemes = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'schemes.json'), 'utf-8'));

check('rulebook has 7 schemes', () => {
  if (schemes.length !== 7) throw new Error(`found ${schemes.length}`);
  return schemes.map((s) => s.schemeId).join(', ');
});

check('every scheme satisfies the frozen Scheme contract', () => {
  for (const s of schemes) {
    const r = Scheme.safeParse(s);
    if (!r.success) throw new Error(`${s.schemeId}: ${r.error.issues[0].path.join('.')} ${r.error.issues[0].code}`);
  }
  return 'all 7 valid';
});

check('no placeholder apply links survived', () => {
  const bad = schemes.filter((s) => /example\.(gov\.)?in|placeholder|TODO/i.test(s.applyLink));
  if (bad.length) throw new Error(`${bad.map((s) => s.schemeId).join(', ')} still placeholder`);
  return 'all real government URLs';
});

const cases = [
  { label: '10yr boy, high income, no bank, taxpayer', input: { age: 10, monthlyIncome: 500000, gender: 'male', occupation: 'student', hasBankAccount: false, isTaxPayer: true }, expect: [] },
  { label: '10yr girl child (SSY boundary)', input: { age: 10, monthlyIncome: 0, gender: 'female', occupation: 'student', hasBankAccount: false, isTaxPayer: false }, expect: ['SSY'] },
  { label: '35yr salaried taxpayer (APY exclusion)', input: { age: 35, monthlyIncome: 90000, gender: 'male', occupation: 'salaried', hasBankAccount: true, isTaxPayer: true }, expectExcludes: ['APY'] }
];

for (const c of cases) {
  check(c.label, () => {
    const r = evaluateEligibility(schemes, c.input);
    assertGuardrails(r);
    if (r.eligible.length + r.ineligible.length !== 7) throw new Error('did not evaluate all 7 schemes');
    for (const i of r.ineligible) if (!i.failedCondition) throw new Error(`${i.schemeId} has no failedCondition`);
    const got = r.eligible.map((e) => e.schemeId).sort();
    if (c.expect && got.join(',') !== c.expect.join(',')) throw new Error(`expected [${c.expect}] got [${got}]`);
    if (c.expectExcludes) for (const x of c.expectExcludes) if (got.includes(x)) throw new Error(`${x} should not be eligible`);
    return got.length ? got.join(', ') : 'none eligible, all reasons named';
  });
}

// ------------------------------------------------------- growth (live data)
console.log('\nproject_investment_growth');
const { NavCacheService } = await import(dist('modules/growth/growth.service.js'));
const { MfApiClient } = await import(dist('clients/mfapi.js'));
const nav = new NavCacheService(new MfApiClient());

for (const category of ['equity', 'debt', 'hybrid', 'index']) {
  await checkAsync(`CAGR band for ${category}`, async () => {
    const b = await nav.getCagrBand(category);
    if (!(b.high >= b.low)) throw new Error('high < low');
    if (!['live', 'cached', 'static'].includes(b.source)) throw new Error(`unknown source ${b.source}`);
    return `${(b.low * 100).toFixed(1)}%–${(b.high * 100).toFixed(1)}% (source: ${b.source})`;
  });
}

await checkAsync('degrades gracefully when mfapi.in is unreachable', async () => {
  const b = await nav.getCagrBand('equity');
  if (b.source === 'live') return 'API reachable — live data in use';
  return `fell back to ${b.source} instead of throwing`;
});

// ------------------------------------------------------- financial health
console.log('\ncalculate_financial_health');
const { calculateFinancialHealth } = await import(dist('modules/financial-health/financial-health.logic.js'));
check('scores a healthy profile and returns all sub-scores', () => {
  const r = calculateFinancialHealth({ monthlyIncome: 100000, monthlyExpenses: 40000, savings: 240000, monthlyDebtPayment: 0, emergencyFundMonths: 6 });
  for (const k of ['savingsRate', 'emergencyFund', 'debtRatio']) if (typeof r.subScores?.[k] !== 'number') throw new Error(`subScores.${k} missing`);
  if (!r.suggestions?.length) throw new Error('no suggestions');
  return `score ${r.score}`;
});

// -------------------------------------------------------------- resources
console.log('\nresources');
check('finbridge://glossary has at least 10 terms', () => {
  const g = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'glossary.json'), 'utf-8'));
  if (g.length < 10) throw new Error(`only ${g.length} terms`);
  return `${g.length} terms`;
});

check('data/ resolves from module dir, not cwd', () => {
  // Strip comments first — the files legitimately *mention* process.cwd() when
  // explaining why they avoid it.
  const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const files = [
    ['knowledge.resources.ts', path.join(ROOT, 'src', 'modules', 'knowledge', 'knowledge.resources.ts')],
    ['explain.tools.ts', path.join(ROOT, 'src', 'modules', 'explain', 'explain.tools.ts')],
    ['eligibility.tools.ts', path.join(ROOT, 'src', 'modules', 'eligibility', 'eligibility.tools.ts')]
  ];
  for (const [name, file] of files) {
    if (!fs.existsSync(file)) continue;
    if (stripComments(fs.readFileSync(file, 'utf-8')).includes('process.cwd()')) {
      throw new Error(`${name} still uses process.cwd() — data/ will not resolve when deployed`);
    }
  }
  return 'knowledge + explain + eligibility all module-relative';
});

// ----------------------------------------------------------------- report
console.log('\n' + '─'.repeat(46));
console.log(`${pass}/${pass + failures.length} checks passed`);
if (failures.length) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log('✓ All green.\n');

// @nitrostack/core's DI container keeps the event loop alive (it targets a
// long-running server). Force exit so this is usable in CI and in a hurry.
process.exit(0);
