import { ToolDecorator as Tool, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { erpStore } from '../lib/erp-store.js';

export const RecordPaymentSchema = z.object({
  partyName: z.string().describe('Customer or Supplier Business Name'),
  amount: z.number().positive().describe('Payment Amount in INR'),
  date: z.string().optional().describe('Payment Date (YYYY-MM-DD)'),
  type: z.enum(['RECEIVED', 'PAID']).optional().default('RECEIVED').describe('RECEIVED from customer, PAID to supplier'),
  paymentMode: z.enum(['CASH', 'CHEQUE', 'UPI', 'NEFT']).optional().default('NEFT').describe('Payment Mode'),
  referenceNo: z.string().optional().describe('UTR / Transaction Reference No / Cheque No'),
  notes: z.string().optional().describe('Additional notes or bank remark'),
});

export const GetLedgerSchema = z.object({
  partyName: z.string().describe('Customer or Supplier Business Name'),
});

@Injectable()
export class PaymentTools {
  @Tool({
    name: 'record_payment',
    description: 'Record a payment received from customer or paid to supplier via Cash, UPI, Cheque, or NEFT.',
    inputSchema: RecordPaymentSchema,
  })
  async recordPayment(args: z.infer<typeof RecordPaymentSchema>, ctx: ExecutionContext) {
    ctx.logger.info('Recording payment', { party: args.partyName, amount: args.amount });

    const payment = erpStore.recordPayment({
      partyName: args.partyName,
      amount: args.amount,
      date: args.date || new Date().toISOString().split('T')[0],
      type: args.type || 'RECEIVED',
      paymentMode: args.paymentMode || 'NEFT',
      referenceNo: args.referenceNo || `REF-${Date.now().toString().slice(-6)}`,
      notes: args.notes || '',
    });

    const party = erpStore.getPartyByName(args.partyName);

    return {
      message: `Payment of ₹ ${args.amount.toLocaleString('en-IN')} ${args.type === 'RECEIVED' ? 'received from' : 'paid to'} ${args.partyName} recorded!`,
      payment,
      updatedCustomerBalance: party ? party.currentBalance : undefined,
    };
  }

  @Tool({
    name: 'get_customer_ledger',
    description: 'Get customer/supplier statement ledger including opening balance, payments, invoices, notes, and current balance.',
    inputSchema: GetLedgerSchema,
  })
  async getLedger(args: z.infer<typeof GetLedgerSchema>, ctx: ExecutionContext) {
    const party = erpStore.getPartyByName(args.partyName);

    if (!party) {
      return { error: `Party '${args.partyName}' was not found.` };
    }

    const partyPayments = erpStore.getPayments(args.partyName);

    return {
      party: {
        name: party.name,
        gstin: party.gstin,
        phone: party.phone,
        openingBalance: party.openingBalance,
        balanceType: party.balanceType,
        currentBalance: party.currentBalance,
      },
      paymentTransactions: partyPayments,
      summary: `Current outstanding balance for ${party.name} is ₹ ${party.currentBalance.toLocaleString('en-IN')}.`,
    };
  }
}
