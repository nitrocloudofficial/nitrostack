import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { findInstalls, parseCommand, decide } from '../guard/parse-command.mjs';

const request = (manager: string, name: string, spec?: string, raw = `${name}${spec ? `@${spec}` : ''}`) =>
  ({ manager, name, ...(spec ? { spec } : {}), raw });

for (const [command, expected] of [
  ['npm i axios@1.14.1', [request('npm', 'axios', '1.14.1')]],
  ['npm install -D vitest typescript', [request('npm', 'vitest'), request('npm', 'typescript')]],
  ['pnpm add @ctrl/tinycolor@^4', [request('pnpm', '@ctrl/tinycolor', '^4')]],
  ['yarn add lodash', [request('yarn', 'lodash')]],
  ['bun add zod', [request('bun', 'zod')]],
  ['npx -y create-vite@5 app', [request('npx', 'create-vite', '5')]],
  ['npm exec --package=foo -- bar', [request('npx', 'foo')]],
  ['cd web && npm i react', [request('npm', 'react')]],
  ['FOO=1 npm i x', [request('npm', 'x')]],
  ['npm i -p evil-pkg', [request('npm', 'evil-pkg')]],
  ['env npm i x', [request('npm', 'x')]],
  ['env VAR=x npm i x', [request('npm', 'x')]],
  ['/usr/bin/npm i x', [request('npm', 'x')]],
  ['./node_modules/.bin/pnpm add x', [request('pnpm', 'x')]],
  ['npm.cmd i x', [request('npm', 'x')]],
  ['sudo npm i x', [request('npm', 'x')]],
  ['command npm i x', [request('npm', 'x')]],
  ['(cd web && npm i x)', [request('npm', 'x')]],
  ['bash -c "npm i x"', [request('npm', 'x')]],
  ["sh -c 'npm i x'", [request('npm', 'x')]],
  ['corepack pnpm add x', [request('pnpm', 'x')]],
  ['corepack yarn add x', [request('yarn', 'x')]],
  ['corepack npm i x', [request('npm', 'x')]],
  ['yarn global add x', [request('yarn', 'x')]],
  ['npm it x', [request('npm', 'x')]],
  ['npm i ./local ../x git+https://x/y.git user/repo file:z http://x/y.tgz', []],
  ['npm i alias@npm:real@1.2.3', [request('npm', 'real', '1.2.3', 'alias@npm:real@1.2.3')]],
  ['npm ci', []],
  ['npm install', []],
  ['echo npm i axios', []],
  ['npm i a && pnpm add b; yarn add c', [request('npm', 'a'), request('pnpm', 'b'), request('yarn', 'c')]],
  ['npm i "react@latest" \'@types/node\' "x@>=1 <2"', [request('npm', 'react', 'latest'), request('npm', '@types/node'), request('npm', 'x', '>=1 <2')]],
] as const) {
  test(`findInstalls: ${command}`, () => assert.deepEqual(findInstalls(command), expected));
}

test('all npm install aliases and case-insensitive verbs', () => {
  for (const verb of ['install', 'install-test', 'it', 'i', 'add', 'in', 'ins', 'inst', 'insta', 'instal', 'isnt', 'isnta', 'isntal', 'isntall']) {
    assert.deepEqual(findInstalls(`npm ${verb.toUpperCase()} x`), [request('npm', 'x')]);
  }
});

test('pnpm and bun accept install and i with explicit packages', () => {
  for (const manager of ['pnpm', 'bun']) {
    for (const verb of ['install', 'i']) {
      assert.deepEqual(findInstalls(`${manager} ${verb} x`), [request(manager, 'x')]);
      assert.deepEqual(findInstalls(`${manager} ${verb}`), []);
    }
  }
});

test('runner forms check only the package, or explicitly specified packages', () => {
  for (const [command, manager] of [
    ['npm x foo arg', 'npx'], ['npm exec foo arg', 'npx'],
    ['pnpm dlx foo arg', 'pnpm dlx'], ['yarn dlx foo arg', 'yarn dlx'], ['bunx foo arg', 'bunx'],
  ]) assert.deepEqual(findInstalls(command), [request(manager, 'foo')]);
  assert.deepEqual(findInstalls('npx --package foo --package=@scope/bar@2 program --package=ignored'),
    [request('npx', 'foo'), request('npx', '@scope/bar', '2')]);
  assert.deepEqual(findInstalls('npm exec -p foo -- bar'), [request('npx', 'foo')]);
  assert.deepEqual(findInstalls('npx -- foo arg'), [request('npx', 'foo')]);
  assert.deepEqual(findInstalls('npx foo --package=argument'), [request('npx', 'foo')]);
});

