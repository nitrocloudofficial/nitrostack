import { ControllerDecorator as Controller, ToolDecorator as Tool, z } from '@nitrostack/core';

@Controller('finance')
export class FinanceController {
  @Tool({
    name: 'calculate_tax',
    description: 'Calculate corporate or sales tax for a transaction amount',
    annotations: { readOnlyHint: true },
    inputSchema: z.object({
      amount: z.number().describe('Gross transaction amount'),
      region: z.string().describe('Jurisdiction or country code'),
    }),
  })
  async calculateTax(input: { amount: number; region: string }) {
    const rate = input.region === 'US' ? 0.08 : 0.2;
    return { gross: input.amount, tax: input.amount * rate, net: input.amount * (1 + rate) };
  }

  @Tool({
    name: 'process_payroll',
    description: 'Execute automated payroll disbursement for employees',
    annotations: { destructiveHint: true },
    inputSchema: z.object({
      period: z.string().describe('Pay period e.g. 2026-Q1'),
    }),
  })
  async processPayroll(input: { period: string }) {
    return { status: 'processed', period: input.period, totalDisbursed: 125000 };
  }

  @Tool({
    name: 'generate_invoice',
    description: 'Create and issue a customer billing invoice',
    inputSchema: z.object({
      customerId: z.string().describe('Target customer identifier'),
      total: z.number().describe('Invoice balance due'),
    }),
  })
  async generateInvoice(input: { customerId: string; total: number }) {
    return { invoiceId: `inv-${Date.now()}`, customerId: input.customerId, total: input.total };
  }

  @Tool({
    name: 'get_financial_summary',
    description: 'Retrieve balance sheet and quarterly earnings metrics',
    annotations: { readOnlyHint: true },
    inputSchema: z.object({
      fiscalYear: z.number().describe('Fiscal reporting year'),
    }),
  })
  async getFinancialSummary(input: { fiscalYear: number }) {
    return { year: input.fiscalYear, revenue: 12000000, profit: 3400000 };
  }

  @Tool({
    name: 'audit_ledger',
    description: 'Verify general ledger entries against transaction logs',
    annotations: { readOnlyHint: true },
    inputSchema: z.object({
      accountNumber: z.string().describe('General ledger account'),
    }),
  })
  async auditLedger(input: { accountNumber: string }) {
    return { account: input.accountNumber, reconciled: true, discrepancies: 0 };
  }
}
