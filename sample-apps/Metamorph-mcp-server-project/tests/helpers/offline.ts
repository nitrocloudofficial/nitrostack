import { vi } from 'vitest';
import type { ExecutionContext } from '@nitrostack/core';
import { tgzOf } from './tar.js';

// Offline stand-in for global fetch, for tests that drive the real tool classes.
//   codeload.github.com -> the given tarball
//   api.osv.dev         -> one fake advisory for every package (summary and fixed version are configurable)
//   anything else       -> 503 (feeds degrade, as when a feed is down)
// Every requested URL is recorded so a test can assert which hosts the server talked to.
export interface OfflineOptions {
  tarball?: Buffer;
  osvSummary?: string;
  osvFixed?: string; // default 99.0.0 (a major jump); use a same-major version when a test needs a patch
  extra?: (url: URL, init: RequestInit) => Response | Promise<Response> | undefined;
}

export interface Offline {
  urls: string[];
  hosts: () => string[];
  restore: () => void;
}

export function installOfflineFetch(opts: OfflineOptions = {}): Offline {
  const urls: string[] = [];
  const seen = new Map<string, { name: string; ecosystem: string }>(); // packages asked about, so /vulns/<id> can name them
  const impl = async (input: string | URL | Request, init: RequestInit = {}): Promise<Response> => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    urls.push(url.href);
    const extra = await opts.extra?.(url, init);
    if (extra) return extra;
    if (url.hostname === 'codeload.github.com' && opts.tarball) {
      return new Response(opts.tarball, { status: 200, headers: { 'content-type': 'application/gzip', 'content-length': String(opts.tarball.length) } });
    }
    if (url.hostname === 'api.osv.dev') {
      const body = init.body ? JSON.parse(String(init.body)) : {};
      const json = (v: unknown) => new Response(JSON.stringify(v), { status: 200, headers: { 'content-type': 'application/json' } });
      for (const q of body.queries ?? []) if (q?.package?.name) seen.set(`${q.package.ecosystem}:${q.package.name}`, q.package);
      if (body.package?.name) seen.set(`${body.package.ecosystem}:${body.package.name}`, body.package);
      const vuln = (pkg?: { name: string; ecosystem: string }) => ({
        id: 'GHSA-aaaa-bbbb-cccc',
        modified: '2024-01-01T00:00:00Z',
        aliases: ['CVE-2024-0001'],
        summary: opts.osvSummary ?? 'Fake advisory used by the security tests',
        database_specific: { severity: 'HIGH', cwe_ids: ['CWE-79'] },
        affected: (pkg ? [pkg] : [...seen.values()]).map((p) => ({ package: { name: p.name, ecosystem: p.ecosystem }, ranges: [{ events: [{ introduced: '0' }, { fixed: opts.osvFixed ?? '99.0.0' }] }] }))
      });
      if (url.pathname.endsWith('/querybatch')) return json({ results: (body.queries ?? []).map(() => ({ vulns: [{ id: 'GHSA-aaaa-bbbb-cccc', modified: '2024-01-01T00:00:00Z' }] })) });
      if (url.pathname.endsWith('/query')) return json({ vulns: [vuln(body.package)] });
      if (url.pathname.includes('/vulns/')) return json(vuln());
    }
    return new Response('offline in tests', { status: 503 });
  };
  vi.stubGlobal('fetch', impl);
  return { urls, hosts: () => [...new Set(urls.map((u) => new URL(u).hostname))].sort(), restore: () => vi.unstubAllGlobals() };
}

// A GitHub-style tarball: every file sits under one top-level folder, which extraction strips.
export const repoTarball = (files: Record<string, string>): Buffer => tgzOf(Object.fromEntries(Object.entries(files).map(([k, v]) => [`repo-main/${k}`, v])));

// ExecutionContext double that records every logger call (and, with watchConsole, every console write).
export interface LoggedCtx {
  ctx: ExecutionContext;
  lines: string[];
}

export function loggedCtx(): LoggedCtx {
  const lines: string[] = [];
  const rec = (level: string) => (...args: unknown[]) => {
    lines.push(`${level} ${args.map((a) => (typeof a === 'string' ? a : safeJson(a))).join(' ')}`);
  };
  const logger = { info: rec('info'), warn: rec('warn'), error: rec('error'), debug: rec('debug') };
  return { ctx: { logger } as unknown as ExecutionContext, lines };
}

export function watchConsole(lines: string[]): () => void {
  const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
    vi.spyOn(console, m).mockImplementation((...args: unknown[]) => {
      lines.push(`console.${m} ${args.map((a) => (typeof a === 'string' ? a : safeJson(a))).join(' ')}`);
    })
  );
  return () => spies.forEach((s) => s.mockRestore());
}

function safeJson(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