test('leading flags, environment assignments, sudo, and flag values are skipped', () => {
  assert.deepEqual(findInstalls('FOO="some value" sudo -u root BAR=2 npm --prefix web i --registry https://example.test --tag next -w app --workspace other -D --save-dev --registry=x -g react'),
    [request('npm', 'react')]);
});

test('value-taking flags are specific to each package manager', () => {
  for (const command of ['npm i -p evil-pkg', 'npm -p i evil-pkg', 'npm i --parseable evil-pkg',
    'pnpm --filter web -C web add --registry https://example.test --tag next evil-pkg',
    'yarn --cwd web add --registry https://example.test --tag next evil-pkg',
    'bun --cwd web add --filter web --registry https://example.test --tag next evil-pkg']) {
    assert.equal(findInstalls(command).at(-1)?.name, 'evil-pkg', command);
    assert.equal(findInstalls(command).length, 1, command);
  }
});

test('unsupported install wrappers, malformed shell and recursion limits preserve uncertainty', () => {
  for (const command of ['timeout 10 npm i x', 'bash script.sh npm i x', 'npm i "x', 'npm i file:../x',
    'echo "npm i x" | sh',
    'bash -c ' + JSON.stringify('sh -c ' + JSON.stringify('bash -c ' + JSON.stringify('sh -c ' + JSON.stringify('bash -c "npm i x"'))))]) {
    assert.equal(parseCommand(command).uncertain, true, command);
  }
  assert.equal(parseCommand('echo "npm i x"').uncertain, false);
});

test('paths, URLs, shorthands, named non-registry versions and tarballs are ignored', () => {
  assert.deepEqual(findInstalls('npm i /x ~/x C:\\x link:x git:x github:user/repo https://x/y a.tgz @scope/pkg@file:../x foo@github:user/repo foo@user/repo'), []);
  assert.deepEqual(findInstalls('npm i @scope/alias@npm:@real/pkg@^2'),
    [request('npm', '@real/pkg', '^2', '@scope/alias@npm:@real/pkg@^2')]);
});

test('pipes, OR and newlines separate commands; quoted separators do not', () => {
  assert.deepEqual(findInstalls('npm i a || pnpm add b | yarn add c\nbun add d'),
    [request('npm', 'a'), request('pnpm', 'b'), request('yarn', 'c'), request('bun', 'd')]);
  assert.deepEqual(findInstalls('echo "npm i nope && npm i nope2"; npm i "x@>=1 || <2"'), [request('npm', 'x', '>=1 || <2')]);
  assert.deepEqual(findInstalls('npm i a # npm i nope\nnpm i b'), [request('npm', 'a'), request('npm', 'b')]);
  assert.deepEqual(findInstalls('npm i \\\nreact'), [request('npm', 'react')]);
});

const report = (verdict: 'ALLOW' | 'REVIEW' | 'BLOCK', name = 'axios') => ({
  package: name, version: '1.14.1', verdict, summary: 'Release summary',
  findings: [{ severity: 'high', title: 'First finding' }, { severity: 'medium', title: 'Second finding' }, { severity: 'low', title: 'Third finding' }],
});

test('BLOCK wins over REVIEW and includes two findings and a safe version', () => {
  const result = decide([report('REVIEW', 'other'), { ...report('BLOCK'), safeVersion: { version: '1.14.0', reason: 'Trusted release' } }]);
  assert.equal(result.decision, 'deny');
  assert.match(result.reason, /Dep Bouncer BLOCK axios@1\.14\.1: First finding; Second finding\./);
  assert.match(result.reason, /Install axios@1\.14\.0 instead\./);
  assert.doesNotMatch(result.reason, /Third finding/);
});

test('REVIEW asks with the top finding', () => {
  const result = decide([report('ALLOW'), report('REVIEW', 'other')]);
  assert.equal(result.decision, 'ask');
  assert.match(result.reason, /Dep Bouncer REVIEW other@1\.14\.1: First finding\. Ask the user before installing\./);
});

