import { Injectable } from '@nitrostack/core';
import { AccountAggregatorAuthService } from '../../services/aa-auth.service.js';

@Injectable({ deps: [AccountAggregatorAuthService] })
export class AccountAggregatorService {
  constructor(private readonly authService: AccountAggregatorAuthService) {}

  async connectAccount(phoneNumber: string, bankId: string): Promise<{ status: string; consentId: string }> {
    await this.authService.authenticate();
    return { status: 'connected', consentId: `consent-${phoneNumber}-${bankId}` };
  }

  async fetchTransactions(consentId: string): Promise<any[]> {
    return [
      { id: 'txn1', amount: 1500, type: 'credit', date: '2026-07-20' },
      { id: 'txn2', amount: 300, type: 'debit', date: '2026-07-21' }
    ];
  }

  async fetchBankAccounts(consentId: string): Promise<any[]> {
    return [
      { accountId: 'acc1', bank: 'HDFC', type: 'SAVINGS' }
    ];
  }

  async fetchCashflow(consentId: string): Promise<{ inflow: number; outflow: number; net: number }> {
    return { inflow: 1500, outflow: 300, net: 1200 };
  }

  async disconnectAccount(consentId: string): Promise<boolean> {
    return true;
  }
}
