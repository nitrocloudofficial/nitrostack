import { ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { FinanceStore, Transaction } from '../../services/finance-store.service.js';

function splitCsvRow(rowText: string): string[] {
  const cells: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < rowText.length; i++) {
    const char = rowText[i];
    if (char === '"' || char === "'") {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      cells.push(currentCell.trim().replace(/^["']|["']$/g, ''));
      currentCell = '';
    } else {
      currentCell += char;
    }
  }
  cells.push(currentCell.trim().replace(/^["']|["']$/g, ''));
  return cells;
}

export interface CsvParseResult {
  success: boolean;
  transactions: Omit<Transaction, 'id'>[];
  headers_found: string[];
  matched_columns: {
    date_col: string | null;
    desc_col: string | null;
    amount_col: string | null;
    type_col: string | null;
  };
  total_rows_parsed: number;
  skipped_rows_count: number;
  log_trace: string[];
}

export function parseCsvRobust(csvText: string): CsvParseResult {
  const trace: string[] = [];
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      success: false,
      transactions: [],
      headers_found: [],
      matched_columns: { date_col: null, desc_col: null, amount_col: null, type_col: null },
      total_rows_parsed: 0,
      skipped_rows_count: 0,
      log_trace: ['Empty CSV text provided.'],
    };
  }

  const headers = splitCsvRow(lines[0].toLowerCase());
  trace.push(`Headers found (${headers.length}): [${headers.join(', ')}]`);

  const dateIdx = headers.findIndex(
    (h) => h.includes('date') || h.includes('time') || h.includes('day') || h.includes('when')
  );
  const descIdx = headers.findIndex(
    (h) =>
      h.includes('desc') ||
      h.includes('narration') ||
      h.includes('particular') ||
      h.includes('details') ||
      h.includes('merchant') ||
      h.includes('title') ||
      h.includes('name') ||
      h.includes('item') ||
      h.includes('note') ||
      h.includes('payee')
  );

  const amtIdx = headers.findIndex(
    (h) =>
      h.includes('amt') ||
      h.includes('amount') ||
      h.includes('spent') ||
      h.includes('cost') ||
      h.includes('price') ||
      h.includes('value') ||
      h.includes('total') ||
      h.includes('sum')
  );

  const dirIdx = headers.findIndex(
    (h) =>
      h.includes('type') ||
      h.includes('dir') ||
      h.includes('cr/dr') ||
      h.includes('credit/debit') ||
      h.includes('mode') ||
      h.includes('category')
  );

  const debitIdx = headers.findIndex((h) => h.includes('debit') || h.includes('withdrawal') || h.includes('dr') || h.includes('out'));
  const creditIdx = headers.findIndex((h) => h.includes('credit') || h.includes('deposit') || h.includes('cr') || h.includes('in'));

  trace.push(
    `Matched Indices: Date=${dateIdx} (${dateIdx >= 0 ? headers[dateIdx] : 'NONE'}), Desc=${descIdx} (${
      descIdx >= 0 ? headers[descIdx] : 'NONE'
    }), Amount=${amtIdx} (${amtIdx >= 0 ? headers[amtIdx] : 'NONE'}), Type=${dirIdx} (${
      dirIdx >= 0 ? headers[dirIdx] : 'NONE'
    })`
  );

  const matchedColumns = {
    date_col: dateIdx >= 0 ? headers[dateIdx] : null,
    desc_col: descIdx >= 0 ? headers[descIdx] : null,
    amount_col: amtIdx >= 0 ? headers[amtIdx] : null,
    type_col: dirIdx >= 0 ? headers[dirIdx] : null,
  };

  const results: Omit<Transaction, 'id'>[] = [];
  let skippedCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const row = splitCsvRow(lines[i]);
    if (row.length < 2) {
      skippedCount++;
      continue;
    }

    const date = dateIdx >= 0 && row[dateIdx] ? row[dateIdx] : new Date().toISOString().slice(0, 10);
    const description = descIdx >= 0 && row[descIdx] ? row[descIdx] : `Transaction #${i}`;

    let amount = 0;
    let direction: 'debit' | 'credit' = 'debit';

    if (amtIdx >= 0 && row[amtIdx]) {
      const cleaned = row[amtIdx].replace(/[^0-9.-]/g, '');
      const parsedAmt = parseFloat(cleaned);
      if (!isNaN(parsedAmt)) {
        amount = Math.abs(parsedAmt);
        if (parsedAmt < 0) direction = 'debit';
      }
    } else if (debitIdx >= 0 && row[debitIdx]) {
      const parsedAmt = parseFloat(row[debitIdx].replace(/[^0-9.-]/g, ''));
      if (!isNaN(parsedAmt) && parsedAmt > 0) {
        amount = Math.abs(parsedAmt);
        direction = 'debit';
      }
    } else if (creditIdx >= 0 && row[creditIdx]) {
      const parsedAmt = parseFloat(row[creditIdx].replace(/[^0-9.-]/g, ''));
      if (!isNaN(parsedAmt) && parsedAmt > 0) {
        amount = Math.abs(parsedAmt);
        direction = 'credit';
      }
    }

    if (amount === 0) {
      for (let c = 0; c < row.length; c++) {
        if (c === dateIdx || c === descIdx) continue;
        const cleaned = row[c].replace(/[^0-9.-]/g, '');
        const num = parseFloat(cleaned);
        if (!isNaN(num) && num > 0) {
          amount = num;
          break;
        }
      }
    }

    if (dirIdx >= 0 && row[dirIdx]) {
      const val = row[dirIdx].toLowerCase();
      if (val.includes('cr') || val.includes('credit') || val.includes('income')) direction = 'credit';
      else if (val.includes('dr') || val.includes('debit') || val.includes('expense')) direction = 'debit';
    }

    if (amount > 0) {
      results.push({ date, description, amount, direction });
    } else {
      skippedCount++;
    }
  }

  return {
    success: results.length > 0,
    transactions: results,
    headers_found: headers,
    matched_columns: matchedColumns,
    total_rows_parsed: lines.length - 1,
    skipped_rows_count: skippedCount,
    log_trace: trace,
  };
}

@Injectable({ deps: [FinanceStore] })
export class IngestionTools {
  constructor(private store: FinanceStore) {}

  @Tool({
    name: 'ingest_and_manage_transactions',
    description:
      'Master Ingestion & Cashflow Engine — Ingest financial transactions via CSV statement upload (action: csv_upload), manual entry (action: manual_entry), set monthly income (action: set_income), or list stored records (action: list_transactions).',
    inputSchema: z.object({
      mode: z
        .enum(['csv_upload', 'manual_entry', 'set_income', 'list_transactions'])
        .default('csv_upload')
        .describe('Ingestion or cashflow management mode'),
      file_name: z.string().optional().describe('File name for CSV upload'),
      file_content: z.string().optional().describe('Base64-encoded or raw UTF-8 CSV text content'),
      date: z.string().optional().describe('YYYY-MM-DD for manual entry'),
      description: z.string().optional().describe('Description for manual entry'),
      amount: z.number().positive().optional().describe('Amount for manual entry'),
      direction: z.enum(['debit', 'credit']).optional().default('debit').describe('debit (expense) or credit (income)'),
      monthly_income: z.number().positive().optional().describe('Monthly income amount in rupees (for set_income mode)'),
    }),
  })
  async ingestAndManageTransactions(input: any, ctx: ExecutionContext) {
    const mode = input.mode || 'csv_upload';
    if (mode === 'set_income' || mode === 'list_transactions') {
      return this.manageTransactionsAndIncome(input, ctx);
    } else {
      return this.ingestTransactionData(input, ctx);
    }
  }

  async ingestTransactionData(input: any, ctx: ExecutionContext) {
    try {
      if (input.mode === 'csv_upload' || input.file_content) {
        if (!input.file_content) {
          return {
            success: false,
            error: 'Missing file_content parameter for mode: csv_upload.',
            transactions_added: 0,
          };
        }

        let csvText = input.file_content;

        if (!csvText.includes('\n') && !csvText.includes(',') && !csvText.includes('date')) {
          try {
            csvText = Buffer.from(input.file_content, 'base64').toString('utf-8');
          } catch (e) {
            // fallback
          }
        }

        ctx.logger.info('CSV Ingestion attempt', {
          file_name: input.file_name || 'statement.csv',
          raw_length: input.file_content.length,
          decoded_length: csvText.length,
        });

        const parseResult = parseCsvRobust(csvText);

        for (const t of parseResult.transactions) {
          this.store.addTransaction(t);
        }

        ctx.logger.info('CSV Ingestion result', {
          success: parseResult.success,
          added: parseResult.transactions.length,
          skipped: parseResult.skipped_rows_count,
        });

        if (parseResult.transactions.length === 0) {
          return {
            success: false,
            file_name: input.file_name || 'statement.csv',
            transactions_added: 0,
            skipped_rows: parseResult.skipped_rows_count,
            headers_detected: parseResult.headers_found,
            message:
              'CSV parsed, but 0 valid transactions were extracted. Please ensure the CSV contains column headers for Date, Description, and Amount.',
          };
        }

        return {
          success: true,
          file_name: input.file_name || 'statement.csv',
          transactions_added: parseResult.transactions.length,
          skipped_rows: parseResult.skipped_rows_count,
          headers_detected: parseResult.headers_found,
          matched_columns: parseResult.matched_columns,
          sample_transaction: parseResult.transactions[0],
          message: `Successfully ingested ${parseResult.transactions.length} transaction(s) from ${
            input.file_name || 'statement.csv'
          }.`,
        };
      } else {
        if (!input.date || !input.description || !input.amount) {
          return {
            success: false,
            error: 'date, description, and amount are required for mode: manual_entry.',
            transaction: null,
          };
        }

        const record = this.store.addTransaction({
          date: input.date,
          description: input.description,
          amount: input.amount,
          direction: input.direction || 'debit',
        });

        ctx.logger.info('Added manual expense', { id: record.id, amount: record.amount });

        return {
          success: true,
          message: `Successfully added manual transaction "${record.description}" for ₹${record.amount}.`,
          transaction: record,
        };
      }
    } catch (err: any) {
      ctx.logger.error('CSV Ingestion exception', { error: err.message, stack: err.stack });
      return {
        success: false,
        error: `CSV Ingestion Error: ${err.message}`,
        transactions_added: 0,
      };
    }
  }

  async manageTransactionsAndIncome(input: any, ctx: ExecutionContext) {
    if (input.mode === 'set_income') {
      if (!input.monthly_income) throw new Error('monthly_income is required for mode: set_income');
      this.store.setMonthlyIncome(input.monthly_income);
      ctx.logger.info('Set monthly income', { income: input.monthly_income });
      return { monthly_income: input.monthly_income };
    } else {
      const txns = this.store.listTransactions();
      const income = this.store.getMonthlyIncome();
      const sampleTxns = txns.slice(0, 3).map((t) => ({ date: t.date, description: t.description, amount: t.amount, category: t.category }));
      ctx.logger.info('Listed transactions', { count: txns.length });
      return { count: txns.length, monthly_income: income, sample_transactions: sampleTxns };
    }
  }

  // Programmatic helper methods
  async uploadBankStatementCsv(input: any, ctx: ExecutionContext) {
    return this.ingestTransactionData({ mode: 'csv_upload', ...input }, ctx);
  }

  async addManualExpense(input: any, ctx: ExecutionContext) {
    return this.ingestTransactionData({ mode: 'manual_entry', ...input }, ctx);
  }

  async setMonthlyIncome(input: any, ctx: ExecutionContext) {
    return this.manageTransactionsAndIncome({ mode: 'set_income', monthly_income: input.amount }, ctx);
  }

  async listTransactions(input: any, ctx: ExecutionContext) {
    return this.manageTransactionsAndIncome({ mode: 'list_transactions' }, ctx);
  }
}
