import { Tool, Resource, ExecutionContext } from '@nitrostack/core';
import { z } from 'zod';
import { AccountAggregatorService } from './aa.service.js';
import { Injectable } from '@nitrostack/core';

@Injectable({ deps: [AccountAggregatorService] })
export class AccountAggregatorController {
  constructor(private readonly aaService: AccountAggregatorService) {}

  @Tool({
    name: 'connect_account',
    description: 'Securely connect to a bank account using Account Aggregator.',
    inputSchema: z.object({
      phoneNumber: z.string().describe('The user phone number'),
      bankId: z.string().describe('The bank identifier')
    }),
    examples: { request: { phoneNumber: '9876543210', bankId: 'HDFC' }, response: { status: 'connected', consentId: 'consent-9876543210-HDFC' } }
  })
  async connectAccount(input: { phoneNumber: string; bankId: string }, context: ExecutionContext) {
    return this.aaService.connectAccount(input.phoneNumber, input.bankId);
  }

  @Tool({
    name: 'fetch_transactions',
    description: 'Fetch transactions using an AA consent ID.',
    inputSchema: z.object({
      consentId: z.string().describe('The consent ID obtained from connect_account')
    }),
    examples: { request: { consentId: 'consent-123' }, response: [{ id: 'txn1', amount: 1500, type: 'credit', date: '2026-07-20' }] }
  })
  async fetchTransactions(input: { consentId: string }, context: ExecutionContext) {
    return this.aaService.fetchTransactions(input.consentId);
  }

  @Tool({
    name: 'fetch_bank_accounts',
    description: 'Fetch list of connected bank accounts.',
    inputSchema: z.object({
      consentId: z.string().describe('The consent ID')
    }),
    examples: { request: { consentId: 'consent-123' }, response: [{ accountId: 'acc1', bank: 'HDFC', type: 'SAVINGS' }] }
  })
  async fetchBankAccounts(input: { consentId: string }, context: ExecutionContext) {
    return this.aaService.fetchBankAccounts(input.consentId);
  }

  @Tool({
    name: 'fetch_cashflow',
    description: 'Fetch aggregated cashflow data.',
    inputSchema: z.object({
      consentId: z.string().describe('The consent ID')
    }),
    examples: { request: { consentId: 'consent-123' }, response: { inflow: 1500, outflow: 300, net: 1200 } }
  })
  async fetchCashflow(input: { consentId: string }, context: ExecutionContext) {
    return this.aaService.fetchCashflow(input.consentId);
  }

  @Tool({
    name: 'disconnect_account',
    description: 'Disconnect an AA consent.',
    inputSchema: z.object({
      consentId: z.string().describe('The consent ID')
    }),
    examples: { request: { consentId: 'consent-123' }, response: { success: true } }
  })
  async disconnectAccount(input: { consentId: string }, context: ExecutionContext) {
    const result = await this.aaService.disconnectAccount(input.consentId);
    return { success: result };
  }

  @Resource({
    uri: 'aa://transactions',
    name: 'AA Transactions Data',
    description: 'Recent aggregated transactions stream',
    mimeType: 'application/json'
  })
  async getTransactionsResource(context: ExecutionContext) {
    return [
      { id: 'txn1', amount: 1500, type: 'credit', date: '2026-07-20' },
      { id: 'txn2', amount: 300, type: 'debit', date: '2026-07-21' }
    ];
  }

  @Resource({
    uri: 'aa://cashflow',
    name: 'AA Cashflow Data',
    description: 'Aggregated cashflow summaries',
    mimeType: 'application/json'
  })
  async getCashflowResource(context: ExecutionContext) {
    return { inflow: 1500, outflow: 300, net: 1200 };
  }
}
