#!/usr/bin/env node
// Protocol and conformance checks (docs/EXECUTION_PLAN.md section K, layer 2).
// Drives the BUILT server (dist/index.js) over stdio with the pinned MCP Inspector CLI. No new dependencies.
//   npm run build && npm run conformance
// Runs offline: scripts/conformance-preload.mjs stubs fetch inside the server process (local fixture repo, fake OSV).
// Exit code 1 when any check FAILs. A GAP is a failure we already know and list below; it is printed, not hidden,
// and does not fail the run. A GAP that starts passing is reported as FIXED so the entry can be removed.
import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const INSPECTOR = '@modelcontextprotocol/inspector@0.17.2';
const SERVER = join(ROOT, 'dist', 'index.js');
const PRELOAD = join(ROOT, 'scripts', 'conformance-preload.mjs');
const PRELOAD_OPT = `--import=${pathToFileURL(PRELOAD).href}`; // URL form: the repo path may contain spaces
const MAX_TOOLS = 15;
const MAX_DEPTH = 2;
const OUTPUT_BUDGET_CHARS = 20_000; // about 5,000 tokens per tool result
const CALL_TIMEOUT_MS = 90_000;

// Known, documented gaps. Keys are check ids (or id prefixes). Empty: schema-level input errors used to be one
// (the SDK validates before any guard and its text names no next step); src/common/sdk-validation.ts and
// src/common/validated-tool.ts now answer them with a message that names the next step (docs/EVAL_RESULTS.md section 1).
const KNOWN_GAPS = {};

const results = [];
const record = (id, status, detail) => results.push({ id, status, detail });
const gapFor = (id) => Object.entries(KNOWN_GAPS).find(([k]) => id === k || id.startsWith(`${k}:`))?.[1];
function check(id, ok, detail) {
  const gap = gapFor(id);
  if (ok) record(id, gap ? 'FIXED' : 'PASS', gap ? `${detail} (known gap now passes: remove it from KNOWN_GAPS)` : detail);
  else record(id, gap ? 'GAP' : 'FAIL', detail);
}

// ---------- Inspector driver ----------
function inspect(env, args, label) {
  const envArgs = Object.entries(env).flatMap(([k, v]) => ['-e', `${k}=${v}`]);
  return new Promise((resolveRun) => {
    const child = spawn('npx', ['-y', INSPECTOR, '--cli', ...envArgs, 'node', SERVER, ...args], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    const timer = setTimeout(() => child.kill('SIGKILL'), CALL_TIMEOUT_MS);
    child.on('close', (code) => {
      clearTimeout(timer);
      let json;
      try {
        json = JSON.parse(out);
      } catch {
        /* not JSON */
      }
      resolveRun({ code, json, out, err, label });
    });
  });
}

const ran = (r) => r.json !== undefined;
const textOf = (r) => (r.json?.content ?? []).map((c) => c.text ?? '').join('\n');
const isToolError = (r) => r.json?.isError === true;
const call = (env, tool, args, meta) =>
  inspect(env, ['--method', 'tools/call', '--tool-name', tool, ...Object.entries({ ...args, ...(meta ? { _meta: meta } : {}) }).flatMap(([k, v]) => ['--tool-arg', `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`])], tool);

// ---------- fixture repo (written at run time, served by the preload as a codeload tarball) ----------
function tar(files) {
  const parts = [];
  for (const [name, text] of Object.entries(files)) {
    const data = Buffer.from(text);
    const h = Buffer.alloc(512);
    h.write(`repo-main/${name}`, 0);
    h.write('0000644\0', 100);
    h.write('0000000\0', 108);
    h.write('0000000\0', 116);
    h.write(data.length.toString(8).padStart(11, '0') + '\0', 124);
    h.write('00000000000\0', 136);
    h.write('        ', 148);
    h.write('0', 156);
    h.write('ustar\0', 257);
    h.write('00', 263);
    let sum = 0;
    for (const b of h) sum += b;
    h.write(sum.toString(8).padStart(6, '0') + '\0 ', 148);
    parts.push(h, data, Buffer.alloc((512 - (data.length % 512)) % 512));
  }
  parts.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(parts));
}

