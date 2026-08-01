export class Transaction {
  readonly id: string;
  readonly accountId: string;
  readonly amount: number;
  readonly timestamp: Date;
  readonly payee: string;
  readonly type: 'CREDIT' | 'DEBIT';
  readonly location?: {
    latitude: number;
    longitude: number;
    country: string;
  };

  constructor(params: {
    id: string;
    accountId: string;
    amount: number;
    timestamp: Date;
    payee: string;
    type: 'CREDIT' | 'DEBIT';
    location?: { latitude: number; longitude: number; country: string };
  }) {
    this.id = params.id;
    this.accountId = params.accountId;
    this.amount = params.amount;
    this.timestamp = params.timestamp;
    this.payee = params.payee;
    this.type = params.type;
    this.location = params.location ? { ...params.location } : undefined;
    
    // Make the instance truly immutable
    Object.freeze(this.location);
    Object.freeze(this);
  }
}
