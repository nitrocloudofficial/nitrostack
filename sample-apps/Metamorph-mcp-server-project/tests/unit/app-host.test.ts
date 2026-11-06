import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { APP_CSS, APP_JS, LOGIC, SHIM, appCsp, handleApp, installAppHost, renderApp } from '../../src/app-host.js';
import { TOOLS, renderLanding } from '../../src/landing.js';

// The browser runs this exact source text; the tests evaluate it the same way (in a fresh context, results as plain JSON).
type Any = Record<string, unknown>;
const raw = runInNewContext(`${LOGIC}\n({ parseRpc, allowedExternal, callPolicy, decide })`, { URL }) as {
  parseRpc(t: unknown): unknown;
  allowedExternal(u: unknown, o: string): boolean;
  callPolicy(n: unknown, from: string, w: boolean, t: Any): { ok: boolean };
  decide(ev: unknown, ctx: unknown): unknown;
};
const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v ?? null));
const parseRpc = (t: unknown) => plain(raw.parseRpc(t)) as { result?: unknown } | null;
const decide = (ev: unknown, c: unknown) => plain(raw.decide(ev, c)) as { act: string };
const tools = Object.fromEntries(TOOLS.map((t) => [t.name, t.scope]));
const win = {};
const ctx = { frameWindow: win, origin: 'https://m.example', tools, canWrite: false };
const msg = (data: unknown, source: unknown = win) => ({ source, data });
const call = (id: number, name: string, args: unknown = {}) => msg({ src: 'mm-widget', t: 'callTool', id, name, args });
const sha = (s: string) => `'sha256-${createHash('sha256').update(s).digest('base64')}'`;

