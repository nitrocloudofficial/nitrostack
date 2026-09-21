import { ToolDecorator as Tool, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { erpStore } from '../lib/erp-store.js';

export const AddBankSchema = z.object({
  bankName: z.string().describe('Bank Name (e.g. State Bank of India, HDFC Bank)'),
  accountNo: z.string().describe('Account Number'),
  ifsc: z.string().describe('IFSC Code (e.g. SBIN0001234)'),
  branch: z.string().optional().default('Main Branch').describe('Branch Name'),
  accountType: z.string().optional().default('Current Account').describe('Account Type'),
});

export const RecordChequeSchema = z.object({
  chequeNo: z.string().describe('6-digit Cheque Number (e.g. 004921)'),
  date: z.string().optional().describe('Cheque Date (YYYY-MM-DD)'),
  partyName: z.string().describe('Party / Payee Name'),
  amount: z.number().positive().describe('Cheque Amount in INR'),
  bankName: z.string().optional().default('State Bank of India').describe('Bank Name'),
  status: z.enum(['PENDING', 'CLEARED', 'BOUNCED']).optional().default('PENDING').describe('Clearing Status'),
  type: z.enum(['ISSUED', 'RECEIVED']).optional().default('ISSUED').describe('ISSUED to supplier or RECEIVED from customer'),
});

@Injectable()
export class BankingTools {
  @Tool({
    name: 'manage_bank_account',
    description: 'Add or list company bank accounts for cheque printing and NEFT transfers.',
    inputSchema: AddBankSchema,
  })
  async manageBank(args: z.infer<typeof AddBankSchema>, ctx: ExecutionContext) {
    const bank = erpStore.addBankAccount({
      bankName: args.bankName,
      accountNo: args.accountNo,
      ifsc: args.ifsc,
      branch: args.branch || 'Main Branch',
      accountType: args.accountType || 'Current Account',
    });

    return {
      message: `Bank account '${bank.bankName} (${bank.accountNo})' added!`,
      bank,
      allAccounts: erpStore.getBankAccounts(),
    };
  }

  @Tool({
    name: 'record_cheque',
    description: 'Record an issued or received cheque for printing or tracking clearing status.',
    inputSchema: RecordChequeSchema,
  })
  async recordCheque(args: z.infer<typeof RecordChequeSchema>, ctx: ExecutionContext) {
    const cheque = erpStore.recordCheque({
      chequeNo: args.chequeNo,
      date: args.date || new Date().toISOString().split('T')[0],
      partyName: args.partyName,
      amount: args.amount,
      bankName: args.bankName || 'State Bank of India',
      status: args.status || 'PENDING',
      type: args.type || 'ISSUED',
    });

    return {
      message: `Cheque #${cheque.chequeNo} recorded for ${cheque.partyName}!`,
      cheque,
    };
  }

  @Tool({
    name: 'get_cheque_register',
    description: 'View cheque register tracking all issued and received cheques and their clearing status.',
    inputSchema: z.object({}),
  })
  async getChequeRegister(args: {}, ctx: ExecutionContext) {
    const cheques = erpStore.getCheques();
    return {
      totalCheques: cheques.length,
      cheques,
    };
  }
}
