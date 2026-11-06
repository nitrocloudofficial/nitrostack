// Public dashboard: POST /app/rpc. The browser page sends JSON-RPC here without any key; this route checks it against a
// strict allowlist and forwards it to the server's own /mcp over loopback with an ephemeral in-memory key. The key
// is random per process, registered as a runtime key (scope write, label DASHBOARD), and never logged or returned.
import { createHash, randomBytes } from 'node:crypto';
import { registerRuntimeKey, sha256 } from './common/auth/keys.js';

export const PUBLIC_TOOLS = ['assess_project', 'plan_modernization', 'preview_changes', 'apply_stage', 'generate_report', 'check_watch', 'analyze_advisory'];
const WIDGET = 'ui://widget/next-score-dashboard.html';
export const MAX_BODY = 16 * 1024;
export const LIMITS = { perMinute: 30, perClient: 2, global: 8, timeoutMs: 110_000 };

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => !!v && typeof v === 'object' && !Array.isArray(v);

// Returns an error message when the request may not pass, otherwise undefined.
export function checkAllowed(body: unknown): string | undefined {
  if (!isObj(body) || body.jsonrpc !== '2.0' || typeof body.method !== 'string') return 'Send a JSON-RPC 2.0 request.';
  if (body.id !== undefined && typeof body.id !== 'number' && typeof body.id !== 'string') return 'Invalid request id.';
  const params = body.params;
  if (params !== undefined && !isObj(params)) return 'Invalid params.';
  switch (body.method) {
    case 'initialize':
    case 'notifications/initialized':
      return undefined;
    case 'tools/call': {
      const name = params?.name;
      if (typeof name !== 'string') return 'Missing tool name.';
      if (name === 'verify_patch' || name === 'cloud_inventory') return `${name} needs your own key (and the runner). Use "Use my own key" in the sidebar.`;
      if (!PUBLIC_TOOLS.includes(name)) return 'That tool is not available in the public dashboard.';
      if (params?.arguments !== undefined && !isObj(params.arguments)) return 'Invalid tool arguments.';
      return undefined;
    }
    case 'resources/read':
      return params?.uri === WIDGET ? undefined : 'Only the dashboard widget can be read in the public dashboard.';
    default:
      return 'That request is not available in the public dashboard.';
  }
}

interface Req {
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
  body?: unknown;
  on(ev: string, fn: (...a: never[]) => void): unknown;
  destroy?(): unknown;
}
interface Res {
  status(code: number): Res;
  setHeader(name: string, value: string): unknown;
  send(body: string): unknown;
}
type Fetch = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal: AbortSignal }) => Promise<{ status: number; headers: { get(n: string): string | null }; text(): Promise<string> }>;

export interface PublicOptions {
  port?: () => number;
  fetchImpl?: Fetch;
  now?: () => number;
  key?: string; // tests only; production generates a random key
  log?: (m: string) => void;
}

const rpcError = (id: unknown, code: number, message: string) => JSON.stringify({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });

async function readBody(req: Req): Promise<string | 'too-big'> {
  const len = Number(req.headers['content-length'] ?? 0);
  if (len > MAX_BODY) return 'too-big';
  if (req.body !== undefined) {
    const t = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    return Buffer.byteLength(t) > MAX_BODY ? 'too-big' : t;
  }
  return new Promise((resolve, reject) => {
    const parts: Buffer[] = [];
    let n = 0;
    req.on('data', ((c: Buffer | string) => {
      const b = Buffer.isBuffer(c) ? c : Buffer.from(c);
      n += b.length;
      if (n > MAX_BODY) return resolve('too-big');
      parts.push(b);
    }) as (...a: never[]) => void);
    req.on('end', (() => resolve(Buffer.concat(parts).toString('utf-8'))) as (...a: never[]) => void);
    req.on('error', ((e: Error) => reject(e)) as (...a: never[]) => void);
  });
}

// Hashed (in memory only) client identity for rate limits: first x-forwarded-for hop, else the socket address.
export function clientIdOf(req: Pick<Req, 'headers' | 'socket'>): string {
  const xff = req.headers['x-forwarded-for'];
  const first = (Array.isArray(xff) ? xff[0] : xff)?.split(',')[0]?.trim();
  return createHash('sha256').update(first || req.socket?.remoteAddress || 'unknown').digest('hex').slice(0, 16);
}

