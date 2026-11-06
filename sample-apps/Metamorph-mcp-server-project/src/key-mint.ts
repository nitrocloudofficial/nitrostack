// Self-service guest keys: POST /keys/mint. Mints a random key, registers only its SHA-256 as a runtime key with scope
// plan (read + plan, never write), label GUEST, 24 hour TTL. The plain key is returned once and is never logged, stored
// or placed in any other response. Keys live in this process only: a restart (or another instance) forgets them.
// METAMORPH_KEY_MINT=off disables the route.
import { randomBytes } from 'node:crypto';
import { registerRuntimeKey, runtimeKeyTable, sha256 } from './common/auth/keys.js';
import { clientIdOf } from './public-proxy.js';

export const MINT = { ttlMs: 24 * 3600_000, perHour: 3, maxActive: 300, maxBody: 1024 };
const GUEST = 'guest';

interface Req {
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
  body?: unknown;
}
interface Res {
  status(code: number): Res;
  setHeader(name: string, value: string): unknown;
  send(body: string): unknown;
}
export interface MintOptions {
  now?: () => number;
  env?: Record<string, string | undefined>;
}

export function createMinter(opts: MintOptions = {}) {
  const now = opts.now ?? Date.now;
  const hits = new Map<string, number[]>();

  function handle(req: Req, res: Res): void {
    const send = (status: number, body: unknown, extra: Record<string, string> = {}) => {
      res.status(status);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Referrer-Policy', 'no-referrer');
      for (const [k, v] of Object.entries(extra)) res.setHeader(k, v);
      res.send(JSON.stringify(body));
    };
    const len = Number(req.headers['content-length'] ?? 0);
    const bodyLen = req.body === undefined ? 0 : Buffer.byteLength(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
    if (len > MINT.maxBody || bodyLen > MINT.maxBody) return send(413, { error: 'Request too large. This endpoint needs no body.' });

    const t = now();
    const id = clientIdOf(req);
    const recent = (hits.get(id) ?? []).filter((h) => t - h < 3600_000);
    if (recent.length >= MINT.perHour) {
      const wait = Math.max(1, Math.ceil((3600_000 - (t - recent[0])) / 1000));
      hits.set(id, recent);
      return send(429, { error: `You can get ${MINT.perHour} keys an hour. Please try again in about ${Math.ceil(wait / 60)} minutes.` }, { 'Retry-After': String(wait) });
    }
    const guests = runtimeKeyTable(t).filter((k) => k.label === GUEST);
    if (guests.length >= MINT.maxActive) {
      const soonest = Math.min(...guests.map((k) => k.expires ?? t + MINT.ttlMs));
      const wait = Math.max(1, Math.ceil((soonest - t) / 1000));
      return send(429, { error: 'All guest keys are in use right now. Please try again later, or ask the owner for a key.' }, { 'Retry-After': String(wait) });
    }
    recent.push(t);
    hits.set(id, recent);
    if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((h) => t - h < 3600_000)) hits.delete(k);

    const key = 'sk_' + randomBytes(24).toString('base64url');
    const expires = t + MINT.ttlMs;
    registerRuntimeKey(GUEST, 'plan', sha256(key), expires);
    send(200, {
      key,
      scope: 'plan',
      expiresAt: new Date(expires).toISOString(),
      note: 'Shown once. Read and plan scope (no write). Valid 24 hours or until the server restarts; keys are kept in memory on this instance only.'
    });
  }
  return { handle };
}

export interface MintApp {
  post(path: string, handler: (req: never, res: never) => void): unknown;
}

// Returns whether the route was installed.
export function installKeyMint(app: MintApp, opts: MintOptions = {}): boolean {
  const env = opts.env ?? process.env;
  if ((env.METAMORPH_KEY_MINT ?? '').toLowerCase() === 'off') return false;
  const minter = createMinter(opts);
  app.post('/keys/mint', ((req: Req, res: Res) => {
    try {
      minter.handle(req, res);
    } catch {
      res.status(500);
      res.send('{"error":"Internal error."}');
    }
  }) as (req: never, res: never) => void);
  // Expired keys are also refused and dropped lazily on every guard lookup; this timer only frees memory when idle.
  setInterval(() => runtimeKeyTable(), 10 * 60_000).unref();
  return true;
}
