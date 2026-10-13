#!/usr/bin/env node
/**
 * FinBridge AI — hourly tool sweep
 *
 *   npm run sweep        # rebuild the server, then sweep
 *   npm run sweep:fast   # sweep the existing dist/
 *
 * Jeevan's job from +4:00, mechanised. Spawns the built server and drives it
 * through the OFFICIAL MCP client SDK — the same code path a real client uses,
 * so a green sweep means a real client will work too.
 *
 * Rule from CONTRIBUTING.md: two errors against one tool in a single sweep and
 * that tool is cut from the video. This counts them for you and writes a
 * timestamped log to sweeps/ so you have the history at 06:00.
 *
 * Exit 0 = all green. 1 = a check failed. 2 = could not run.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'url';
import * as path from 'path';
import * as fs from 'fs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(ROOT, 'dist', 'index.js');

if (!fs.existsSync(ENTRY)) {
  console.error(`✗ ${ENTRY} not found. Run "npm run build:server" first.`);
  process.exit(2);
}

const results = [];
const errorsByTarget = new Map();

async function check(target, label, fn) {
  try {
    const detail = await fn();
    results.push({ target, label, ok: true, detail: detail || '' });
    console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`);
  } catch (err) {
    errorsByTarget.set(target, (errorsByTarget.get(target) || 0) + 1);
    results.push({ target, label, ok: false, detail: err.message });
    console.log(`  ✗ ${label} — ${err.message}`);
  }
}

/** Every tool output must carry the BaseOutput guardrails. Non-negotiable. */
function assertGuardrails(out) {
  if (typeof out.risk_note !== 'string' || !out.risk_note.trim()) throw new Error('missing/empty risk_note');
  if (out.educational_only !== true) throw new Error('educational_only is not literal true');
}

function parseToolResult(res) {
  if (res.isError) throw new Error(`tool reported isError: ${JSON.stringify(res.content)}`);
  if (res.structuredContent) return res.structuredContent;
  const text = res.content?.find((c) => c.type === 'text')?.text;
  if (!text) throw new Error('no text content in tool result');
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`tool result is not JSON: ${text.slice(0, 120)}`);
  }
}

const TOOL_CALLS = [
  {
    name: 'check_scheme_eligibility',
    // Boundary case on purpose: a 10-year-old girl child, the SSY edge.
    args: { age: 10, monthlyIncome: 15000, gender: 'female', occupation: 'student', hasBankAccount: true, isTaxPayer: false },
    verify(out) {
      assertGuardrails(out);
      if (!Array.isArray(out.eligible) || !Array.isArray(out.ineligible)) throw new Error('eligible/ineligible must both be arrays');
      const total = out.eligible.length + out.ineligible.length;
      if (total !== 7) throw new Error(`evaluated ${total} schemes, expected all 7`);
      for (const item of out.ineligible) {
        if (!item.failedCondition) throw new Error(`ineligible ${item.schemeId} has no failedCondition`);
      }
      return `${out.eligible.length} eligible, ${out.ineligible.length} ineligible (all 7 evaluated)`;
    }
  },
  {
    name: 'project_investment_growth',
    args: { monthlyAmount: 5000, years: 10, fundCategory: 'equity' },
    verify(out) {
      assertGuardrails(out);
      if (typeof out.lowEstimate !== 'number' || typeof out.highEstimate !== 'number') throw new Error('estimates must be numbers');
      if (out.highEstimate < out.lowEstimate) throw new Error('highEstimate < lowEstimate');
      if (!out.assumptions?.length) throw new Error('assumptions array is empty');
      if (!out.navSource) throw new Error('navSource missing');
      return `${out.lowEstimate}–${out.highEstimate} via ${out.navSource}`;
    }
  },
  {
    name: 'calculate_financial_health',
    args: { monthlyIncome: 50000, monthlyExpenses: 30000, savings: 200000, monthlyDebtPayment: 8000, emergencyFundMonths: 6 },
    verify(out) {
      assertGuardrails(out);
      if (typeof out.score !== 'number') throw new Error('score must be a number');
      for (const k of ['savingsRate', 'emergencyFund', 'debtRatio']) {
        if (typeof out.subScores?.[k] !== 'number') throw new Error(`subScores.${k} missing`);
      }
      if (!out.suggestions?.length) throw new Error('suggestions array is empty');
      return `score ${out.score}`;
    }
  },
  {
    name: 'explain_financial_concept',
    args: { term: 'SIP' },
    verify(out) {
      assertGuardrails(out);
      if (!out.term || !out.explanation || !out.example) throw new Error('term/explanation/example incomplete');
      return `"${out.term}" explained`;
    }
  }
];

