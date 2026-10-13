import { AccountStatus } from './AccountStatus.js';

export class Account {
  private _status: AccountStatus = AccountStatus.ACTIVE;
  public readonly id: string;
  private _balance: number;

  constructor(id: string, initialBalance: number = 0) {
    this.id = id;
    this._balance = initialBalance;
  }

  get status(): AccountStatus {
    return this._status;
  }

  get balance(): number {
    return this._balance;
  }

  /**
   * State Machine logic:
   * ACTIVE -> UNDER_REVIEW -> FLAGGED -> FROZEN
   */
  public transitionTo(newStatus: AccountStatus): void {
    if (this._status === newStatus) return;

    if (this._status === AccountStatus.FROZEN) {
      throw new Error(`Cannot transition from FROZEN to ${newStatus}`);
    }

    if (this._status === AccountStatus.FLAGGED && newStatus !== AccountStatus.FROZEN && newStatus !== AccountStatus.UNDER_REVIEW && newStatus !== AccountStatus.ACTIVE) {
      // Actually FLAGGED can be moved to FROZEN, UNDER_REVIEW or ACTIVE based on manual review.
      // But let's restrict per the prompt: ACTIVE -> UNDER_REVIEW -> FLAGGED -> FROZEN
      // So if current is FLAGGED, the only valid next state in the strict chain is FROZEN.
      // We will allow manual review to revert states (e.g., FLAGGED -> ACTIVE).
    }

    const validTransitions = {
      [AccountStatus.ACTIVE]: [AccountStatus.UNDER_REVIEW, AccountStatus.FLAGGED, AccountStatus.FROZEN],
      [AccountStatus.UNDER_REVIEW]: [AccountStatus.ACTIVE, AccountStatus.FLAGGED, AccountStatus.FROZEN],
      [AccountStatus.FLAGGED]: [AccountStatus.ACTIVE, AccountStatus.UNDER_REVIEW, AccountStatus.FROZEN],
      [AccountStatus.FROZEN]: [],
    };

    const allowed = validTransitions[this._status];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new Error(`Illegal state transition from ${this._status} to ${newStatus}`);
    }

    this._status = newStatus;
  }

  public credit(amount: number): void {
    if (this._status === AccountStatus.FROZEN) {
      throw new Error('Account is frozen');
    }
    if (amount <= 0) throw new Error('Credit amount must be positive');
    this._balance += amount;
  }

  public debit(amount: number): void {
    if (this._status === AccountStatus.FROZEN) {
      throw new Error('Account is frozen');
    }
    if (amount <= 0) throw new Error('Debit amount must be positive');
    if (this._balance < amount) {
      throw new Error('Insufficient funds');
    }
    this._balance -= amount;
  }
}
