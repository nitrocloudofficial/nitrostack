import { Injectable } from '@nitrostack/core';
import { TrustContext } from '../shared/trust-context.interface.js';

@Injectable()
export class PostgresRepository {
  private mockDb: Map<string, TrustContext> = new Map();

  async saveTrustContext(context: TrustContext): Promise<void> {
    this.mockDb.set(context.transactionId, context);
    console.log(`[PostgreSQL] Saved TrustContext for transaction ${context.transactionId}`);
  }

  async getTrustContext(transactionId: string): Promise<TrustContext | undefined> {
    console.log(`[PostgreSQL] Fetching TrustContext for transaction ${transactionId}`);
    return this.mockDb.get(transactionId);
  }
}
