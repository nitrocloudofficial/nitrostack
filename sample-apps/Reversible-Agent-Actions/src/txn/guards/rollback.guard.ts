import { Injectable } from '@nitrostack/core';
import type { ExecutionContext, Guard } from '@nitrostack/core';
import { TransactionService } from '../services/transaction.service.js';
import { TxnError } from '../services/txn-error.js';

/**
 * Authorizes rollback_transaction: only the transaction's own actor, or a caller
 * with the 'operator' role, may reverse it.
 *
 * @nitrostack/core guards receive only ExecutionContext — never the tool's input
 * (confirmed in server.js: args and context are passed separately to
 * tool.execute(args, context), and only context reaches canActivate). So this
 * guard reads transactionId from MCP request `_meta` (which IS forwarded into
 * ctx.metadata) rather than the tool's normal input schema. Callers of
 * rollback_transaction must pass `_meta: { transactionId }` alongside the usual
 * arguments for this guard to see which transaction is being targeted.
 *
 * NOT currently wired to any live @Tool (see transaction.tools.ts): no real
 * MCP client can set `_meta` on a tool call, and ctx.auth is never populated
 * by @nitrostack/core for any transport, so this guard was permanently
 * unreachable in a passable state through real usage. Kept as intended
 * per-call authorization logic and covered by its own unit test
 * (fixtures/acceptance-tests.ts TEST 7).
 */
@Injectable()
export class RollbackGuard implements Guard {
  // @nitrostack/core falls back to `new GuardClass()` (zero args) when a guard
  // isn't registered in the DI container, so this can't declare a typed
  // constructor parameter without breaking GuardConstructor's assignability.
  private readonly txns = new TransactionService();

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const transactionId = ctx.metadata?.transactionId;
    if (typeof transactionId !== 'string') {
      throw new TxnError('ROLLBACK_FORBIDDEN', 'Missing transactionId in request metadata (_meta.transactionId)');
    }

    const txn = this.txns.get(transactionId);
    const subj = ctx.auth?.subject;
    const roles: string[] = (ctx.auth?.claims?.roles as string[] | undefined) ?? [];

    if (txn.actor === subj) return true; // you may reverse your own work
    if (roles.includes('operator')) return true; // operators may reverse anyone's

    ctx.logger.warn('Rollback denied', { txnId: txn.id, subject: subj });
    throw new TxnError('ROLLBACK_FORBIDDEN');
  }
}
