import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchBytes, fetchJson } from '../src/modules/registry/http.js';

const url = 'https://registry.npmjs.org/fixture';

test('HTTP caps chunked bodies while streaming and cancels immediately', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  let consumed = 0;
  let cancelled = false;
  globalThis.fetch = async (_url, options) => {
    assert.equal(options?.redirect, 'manual');
    return new Response(new ReadableStream({
      pull(controller) { consumed++; controller.enqueue(new Uint8Array(1024)); },
      cancel() { cancelled = true; },
    }, { highWaterMark: 0 }));
  };
  await assert.rejects(fetchBytes('npm', url, { maxBytes: 2048 }), /response too large/);
  assert.equal(consumed, 3);
  assert.ok(cancelled);
});

test('HTTP discards and cancels declared oversized and error bodies, including retry and 404', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  for (const status of [200, 404, 403, 500]) {
    let cancelled = 0;
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      return new Response(new ReadableStream({ cancel() { cancelled++; } }), {
        status, headers: status === 200 ? { 'content-length': '10000' } : {},
      });
    };
    if (status === 404) assert.equal(await fetchBytes('npm', url), null);
    else await assert.rejects(fetchBytes('npm', url, { maxBytes: 2 }), status === 200 ? /too large/ : /HTTP/);
    assert.equal(cancelled, status === 500 ? 2 : 1);
    assert.equal(calls, cancelled);
  }
});

test('HTTP follows up to three same-origin redirects and cancels each discarded body', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const calls: string[] = [];
  let cancelled = 0;
  globalThis.fetch = async (input, options) => {
    assert.equal(options?.redirect, 'manual');
    calls.push(String(input));
    return calls.length < 4 ? new Response(new ReadableStream({ cancel() { cancelled++; } }), {
      status: 302, headers: { location: `/hop${calls.length}` },
    }) : Response.json({ ok: true });
  };
  assert.deepEqual(await fetchJson('npm', url), { ok: true });
  assert.equal(calls.length, 4);
  assert.equal(cancelled, 3);
});

test('HTTP rejects outside origins, alternate allowed origins and redirect loops before further requests', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  for (const origin of ['https://registry.npmjs.org', 'https://api.npmjs.org', 'https://api.osv.dev']) {
    for (const location of ['https://outside.example/payload', 'https://api.npmjs.org/other', 'http://registry.npmjs.org/x',
      'https://user:pass@registry.npmjs.org/x', '/loop']) {
      let calls = 0;
      globalThis.fetch = async () => { calls++; return new Response(null, { status: 307, headers: { location } }); };
      await assert.rejects(fetchBytes('API', `${origin}/start`), /Refusing redirect|redirect limit/);
      assert.equal(calls, location === '/loop' || new URL(location, origin).origin === origin && !new URL(location, origin).username ? 4 : 1);
    }
  }
});

test('OSV POST redirects preserve the JSON body for 307 and share the timeout signal', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const calls: RequestInit[] = [];
  globalThis.fetch = async (_input, options) => {
    calls.push(options!);
    return calls.length === 1 ? new Response(null, { status: 307, headers: { location: '/v1/query-new' } }) : Response.json({ vulns: [] });
  };
  await fetchJson('OSV', 'https://api.osv.dev/v1/query', { method: 'POST', body: { version: '1.0.0' } });
  assert.equal(calls[1].method, 'POST');
  assert.equal(calls[1].body, '{"version":"1.0.0"}');
  assert.equal(calls[0].signal, calls[1].signal);
});

test('HTTP returns exact bytes at the limit and rejects invalid JSON', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => new Response('1234');
  assert.equal(Buffer.from((await fetchBytes('npm', url, { maxBytes: 4 }))!).toString(), '1234');
  globalThis.fetch = async () => new Response('{');
  await assert.rejects(fetchJson('npm', url), /invalid JSON/);
});