describe('GET /app route and page', () => {
  it('registers exactly GET /app and sends the page with the headers', () => {
    const seen: string[] = [];
    installAppHost({ get: (p) => seen.push(p) });
    expect(seen).toEqual(['/app']);
    const h: Record<string, string> = {};
    let body = '';
    const res = { status: () => res, setHeader: (n: string, v: string) => (h[n.toLowerCase()] = v), send: (b: string) => (body = b) };
    handleApp({}, res);
    expect(body).toContain('<!doctype html>');
    expect(h['x-frame-options']).toBe('DENY');
    expect(h['content-security-policy']).toContain("default-src 'none'");
    expect(h['content-security-policy']).toContain("connect-src 'self'");
    expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
  });
  it('CSP hashes match the inline style and script', () => {
    const csp = appCsp();
    expect(csp).toMatch(/script-src ('sha256-[^']+' ?)+;/);
    expect(csp).not.toMatch(/script-src[^;]*unsafe/);
    expect(csp).toContain(sha(APP_JS));
    expect(csp).toContain(sha(SHIM));
    const html = renderApp();
    expect(html).toContain(`<style>${APP_CSS}</style>`);
    expect(html).toContain(`<script>${APP_JS}</script>`);
    expect(html.replace(`<script>${APP_JS}</script>`, '').replace(/<script type="text\/plain" id="wcss">[\s\S]*?<\/script>/, '')).not.toContain('<script');
  });
  it('has no external URLs, no storage, no key material; the key field is a password input', () => {
    const html = renderApp();
    expect(html.replace(/http:\/\/www\.w3\.org\/2000\/svg/g, '')).not.toMatch(/https?:\/\/(?!github\.com\/)/);
    expect(html).not.toMatch(/sessionStorage|document\.cookie|indexedDB/);
    // localStorage only holds two UI preferences (sidebar, theme), always inside try/catch, never the key.
    expect([...html.matchAll(/localStorage\.(?:set|get)Item\(([^,)]*)/g)].map((m) => m[1])).toEqual(['k', 'k']);
    expect(html).toContain('type="password"');
    expect(html).toContain('Your key stays in this tab and is sent only to this server.');
    expect(html).toContain("sandbox','allow-scripts'");
    expect(html).not.toContain('allow-same-origin');
    expect(html).not.toMatch(/Bearer [A-Za-z0-9_-]{8,}/);
  });
  it('the page script is valid JavaScript', () => {
    expect(() => new Function(APP_JS)).not.toThrow();
  });
  it('has a collapsible sidebar, a theme switch, six clickable stages and deep links', () => {
    const html = renderApp();
    expect(html).toContain('id="collapse"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('id="theme"');
    for (const s of ['assess', 'plan', 'preview', 'apply', 'verify', 'report']) {
      expect(html).toContain(`id="s-${s}"`);
      expect(html).not.toMatch(new RegExp(`id="s-${s}"><button[^>]*disabled`));
    }
    expect(html).toContain('location.hash');
    expect(html).toContain('mm-host-sidebar');
    expect(html).toContain('mm-host-theme');
    expect(html).toContain('<details class="about">');
    expect(html).toContain('Rate limited.');
  });
  it('landing links to /app', () => {
    expect(renderLanding('http://localhost/mcp')).toContain('href="/app"');
  });
});

describe('host message handler', () => {
  it('ignores messages not from the iframe window', () => {
    expect(decide(call(1, 'assess_project'), { ...ctx })).toEqual({ act: 'call', id: 1, name: 'assess_project', args: {} });
    expect(decide(msg({ src: 'mm-widget', t: 'callTool', id: 1, name: 'assess_project', args: {} }, {}), ctx).act).toBe('ignore');
    expect(decide(msg({ src: 'mm-widget', t: 'ready' }, null), ctx).act).toBe('ignore');
    expect(decide(msg({ src: 'mm-widget', t: 'ready' }), { ...ctx, frameWindow: undefined }).act).toBe('ignore');
    expect(decide(msg('hello'), ctx).act).toBe('ignore');
    expect(decide(msg({ t: 'ready' }), ctx).act).toBe('ignore');
  });
  it('allows only known read/plan tools from the widget and strips odd arguments', () => {
    expect(decide(call(2, 'preview_changes', { stage: 'x', evil: { a: 1 }, 'Bad-Key': 'y' }), ctx)).toEqual({ act: 'call', id: 2, name: 'preview_changes', args: { stage: 'x' } });
    expect(decide(call(3, 'nope'), ctx).act).toBe('deny');
    expect(decide(call(4, '__proto__'), ctx).act).toBe('deny');
    // write tools are never run on the widget's request, even when the key could
    expect(decide(call(5, 'apply_stage'), { ...ctx, canWrite: true }).act).toBe('deny');
    expect(decide(call(6, 'verify_patch'), ctx).act).toBe('deny');
  });
  it('gates write tools for host buttons on scope', () => {
    expect(raw.callPolicy('apply_stage', 'host', false, tools).ok).toBe(false);
    expect(raw.callPolicy('apply_stage', 'host', true, tools).ok).toBe(true);
    expect(raw.callPolicy('assess_project', 'host', false, tools).ok).toBe(true);
    expect(raw.callPolicy('plan_modernization', 'widget', false, tools).ok).toBe(true);
  });
  it('openExternal: https anywhere, same origin only under /reports/', () => {
    const o = 'https://m.example';
    expect(raw.allowedExternal('https://github.com/a/b', o)).toBe(true);
    expect(raw.allowedExternal('http://evil.example/x', o)).toBe(false);
    expect(raw.allowedExternal('javascript:alert(1)', o)).toBe(false);
    expect(raw.allowedExternal('data:text/html,x', o)).toBe(false);
    expect(raw.allowedExternal('/reports/abc.pdf', o)).toBe(true);
    expect(raw.allowedExternal('/mcp', o)).toBe(false);
    expect(raw.allowedExternal('http://localhost:3190/reports/a', 'http://localhost:3190')).toBe(true);
    expect(raw.allowedExternal('https://user:pw@github.com/', o)).toBe(false);
    expect(raw.allowedExternal(5, o)).toBe(false);
    expect(decide(msg({ src: 'mm-widget', t: 'openExternal', url: 'http://evil.example' }), ctx).act).toBe('ignore');
    expect(decide(msg({ src: 'mm-widget', t: 'openExternal', url: 'https://github.com/x' }), ctx)).toEqual({ act: 'open', url: 'https://github.com/x' });
  });
  it('maps ready, theme and fullscreen', () => {
    for (const t of ['ready', 'theme', 'fullscreen']) expect(decide(msg({ src: 'mm-widget', t }), ctx).act).toBe(t);
  });
});

describe('JSON-RPC parsing', () => {
  it('parses plain JSON', () => expect(parseRpc('{"jsonrpc":"2.0","id":1,"result":{"a":1}}')?.result).toEqual({ a: 1 }));
  it('parses SSE framing and takes the response message', () => {
    const sse = 'event: message\r\ndata: {"jsonrpc":"2.0","method":"notifications/progress"}\r\n\r\nevent: message\ndata: {"jsonrpc":"2.0","id":2,"result":{"ok":true}}\n\n';
    expect(parseRpc(sse)?.result).toEqual({ ok: true });
  });
  it('returns null for junk', () => {
    expect(parseRpc('')).toBeNull();
    expect(parseRpc('<html>')).toBeNull();
    expect(parseRpc('{bad')).toBeNull();
    expect(parseRpc(undefined)).toBeNull();
  });
});