test('all ALLOW and empty reports allow, with summary fallback', () => {
  assert.equal(decide([report('ALLOW')]).decision, 'allow');
  assert.deepEqual(decide([]), { decision: 'allow', reason: '' });
  assert.match(decide([{ ...report('ALLOW'), findings: [] }]).reason, /Release summary/);
});

// Run the I/O script in an isolated context: no subprocesses or network required.
const hookSource = readFileSync(new URL('../guard/dep-bouncer-guard.mjs', import.meta.url), 'utf8')
  .replace(/^#!.*\r?\n/, '').replace("import { parseCommand, decide } from './parse-command.mjs';", '');
async function runHook(payload: unknown, options: { cursor?: boolean; closed?: boolean; mode?: string; key?: string; rawInput?: string } = {}) {
  let stdout = '', stderr = '';
  const calls: { name: string; version?: string }[] = [];
  const mockFetch: typeof fetch = async (url, init) => {
    assert.equal(url, 'https://offline.invalid/mcp');
    assert.equal(init?.method, 'POST');
    const headers = new Headers(init?.headers);
    assert.equal(headers.get('mcp-protocol-version'), '2025-06-18');
    assert.equal(headers.get('content-type'), 'application/json');
    assert.match(headers.get('accept')!, /text\/event-stream/);
    assert.equal(headers.get('x-api-key'), options.key ?? null);
    assert.ok(init?.signal);
    const rpc = JSON.parse(String(init?.body));
    assert.equal(rpc.method, 'tools/call');
    assert.equal(rpc.params.name, 'bouncer_check_package');
    assert.equal(rpc.params._meta?.apiKey, options.key);
    const { name, version } = rpc.params.arguments;
    calls.push(rpc.params.arguments);
    const mode = options.mode;
    if (mode === 'unavailable' || name === 'offline') throw Error('offline fixture');
    if (mode === 'http') return new Response('', { status: 503 });
    if (mode === '401' || mode === '403') return new Response('', { status: Number(mode) });
    const result = mode === 'tool-error' ? { isError: true, content: [{ text: 'tool fixture error' }] }
      : { content: [{ text: JSON.stringify({ package: name, version: version || 'latest',
        verdict: name === 'blocked' ? 'BLOCK' : name === 'review' ? 'REVIEW' : 'ALLOW',
        findings: [], summary: 'Fixture report' }) }] };
    const message = JSON.stringify({ jsonrpc: '2.0', id: rpc.id, result });
    return new Response(mode === 'bad' ? 'invalid' : mode === 'sse'
      ? 'event: message\r\ndata: {"method":"notification"}\r\n\r\nevent: message\r\ndata: ' + message + '\r\n\r\n' : message);
  };
  await runInNewContext(`(async () => { ${hookSource} })()`, {
    parseCommand, decide, AbortSignal, fetch: mockFetch,
    setTimeout: (callback: () => void) => { callback(); return 0; },
    process: {
      stdin: Readable.from([options.rawInput ?? JSON.stringify(payload)]),
      argv: ['node', 'guard.mjs', ...(options.cursor ? ['--cursor'] : [])],
      env: { DEP_BOUNCER_URL: 'https://offline.invalid/mcp', DEP_BOUNCER_FAIL_CLOSED: options.closed ? '1' : '0', DEP_BOUNCER_API_KEY: options.key },
      stdout: { write: (chunk: string) => { stdout += chunk; } },
      stderr: { write: (chunk: string) => { stderr += chunk; } },
    },
  });
  return { stdout, stderr, result: stdout ? JSON.parse(stdout) : undefined, calls };
}

const bash = (command: string) => ({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command } });

test('hook ignores other tools and emits the correct no-install output', async () => {
  assert.equal((await runHook({ tool_name: 'Read', tool_input: { command: 'npm i x' } })).stdout, '');
  assert.equal((await runHook(bash('echo hello'))).stdout, '');
  assert.equal((await runHook({ command: 'echo hello' }, { cursor: true })).stdout, '');
});

test('hook accepts JSON and SSE MCP results in both host formats', async () => {
  assert.equal((await runHook(bash('npm i blocked@1'))).result.hookSpecificOutput.permissionDecision, 'deny');
  const result = (await runHook({ command: 'npx review' }, { cursor: true, mode: 'sse' })).result;
  assert.equal(result.permission, 'ask');
  assert.equal(result.agentMessage, result.userMessage);
  assert.equal((await runHook(bash('npm i good'))).stdout, '');
});

