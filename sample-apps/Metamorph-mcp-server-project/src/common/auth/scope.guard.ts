import { Guard, ExecutionContext } from '@nitrostack/core';
import { ANON_KEY_ID, authorize, extractKey, parseKeyTable, runtimeKeyTable, Scope } from './keys.js';

// Usage: @UseGuards(scopeGuard('write')). Keys come from METAMORPH_KEY_* env vars, read once at first use.
let table: ReturnType<typeof parseKeyTable> | undefined;
const keys = () => [...(table ??= parseKeyTable(process.env)), ...runtimeKeyTable()];

export function scopeGuard(required: Scope) {
  return class ScopeGuard implements Guard {
    async canActivate(context: ExecutionContext): Promise<boolean> {
      // Local STDIO has no HTTP headers. METAMORPH_AUTH=off is for local development ONLY; never set it on a deployed host.
      if (process.env.METAMORPH_AUTH === 'off') {
        context.auth = { subject: ANON_KEY_ID, scopes: [required], claims: { keyId: ANON_KEY_ID } } as typeof context.auth;
        return true;
      }
      const result = authorize(extractKey(context.metadata as Record<string, unknown> | undefined), required, keys());
      if (!result.ok) {
        context.logger.warn('auth denied', { tool: context.toolName ?? '', status: result.status, required });
        throw new Error(`${result.status}: ${result.message}`);
      }
      // keyId: short non-secret id of the matched key entry (never the key or its hash); tools use it to bind downloads.
      context.auth = { subject: result.label, scopes: [result.scope], claims: { keyId: result.keyId } } as typeof context.auth;
      return true;
    }
  };
}

// The key id the guard recorded for this request: 'anon' when auth is off, the matched key's short id otherwise.
// Throws when auth is on but no id is present, so a report is never created without an owner.
export function requestKeyId(context: Pick<ExecutionContext, 'auth'>): string {
  if (process.env.METAMORPH_AUTH === 'off') return ANON_KEY_ID;
  const id = context.auth?.claims?.keyId;
  if (typeof id !== 'string' || !/^[a-f0-9]{12}$/.test(id)) throw new Error('401: could not identify the requesting API key.');
  return id;
}
