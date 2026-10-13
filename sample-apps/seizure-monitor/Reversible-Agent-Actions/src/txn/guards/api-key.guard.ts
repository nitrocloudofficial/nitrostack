import { Injectable } from '@nitrostack/core';
import type { ExecutionContext, Guard } from '@nitrostack/core';
import { TxnError } from '../services/txn-error.js';

/**
 * Validates an API key passed via MCP request `_meta` (which IS forwarded
 * into ctx.metadata — confirmed in server.js's tool-call handler) against
 * process.env.API_KEY.
 *
 * ctx.auth is never populated by @nitrostack/core for any transport — there
 * is no framework-level request-authentication middleware wired into the MCP
 * tool-execution pipeline (checked: zero references to `.auth` in server.js).
 * An earlier version of this guard checked ctx.auth?.subject, which meant it
 * rejected every call unconditionally, authenticated or not. Callers must
 * pass `_meta: { apiKey }` alongside their normal tool arguments for this
 * guard to see it — same mechanism RollbackGuard uses for transactionId.
 *
 * NOT currently wired to any live @Tool (see transaction.tools.ts): no real
 * MCP client (NitroStudio, Claude Desktop, etc.) gives the calling agent a
 * way to set `_meta` on a tool call, so using this as a live @UseGuards
 * blocked every real caller unconditionally. The real HTTP-transport-level
 * gate is ApiKeyGateService. Kept here as intended per-call logic / for its
 * unit test.
 */
@Injectable()
export class ApiKeyGuard implements Guard {
  canActivate(context: ExecutionContext): boolean {
    const key = context.metadata?.apiKey;
    const expected = process.env.API_KEY;
    if (!expected || typeof key !== 'string' || key !== expected) {
      throw new TxnError('UNAUTHENTICATED', 'Missing or invalid API key');
    }
    return true;
  }
}
