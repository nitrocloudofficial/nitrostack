/**
 * Unit test for unwrapToolResult.
 *
 * Widget hosts disagree about how much of the MCP envelope a widget sees, and a
 * wrong guess makes the submission form render a blank success state instead of
 * the parsed claims. Since that cannot be exercised without a live host, the
 * normaliser is tested directly against every shape a host might send.
 *
 * Run with `npm run test:unwrap`.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import ts from 'typescript';

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(PROJECT, 'src/widgets/app/_shared/tool-result.ts');

// Transpile with the real compiler rather than stripping types by regex, so the
// test exercises the exact source the widget imports.
const { outputText } = ts.transpileModule(readFileSync(SRC, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});

const { unwrapToolResult } = await import(
  `data:text/javascript,${encodeURIComponent(outputText)}`
);

const PAYLOAD = {
  stored: true,
  reportId: 'rep-emp-1-2026-07-25',
  employee: { name: 'Aarav Menon' },
  claims: [{ text: 'Finished the login module', assertsCompletion: true }],
  blockers: ['Still blocked on staging credentials'],
  sentiment: 'neutral',
};

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// --- Shapes a host might hand us ---
check('bare payload passes through',
  same(unwrapToolResult(PAYLOAD), PAYLOAD));

check('MCP text content is parsed',
  same(unwrapToolResult({ content: [{ type: 'text', text: JSON.stringify(PAYLOAD) }] }), PAYLOAD));

check('structuredContent is unwrapped',
  same(unwrapToolResult({ structuredContent: PAYLOAD }), PAYLOAD));

check('{ result } is unwrapped',
  same(unwrapToolResult({ result: PAYLOAD }), PAYLOAD));

check('nested result + content is unwrapped',
  same(unwrapToolResult({ result: { content: [{ type: 'text', text: JSON.stringify(PAYLOAD) }] } }), PAYLOAD));

check('a JSON string is parsed',
  same(unwrapToolResult(JSON.stringify(PAYLOAD)), PAYLOAD));

check('content with a leading non-text part still resolves',
  same(unwrapToolResult({ content: [{ type: 'image' }, { type: 'text', text: JSON.stringify(PAYLOAD) }] }), PAYLOAD));

// --- Things that must NOT be mangled ---
const payloadWithDataField = { stored: true, data: { irrelevant: 1 }, claims: [] };
check('payload owning a "data" field is not unwrapped into it',
  same(unwrapToolResult(payloadWithDataField), payloadWithDataField));

const payloadWithResultField = { stored: true, result: 'ok', blockers: [] };
check('payload owning a "result" field is not unwrapped into it',
  same(unwrapToolResult(payloadWithResultField), payloadWithResultField));

// --- Failure modes must be null, not a throw ---
for (const [label, input] of [
  ['null', null],
  ['undefined', undefined],
  ['plain string', 'not json at all'],
  ['number', 42],
  ['malformed json string', '{ "stored": tru'],
]) {
  let ok = false;
  try { ok = unwrapToolResult(input) === null; } catch { ok = false; }
  check(`${label} returns null without throwing`, ok);
}

// A self-referencing envelope must not spin forever.
const cyclic = { result: {} };
cyclic.result.result = cyclic;
let cyclicOk = false;
try { unwrapToolResult(cyclic); cyclicOk = true; } catch { cyclicOk = false; }
check('cyclic envelope does not hang or throw', cyclicOk);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
