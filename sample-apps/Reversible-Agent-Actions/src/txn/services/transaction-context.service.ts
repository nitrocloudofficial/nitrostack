import { Injectable } from '@nitrostack/core';

/**
 * Holds the active transaction id and scope for the current request, giving the
 * interceptor a way to know whether a tool call is happening inside a transaction.
 *
 * NOTE: @nitrostack/core's DI container has no per-request scoping today, so this
 * is registered as a regular singleton. Under concurrent requests it must be set
 * and cleared around each request (e.g. by a guard/middleware) rather than relied
 * on to isolate state between simultaneous transactions.
 */
@Injectable()
export class TransactionContext {
  activeId: string | null = null;
  activeScope: string[] = [];

  /** Marks a transaction as active for the current request. */
  setActive(txnId: string, scope: string[]): void {
    this.activeId = txnId;
    this.activeScope = scope;
  }

  /** Clears the active transaction, e.g. once the request completes. */
  clear(): void {
    this.activeId = null;
    this.activeScope = [];
  }

  /** Whether a server is permitted under the active scope (or scope is unrestricted). */
  scopeAllows(server?: string): boolean {
    if (this.activeScope.length === 0) return true;
    if (!server) return false;
    return this.activeScope.includes(server);
  }
}