const FIXTURE = {
  'composer.json': JSON.stringify({ name: 'legacy/php-shop', require: { php: '>=7.2', 'guzzlehttp/guzzle': '6.5.0', 'symfony/http-kernel': '4.4.0' } }),
  'composer.lock': JSON.stringify({ packages: [{ name: 'guzzlehttp/guzzle', version: '6.5.0' }, { name: 'symfony/http-kernel', version: 'v4.4.0' }] }),
  'package.json': JSON.stringify({ name: 'legacy-node', engines: { node: '>=10' }, dependencies: { express: '^4.16.0', lodash: '4.17.15', request: '^2.88.0' } }),
  'package-lock.json': JSON.stringify({ lockfileVersion: 3, packages: { '': {}, 'node_modules/express': { version: '4.16.0' }, 'node_modules/lodash': { version: '4.17.15' }, 'node_modules/request': { version: '2.88.0' } } }),
  '.nvmrc': '10\n',
  '.env': 'PORT=3000\n',
  'includes/db.php': "<?php\nerror_reporting(0);\n$db = mysql_connect('localhost', 'shop', 'x');\n",
  'index.php': "<?php\n$r = mysql_query(\"SELECT * FROM products WHERE id = \" . $_GET['id']);\n",
  'login.php': "<?php\n$pass = md5($_POST['password']);\n",
  'page.php': "<?php\ninclude($_GET['page'] . '.php');\n"
};

// ---------- schema walkers ----------
function* walk(schema, path = '$') {
  if (!schema || typeof schema !== 'object') return;
  yield [schema, path];
  for (const [k, v] of Object.entries(schema.properties ?? {})) yield* walk(v, `${path}.${k}`);
  if (schema.items) yield* walk(schema.items, `${path}[]`);
  for (const key of ['anyOf', 'oneOf', 'allOf']) for (const [i, v] of (schema[key] ?? []).entries()) yield* walk(v, `${path}|${key}${i}`);
}
const isString = (s) => s.type === 'string' && !s.enum && s.const === undefined;
function depthOf(schema) {
  // containers (object or array) nested below the root object; root = 0
  const below = [...Object.values(schema.properties ?? {}), ...(schema.items ? [schema.items] : [])];
  return below.reduce((max, s) => Math.max(max, (s.type === 'object' || s.type === 'array' ? 1 : 0) + depthOf(s)), 0);
}
const NEXT_STEP = /\b(use|call|check|provide|pass|send|ask|run|try|add|give|set|retry|see|choose|pick|paste|start|enter|supply)\b/i;