export function createPublicProxy(opts: PublicOptions = {}) {
  const plainKey = opts.key ?? randomBytes(32).toString('base64url');
  registerRuntimeKey('DASHBOARD', 'write', sha256(plainKey));
  const now = opts.now ?? Date.now;
  const doFetch: Fetch = opts.fetchImpl ?? ((url, init) => fetch(url, init));
  const port = opts.port ?? (() => Number(process.env.PORT) || 3000);
  const clients = new Map<string, { hits: number[]; active: number }>();
  let active = 0;

  const scrub = (t: string) => (t.includes(plainKey) ? t.split(plainKey).join('[redacted]') : t);
  const clientId = clientIdOf;

  async function handle(req: Req, res: Res): Promise<void> {
    const send = (status: number, body: string, extra: Record<string, string> = {}) => {
      res.status(status);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      for (const [k, v] of Object.entries(extra)) res.setHeader(k, v);
      res.send(body);
    };
    const ctype = String(req.headers['content-type'] ?? '');
    if (!/^application\/json\b/i.test(ctype)) return send(415, rpcError(null, -32600, 'Send Content-Type: application/json.'));

    // rate limits (count first, so refused requests are not free)
    const id = clientId(req);
    const t = now();
    const c = clients.get(id) ?? { hits: [], active: 0 };
    c.hits = c.hits.filter((h) => t - h < 60_000);
    clients.set(id, c);
    if (clients.size > 5000) for (const [k, v] of clients) if (!v.active && !v.hits.some((h) => t - h < 60_000)) clients.delete(k);
    if (c.hits.length >= LIMITS.perMinute) {
      const wait = Math.max(1, Math.ceil((60_000 - (t - c.hits[0])) / 1000));
      return send(429, rpcError(null, -32000, `The public dashboard is rate limited (${LIMITS.perMinute} requests a minute). Please wait ${wait} seconds.`), { 'Retry-After': String(wait) });
    }
    if (c.active >= LIMITS.perClient || active >= LIMITS.global) {
      return send(429, rpcError(null, -32000, 'The public dashboard is busy. Please wait a few seconds and try again.'), { 'Retry-After': '5' });
    }
    c.hits.push(t);
    c.active++;
    active++;
    try {
      let text: string | 'too-big';
      try {
        text = await readBody(req);
      } catch {
        return send(400, rpcError(null, -32700, 'Could not read the request.'));
      }
      if (text === 'too-big') return send(413, rpcError(null, -32600, 'Request too large (16 KB maximum).'));
      let body: unknown;
      try {
        body = JSON.parse(text);
      } catch {
        return send(400, rpcError(null, -32700, 'Invalid JSON.'));
      }
      const bad = checkAllowed(body);
      if (bad) return send(200, rpcError(isObj(body) ? body.id : null, -32601, bad));

      const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', Authorization: `Bearer ${plainKey}` };
      const sid = req.headers['mcp-session-id'];
      if (typeof sid === 'string' && /^[A-Za-z0-9._-]{1,128}$/.test(sid)) headers['mcp-session-id'] = sid;
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), LIMITS.timeoutMs);
      try {
        const up = await doFetch(`http://localhost:${port()}/mcp`, { method: 'POST', headers, body: JSON.stringify(body), signal: ac.signal });
        const out = scrub(await up.text());
        const extra: Record<string, string> = {};
        const us = up.headers.get('mcp-session-id');
        if (us && /^[A-Za-z0-9._-]{1,128}$/.test(us)) extra['mcp-session-id'] = us;
        res.status(up.status);
        res.setHeader('Content-Type', up.headers.get('content-type') ?? 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        for (const [k, v] of Object.entries(extra)) res.setHeader(k, v);
        res.send(out);
      } catch (e) {
        const aborted = (e as Error)?.name === 'AbortError';
        send(aborted ? 504 : 502, rpcError(isObj(body) ? body.id : null, -32000, aborted ? 'The server took too long to answer. Please try again.' : 'The dashboard could not reach the server. Please try again.'));
      } finally {
        clearTimeout(timer);
      }
    } finally {
      c.active--;
      active--;
    }
  }
  return { handle, keyForTests: () => plainKey };
}

export interface PublicApp {
  post(path: string, handler: (req: never, res: never) => void): unknown;
}

// METAMORPH_PUBLIC_DASHBOARD=off disables the route and the key. Returns whether the public route is on.
export function installPublic(app: PublicApp, opts: PublicOptions & { env?: Record<string, string | undefined> } = {}): boolean {
  const env = opts.env ?? process.env;
  if ((env.METAMORPH_PUBLIC_DASHBOARD ?? '').toLowerCase() === 'off') return false;
  const proxy = createPublicProxy(opts);
  app.post('/app/rpc', ((req: Req, res: Res) => {
    proxy.handle(req, res).catch(() => {
      res.status(500);
      res.send(rpcError(null, -32603, 'Internal error.'));
    });
  }) as (req: never, res: never) => void);
  return true;
}
