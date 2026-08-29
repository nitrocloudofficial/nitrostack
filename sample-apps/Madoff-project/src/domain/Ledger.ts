import { Account } from './Account.js';
import { Transaction } from './Transaction.js';
import { Mutex } from '../utils/Mutex.js';
import { AccountStatus } from './AccountStatus.js';
import { Injectable } from '@nitrostack/core';

@Injectable({ deps: [] })
export class Ledger {
  private accounts: Map<string, Account> = new Map();
  private transactions: Map<string, Transaction> = new Map();
  
  // Per-account mutex to allow concurrent transactions on different accounts
  private accountLocks: Map<string, Mutex> = new Map();

  private getAccountLock(accountId: string): Mutex {
    if (!this.accountLocks.has(accountId)) {
      this.accountLocks.set(accountId, new Mutex());
    }
    return this.accountLocks.get(accountId)!;
  }

  public getAccount(accountId: string): Account | undefined {
    return this.accounts.get(accountId);
  }

  public registerAccount(account: Account): void {
    if (this.accounts.has(account.id)) {
      throw new Error(`Account ${account.id} already exists`);
    }
    this.accounts.set(account.id, account);
  }

  public async processTransaction(transaction: Transaction): Promise<void> {
    const lock = this.getAccountLock(transaction.accountId);

    return lock.runExclusive(async () => {
      const account = this.accounts.get(transaction.accountId);
      if (!account) {
        throw new Error(`Account ${transaction.accountId} not found`);
      }

      if (this.transactions.has(transaction.id)) {
        throw new Error(`Transaction ${transaction.id} already processed`);
      }

      if (transaction.type === 'CREDIT') {
        account.credit(transaction.amount);
      } else {
        account.debit(transaction.amount);
      }

      this.transactions.set(transaction.id, transaction);
    });
  }

  public getTransactions(accountId: string): Transaction[] {
    return Array.from(this.transactions.values())
      .filter(t => t.accountId === accountId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  public async updateAccountStatus(accountId: string, newStatus: AccountStatus): Promise<void> {
    const lock = this.getAccountLock(accountId);
    return lock.runExclusive(async () => {
      const account = this.accounts.get(accountId);
      if (!account) {
        throw new Error(`Account ${accountId} not found`);
      }
      account.transitionTo(newStatus);
    });
  }
}