// ---------- main ----------
async function main() {
  if (!existsSync(SERVER)) {
    console.error('dist/index.js not found. Run `npm run build` first.');
    process.exit(2);
  }
  const work = await mkdtemp(join(tmpdir(), 'metamorph-conformance-'));
  try {
    const tarball = join(work, 'repo.tar.gz');
    await writeFile(tarball, tar(FIXTURE));
    const REPO = 'https://github.com/example/legacy-shop';

    const off = { METAMORPH_AUTH: 'off', NODE_OPTIONS: PRELOAD_OPT, METAMORPH_CONF_TARBALL: tarball, METAMORPH_SANDBOX_DIR: join(work, 'sandbox') };

    // 1. initialize + tools/list
    const list = await inspect(off, ['--method', 'tools/list'], 'tools/list');
    check('initialize', list.code === 0 && Array.isArray(list.json?.tools), list.code === 0 ? 'server started, handshake and tools/list succeeded over stdio' : `inspector exit ${list.code}: ${list.err.slice(0, 200)}`);
    const tools = list.json?.tools ?? [];
    check('tools/count', tools.length > 0 && tools.length <= MAX_TOOLS, `${tools.length} tools (limit ${MAX_TOOLS})`);

    const noDesc = tools.filter((t) => typeof t.description !== 'string' || t.description.trim().length < 20).map((t) => t.name);
    check('tools/description', tools.length > 0 && noDesc.length === 0, noDesc.length ? `missing or too short: ${noDesc.join(', ')}` : `all ${tools.length} have a description`);
    const noSchema = tools.filter((t) => t.inputSchema?.type !== 'object').map((t) => t.name);
    check('tools/inputSchema', tools.length > 0 && noSchema.length === 0, noSchema.length ? `no object inputSchema: ${noSchema.join(', ')}` : 'all have an object inputSchema');
    // Every tool declares all four hints as booleans, and read-only tools are never marked destructive.
    const HINTS = ['readOnlyHint', 'destructiveHint', 'idempotentHint', 'openWorldHint'];
    const annBad = tools.filter((t) => !t.annotations || HINTS.some((h) => typeof t.annotations[h] !== 'boolean') || (t.annotations.readOnlyHint && t.annotations.destructiveHint)).map((t) => t.name);
    check('tools/annotations', tools.length > 0 && annBad.length === 0, annBad.length ? `missing or inconsistent annotations: ${annBad.join(', ')}` : `all ${tools.length} tools carry the four hints`);
    // Expected values per tool (see src/common/tool-annotations.ts for the reasoning behind each).
    const EXPECT = {
      assess_project: [true, true], analyze_advisory: [true, true], check_watch: [true, true], plan_modernization: [true, true], preview_changes: [true, true],
      generate_report: [true, true], apply_stage: [true, true], verify_patch: [false, true]
    };
    const annWrong = Object.entries(EXPECT).filter(([n, [ro, ow]]) => { const a = tools.find((t) => t.name === n)?.annotations; return a && (a.readOnlyHint !== ro || a.openWorldHint !== ow || (n === 'verify_patch' && (a.destructiveHint !== false || a.idempotentHint !== false))); }).map(([n]) => n);
    check('tools/annotations-values', annWrong.length === 0, annWrong.length ? `unexpected hint values: ${annWrong.join(', ')}` : 'readOnly and openWorld hints match the documented behaviour of every tool; verify_patch is additive and not idempotent');

    const unboundedStrings = [];
    const unboundedArrays = [];
    for (const t of tools) {
      for (const [s, path] of walk(t.inputSchema, t.name)) {
        if (isString(s) && typeof s.maxLength !== 'number') unboundedStrings.push(path);
        if (s.type === 'array' && typeof s.maxItems !== 'number') unboundedArrays.push(path);
      }
    }
    check('schema/maxLength', unboundedStrings.length === 0, unboundedStrings.length ? `strings without maxLength: ${unboundedStrings.join(', ')}` : 'every string property has maxLength');
    check('schema/maxItems', unboundedArrays.length === 0, unboundedArrays.length ? `arrays without maxItems: ${unboundedArrays.join(', ')}` : 'every array has maxItems');
    const deep = tools.map((t) => [t.name, depthOf(t.inputSchema)]).filter(([, d]) => d > MAX_DEPTH);
    const maxDepth = Math.max(0, ...tools.map((t) => depthOf(t.inputSchema)));
    check('schema/depth', deep.length === 0, deep.length ? `too deep: ${deep.map(([n, d]) => `${n}=${d}`).join(', ')}` : `max nesting depth ${maxDepth} (limit ${MAX_DEPTH})`);

    // 2. invalid input returns an error that names the next step
    const invalid = await Promise.all(
      tools.map(async (t) => {
        const first = Object.entries(t.inputSchema.properties ?? {})[0];
        const r = await call(off, t.name, first ? { [first[0]]: 12345 } : {});
        return { tool: t.name, r };
      })
    );
    for (const { tool, r } of invalid) {
      const text = textOf(r);
      // The friendly shape: names the tool, the field and problem, a next step and an example; never the SDK's raw "data/field must be" text.
      const friendly = new RegExp(`^(Error: )?Invalid input for ${tool}: .+ Next step: .+`).test(text) && !/Input validation error|data\//.test(text) && !text.includes('12345');
      check(`invalid-input/schema:${tool}`, isToolError(r) && NEXT_STEP.test(text) && friendly, isToolError(r) ? `"${text.replace(/\s+/g, ' ').slice(0, 140)}"` : 'call did not return isError');
    }
    // A too-short value (a constraint the SDK used to reject with "must NOT have fewer than 10 characters") and a bad enum.
    const short = await call(off, 'assess_project', { repo_url: 'abc' });
    check('invalid-input/too-short', isToolError(short) && /repo_url must be at least 10 characters long\. Next step: .*Example: /.test(textOf(short)), `"${textOf(short).replace(/\s+/g, ' ').slice(0, 200)}"`);
    const badEnum = await call(off, 'cloud_inventory', { provider: 'gcp' });
    check('invalid-input/bad-enum', isToolError(badEnum) && /provider must be one of: aws\. Next step/.test(textOf(badEnum)) && !textOf(badEnum).includes('gcp'), `"${textOf(badEnum).replace(/\s+/g, ' ').slice(0, 200)}"`);
    // well-formed but unusable input, rejected by our own code
    const props = (n) => tools.find((t) => t.name === n)?.inputSchema.properties ?? {};
    const repoTools = tools.filter((t) => t.inputSchema.properties?.repo_url).map((t) => t.name);
    const semantic = await Promise.all(
      repoTools.map(async (name) => ({ name, r: await call(off, name, { repo_url: 'https://example.org/not-github', ...(props(name).stage ? { stage: 'patch-dependencies' } : {}), ...(props(name).approval_token ? { approval_token: 'x'.repeat(24) } : {}) }) }))
    );
    for (const { name, r } of semantic) {
      const text = textOf(r);
      check(`invalid-input/semantic:${name}`, isToolError(r) && NEXT_STEP.test(text), isToolError(r) ? `"${text.replace(/\s+/g, ' ').slice(0, 140)}"` : 'call did not return isError');
    }

    // a single string where a list is expected is accepted (the SDK would otherwise reject it with an error that names no next step)
    const single = await call(off, 'analyze_advisory', { packages: 'npm:lodash@4.17.15' });
    check('tolerant-input/single-string-list', ran(single) && !isToolError(single) && /lodash/.test(textOf(single)), isToolError(single) ? textOf(single).slice(0, 120) : 'packages given as one string was analysed');

    // 3. read-tool output sizes on the fixture repo
    const sized = [
      ['assess_project', { repo_url: REPO }],
      ['plan_modernization', { repo_url: REPO }],
      ['preview_changes', { repo_url: REPO, stage: 'patch-dependencies' }],
      ['generate_report', { repo_url: REPO }],
      ['analyze_advisory', { packages: ['npm:lodash@4.17.15'] }]
    ].filter(([n]) => tools.some((t) => t.name === n));
    const outputs = await Promise.all(sized.map(async ([n, a]) => ({ n, r: await call(off, n, a) })));
    for (const { n, r } of outputs) {
      const size = r.out.length;
      const err = isToolError(r) ? ` (tool returned an error: ${textOf(r).slice(0, 100)})` : '';
      check(`output-size:${n}`, !isToolError(r) && size <= OUTPUT_BUDGET_CHARS, `${size} chars of JSON, about ${Math.round(size / 4)} tokens (budget ${OUTPUT_BUDGET_CHARS} chars)${err}`);
    }

    // 4. auth ON: 401 and 403 (stdio carries no HTTP headers, so the key travels in _meta.authorization, which the SDK bridges)
    const readKey = `r-${randomBytes(16).toString('hex')}`;
    const writeKey = `w-${randomBytes(16).toString('hex')}`;
    const sha = (v) => createHash('sha256').update(v).digest('hex');
    const on = { NODE_OPTIONS: PRELOAD_OPT, METAMORPH_CONF_TARBALL: tarball, METAMORPH_SANDBOX_DIR: join(work, 'sandbox'), METAMORPH_KEY_CONFREAD: `read:${sha(readKey)}`, METAMORPH_KEY_CONFWRITE: `write:${sha(writeKey)}` };
    const applyArgs = { repo_url: REPO, stage: 'patch-dependencies', approval_token: 'x'.repeat(24) };
    const [noKey, badKey, readOnWrite, readOnRead, writeOnWrite, noKeyBadInput, readKeyBadInput] = await Promise.all([
      call(on, 'assess_project', { repo_url: REPO }),
      call(on, 'assess_project', { repo_url: REPO }, { authorization: `Bearer ${randomBytes(12).toString('hex')}` }),
      call(on, 'apply_stage', applyArgs, { authorization: `Bearer ${readKey}` }),
      call(on, 'assess_project', { repo_url: REPO }, { authorization: `Bearer ${readKey}` }),
      call(on, 'apply_stage', applyArgs, { authorization: `Bearer ${writeKey}` }),
      call(on, 'assess_project', { repo_url: 12345 }),
      call(on, 'assess_project', { repo_url: 12345 }, { authorization: `Bearer ${readKey}` })
    ]);
    check('auth/no-key-401', ran(noKey) && isToolError(noKey) && /\b401\b/.test(textOf(noKey)) && NEXT_STEP.test(textOf(noKey)), `"${textOf(noKey).slice(0, 110)}"`);
    check('auth/bad-key-401', ran(badKey) && isToolError(badKey) && /\b401\b/.test(textOf(badKey)), `"${textOf(badKey).slice(0, 110)}"`);
    check('auth/read-key-write-tool-403', ran(readOnWrite) && isToolError(readOnWrite) && /\b403\b/.test(textOf(readOnWrite)) && NEXT_STEP.test(textOf(readOnWrite)), `"${textOf(readOnWrite).slice(0, 130)}"`);
    check('auth/read-key-read-tool-allowed', ran(readOnRead) && !isToolError(readOnRead) && !/\b40[13]\b/.test(textOf(readOnRead)), isToolError(readOnRead) ? textOf(readOnRead).slice(0, 120) : 'read key passed the guard on a read tool');
    check('auth/write-key-passes-guard', ran(writeOnWrite) && !/\b40[13]\b/.test(textOf(writeOnWrite)), `write key got past the guard: "${textOf(writeOnWrite).slice(0, 110)}"`);
    // Auth runs before input errors: an unauthenticated caller with invalid input gets 401; an authorised one gets the input message.
    check('auth/401-before-input-error', ran(noKeyBadInput) && isToolError(noKeyBadInput) && /\b401\b/.test(textOf(noKeyBadInput)) && !/Invalid input/.test(textOf(noKeyBadInput)), `"${textOf(noKeyBadInput).slice(0, 110)}"`);
    check('auth/valid-key-gets-input-error', ran(readKeyBadInput) && isToolError(readKeyBadInput) && /Invalid input for assess_project: repo_url must be a string/.test(textOf(readKeyBadInput)), `"${textOf(readKeyBadInput).slice(0, 130)}"`);
    const leaked = [noKey, badKey, readOnWrite, readOnRead, writeOnWrite, noKeyBadInput, readKeyBadInput].some((r) => r.out.includes(readKey) || r.out.includes(writeKey) || r.out.includes(sha(readKey)));
    check('auth/key-not-echoed', !leaked, leaked ? 'a key or key hash appeared in a tool result' : 'no key or hash in any tool result');
  } finally {
    await rm(work, { recursive: true, force: true });
  }

  const w = Math.max(...results.map((r) => r.id.length));
  console.log(`\nMetamorph conformance (Inspector ${INSPECTOR.split('@').pop()}, stdio, offline stubs)\n`);
  for (const r of results) console.log(`${r.status.padEnd(5)} ${r.id.padEnd(w)}  ${r.detail}`);
  const count = (s) => results.filter((r) => r.status === s).length;
  console.log(`\n${count('PASS')} pass, ${count('GAP')} known gap, ${count('FIXED')} fixed gap, ${count('FAIL')} fail, ${results.length} checks`);
  for (const [k, why] of Object.entries(KNOWN_GAPS)) if (results.some((r) => r.status === 'GAP' && (r.id === k || r.id.startsWith(`${k}:`)))) console.log(`GAP ${k}: ${why}`);
  process.exit(count('FAIL') > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