const RESOURCES = ['finbridge://schemes', 'finbridge://glossary'];
const PROMPTS = [
  { name: 'beginner_investor_advisor', args: {} },
  // scheme_navigator declares 'context' as required — supply it.
  { name: 'scheme_navigator', args: { context: '32-year-old salaried, no bank account yet' } }
];

const started = new Date();
console.log(`\nFinBridge sweep — ${started.toISOString()}\n`);

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [ENTRY],
  cwd: ROOT,
  env: { ...process.env, NODE_ENV: 'production', MCP_TRANSPORT_TYPE: 'stdio' }
});
const client = new Client({ name: 'finbridge-sweep', version: '1.0.0' }, { capabilities: {} });

try {
  await client.connect(transport);
} catch (err) {
  console.error(`✗ Could not connect to the server: ${err.message}`);
  process.exit(2);
}

console.log('Discovery');
const toolNames = (await client.listTools()).tools.map((t) => t.name);
const resourceUris = (await client.listResources()).resources.map((r) => r.uri);
const promptNames = (await client.listPrompts()).prompts.map((p) => p.name);

await check('discovery', '4 FinBridge tools discoverable', async () => {
  const missing = TOOL_CALLS.map((t) => t.name).filter((n) => !toolNames.includes(n));
  if (missing.length) throw new Error(`missing: ${missing.join(', ')}`);
  return TOOL_CALLS.map((t) => t.name).join(', ');
});
await check('discovery', '2 FinBridge resources discoverable', async () => {
  const missing = RESOURCES.filter((u) => !resourceUris.includes(u));
  if (missing.length) throw new Error(`missing: ${missing.join(', ')}`);
  return RESOURCES.join(', ');
});
await check('discovery', '2 prompts discoverable', async () => {
  const missing = PROMPTS.filter((p) => !promptNames.includes(p.name));
  if (missing.length) throw new Error(`missing: ${missing.map((p) => p.name).join(', ')}`);
  return PROMPTS.map((p) => p.name).join(', ');
});

console.log('\nTools');
for (const t of TOOL_CALLS) {
  await check(t.name, t.name, async () =>
    t.verify(parseToolResult(await client.callTool({ name: t.name, arguments: t.args })))
  );
}

console.log('\nResources');
for (const uri of RESOURCES) {
  await check(uri, uri, async () => {
    const res = await client.readResource({ uri });
    const text = res.contents?.[0]?.text;
    if (!text) throw new Error('no text content');
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('payload is not a non-empty array');
    return `${parsed.length} entries`;
  });
}

console.log('\nPrompts');
for (const { name, args } of PROMPTS) {
  await check(name, name, async () => {
    const res = await client.getPrompt({ name, arguments: args });
    if (!res.messages?.length) throw new Error('no messages returned');
    return `${res.messages.length} messages`;
  });
}

// ----------------------------------------------------------------- report
const failed = results.filter((r) => !r.ok);
const cut = [...errorsByTarget.entries()].filter(([, n]) => n >= 2);

console.log('\n' + '─'.repeat(58));
console.log(`${results.length - failed.length}/${results.length} checks passed`);
if (cut.length) {
  console.log('\n⚠ TWO OR MORE ERRORS — cut from the video per CONTRIBUTING.md:');
  for (const [target, n] of cut) console.log(`   ${target} (${n} errors)`);
}

const dir = path.join(ROOT, 'sweeps');
fs.mkdirSync(dir, { recursive: true });
const logFile = path.join(dir, `sweep-${started.toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(logFile, JSON.stringify({
  startedAt: started.toISOString(),
  passed: results.length - failed.length,
  total: results.length,
  cut: cut.map(([t, n]) => ({ target: t, errors: n })),
  results
}, null, 2));
console.log(`\nLog: ${path.relative(ROOT, logFile)}`);

await client.close();
process.exit(failed.length ? 1 : 0);