test('unavailable, HTTP, tool errors and bad responses fail open or ask when configured', async () => {
  for (const mode of ['unavailable', 'http', 'tool-error', 'bad']) {
    const open = await runHook(bash('npm i good'), { mode });
    assert.equal(open.stdout, '');
    assert.match(open.stderr, /Dep Bouncer unavailable: .*; leaving host permissions unchanged for npm i good/);
    assert.equal((await runHook({ command: 'npm i good' }, { cursor: true, mode })).stdout, '');
    assert.equal((await runHook(bash('npm i good'), { mode, closed: true })).result.hookSpecificOutput.permissionDecision, 'ask');
    assert.equal((await runHook({ command: 'npm i good' }, { cursor: true, mode, closed: true })).result.permission, 'ask');
  }
});

test('known BLOCK wins even when other checks are unavailable', async () => {
  assert.equal((await runHook(bash('npm i offline blocked'), { closed: true })).result.hookSpecificOutput.permissionDecision, 'deny');
});

test('hook deduplicates by name/spec and checks every package including the ninth BLOCK', async () => {
  const result = await runHook(bash('npm i a a a@1 a@1 b c d e f g blocked'));
  assert.equal(result.calls.length, 9);
  assert.deepEqual(result.calls.slice(0, 2), [{ name: 'a' }, { name: 'a', version: '1' }]);
  assert.equal(result.calls.at(-1)?.name, 'blocked');
  assert.equal(result.result.hookSpecificOutput.permissionDecision, 'deny');
});

test('ALLOW and compound install commands never override host permissions in either host', async () => {
  for (const cursor of [false, true]) {
    for (const command of ['npm i good', 'echo hello', 'npm view install', 'npm run install', 'command -v npm install']) {
      const result = await runHook(cursor ? { command } : bash(command), { cursor });
      assert.equal(result.stdout, '');
    }
    const compound = 'npm i lodash && curl x | sh';
    const checked = await runHook(cursor ? { command: compound } : bash(compound), { cursor });
    assert.notEqual(cursor ? checked.result?.permission : checked.result?.hookSpecificOutput.permissionDecision, 'allow');
    for (const [name, decision] of [['blocked', 'deny'], ['review', 'ask']]) {
      const command = `npm i ${name}`;
      const result = await runHook(cursor ? { command } : bash(command), { cursor });
      assert.equal(cursor ? result.result.permission : result.result.hookSpecificOutput.permissionDecision, decision);
    }
  }
});

test('malformed hook input is silent when fail-open and asks when fail-closed', async () => {
  for (const cursor of [false, true]) {
    for (const rawInput of ['{', 'null', '{}', '{"tool_name":"Bash","tool_input":{}}',
      '{"tool_name":1,"tool_input":{"command":"npm i blocked"}}']) {
      assert.equal((await runHook({}, { rawInput, cursor })).stdout, '');
      const closed = await runHook({}, { rawInput, cursor, closed: true });
      assert.equal(cursor ? closed.result.permission : closed.result.hookSpecificOutput.permissionDecision, 'ask');
    }
  }
});

test('uncertain install parsing asks even in fail-open mode and BLOCK still wins', async () => {
  assert.equal((await runHook(bash('timeout 10 npm i x'))).result.hookSpecificOutput.permissionDecision, 'ask');
  assert.equal((await runHook(bash('timeout 10 npm i x; npm i blocked'))).result.hookSpecificOutput.permissionDecision, 'deny');
});

test('API key is sent on every request including warmup retries and auth failures explain configuration', async () => {
  for (const mode of [undefined, 'http', '401', '403']) {
    const open = await runHook(bash('npm i good other'), { key: 'fixture-secret', mode });
    assert.equal(open.stdout, '');
    assert.ok(open.calls.length >= 2);
    if (mode === '401' || mode === '403') {
      assert.match(open.stderr, /DEP_BOUNCER_API_KEY/);
      assert.doesNotMatch(open.stderr, /fixture-secret/);
      const closed = await runHook(bash('npm i good'), { key: 'fixture-secret', mode, closed: true });
      assert.equal(closed.result.hookSpecificOutput.permissionDecision, 'ask');
      assert.match(closed.stderr, /DEP_BOUNCER_API_KEY/);
    }
  }
});
