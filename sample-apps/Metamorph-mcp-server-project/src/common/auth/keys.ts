import { createHash, timingSafeEqual } from 'node:crypto';

// API keys carry a cumulative scope: write includes plan includes read (docs/SCHEMA.md).
export type Scope = 'read' | 'plan' | 'write';
const RANK: Record<Scope, number> = { read: 1, plan: 2, write: 3 };

export interface KeyEntry {
  label: string;
  scope: Scope;
  hash: Buffer; // sha256 of the key; the plain key is never stored
  expires?: number; // runtime keys only: epoch ms after which the key is refused and purged
}

export const sha256 = (value: string): Buffer => createHash('sha256').update(value).digest();

// Fixed id used when METAMORPH_AUTH=off (local development): there is no key to identify.
export const ANON_KEY_ID = 'anon';

// Short, non-secret identifier of a key entry: the first 12 hex characters of SHA-256 over a domain prefix and the
// stored key hash. It is one-way (the stored hash is not recoverable from it, and the key is not recoverable from the
// hash), so it is safe in signed download links and logs. Used to bind report downloads to the requesting key.
export function keyIdOf(entry: Pick<KeyEntry, 'hash'>): string {
  return createHash('sha256').update('metamorph-keyid.').update(entry.hash).digest('hex').slice(0, 12);
}

// Env format: METAMORPH_KEY_<LABEL>=<scope>:<sha256 hex of the key>
// ponytail: keys live in host env vars; revoking means removing the variable and redeploying.
export function parseKeyTable(env: Record<string, string | undefined>): KeyEntry[] {
  const out: KeyEntry[] = [];
  for (const [name, raw] of Object.entries(env)) {
    const m = /^METAMORPH_KEY_([A-Z0-9_]{1,32})$/.exec(name);
    if (!m || !raw) continue;
    const [scope, hex] = raw.split(':');
    if (!(scope in RANK) || !/^[0-9a-f]{64}$/.test(hex ?? '')) continue; // skip malformed entries silently
    out.push({ label: m[1].toLowerCase(), scope: scope as Scope, hash: Buffer.from(hex, 'hex') });
  }
  return out;
}

// Runtime-only keys (the ephemeral public dashboard key). Held in memory, consulted by the guard next to the env table.
const runtimeKeys: KeyEntry[] = [];
export function registerRuntimeKey(label: string, scope: Scope, hash: Buffer, expires?: number): void {
  runtimeKeys.push({ label: label.toLowerCase(), scope, hash, expires });
}
// Drops expired runtime keys (lazily, on every read) and returns the live ones.
export function runtimeKeyTable(now: number = Date.now()): KeyEntry[] {
  for (let i = runtimeKeys.length - 1; i >= 0; i--) {
    const e = runtimeKeys[i].expires;
    if (e !== undefined && e <= now) runtimeKeys.splice(i, 1);
  }
  return runtimeKeys;
}
export function clearRuntimeKeys(): void {
  runtimeKeys.length = 0;
}

export function extractKey(metadata: Record<string, unknown> | undefined): string | undefined {
  if (!metadata) return undefined;
  const bearer = metadata['authorization'] ?? metadata['Authorization'];
  if (typeof bearer === 'string' && /^Bearer\s+\S{8,512}$/i.test(bearer)) return bearer.replace(/^Bearer\s+/i, '');
  const direct = metadata['x-api-key'] ?? metadata['apiKey'];
  return typeof direct === 'string' && direct.length >= 8 && direct.length <= 512 ? direct : undefined;
}

export type AuthResult =
  | { ok: true; label: string; scope: Scope; keyId: string }
  | { ok: false; status: 401 | 403; message: string };

export function authorize(key: string | undefined, required: Scope, table: KeyEntry[]): AuthResult {
  if (!key) {
    return { ok: false, status: 401, message: 'Missing API key. Send it as "Authorization: Bearer <key>" or "x-api-key: <key>". Ask the server owner for a key.' };
  }
  const presented = sha256(key);
  let match: KeyEntry | undefined;
  for (const entry of table) {
    // compare every entry so timing does not reveal which one matched
    if (timingSafeEqual(presented, entry.hash) && !match) match = entry;
  }
  if (!match) return { ok: false, status: 401, message: 'Invalid API key. Check the key or ask the server owner for a new one.' };
  if (RANK[match.scope] < RANK[required]) {
    return { ok: false, status: 403, message: `This tool needs "${required}" scope but this key has "${match.scope}". Ask the owner for a key with "${required}" scope.` };
  }
  return { ok: true, label: match.label, scope: match.scope, keyId: keyIdOf(match) };
}
