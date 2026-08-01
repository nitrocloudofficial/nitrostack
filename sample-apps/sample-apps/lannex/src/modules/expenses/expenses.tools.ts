import { ControllerDecorator as Controller, ToolDecorator as Tool, Injectable, ExecutionContext, z, OnEvent } from '@nitrostack/core';
import { ExpensesService } from './expenses.service.js';
import * as fs from 'fs';
import * as path from 'path';

function decodeBase64File(content: string): Buffer {
  const matches = content.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    return Buffer.from(matches[2], 'base64');
  } else {
    return Buffer.from(content, 'base64');
  }
}

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

@Injectable({ deps: [ExpensesService] })
@Controller('expenses')
export class ExpensesTools {
  constructor(private readonly expensesService: ExpensesService) {
    this.logTransaction = this.logTransaction.bind(this);
    this.getSpendingSummary = this.getSpendingSummary.bind(this);
    this.detectZombieSubscriptions = this.detectZombieSubscriptions.bind(this);
    this.uploadReceipt = this.uploadReceipt.bind(this);
    this.getRecentTransactions = this.getRecentTransactions.bind(this);
    this.getIncomeVsOutgoing = this.getIncomeVsOutgoing.bind(this);
    this.parseTransactionMessage = this.parseTransactionMessage.bind(this);
  }

  @Tool({
    name: 'log_transaction',
    description: 'Log a new expense or income transaction',
    inputSchema: z.object({
      amount: z.number().min(0.01, 'Amount must be greater than zero').describe('Transaction amount in rupees (must be positive)'),
      merchant: z.string().min(1, 'Merchant name cannot be empty').describe('Merchant or vendor name'),
      category: z.string().min(1, 'Category cannot be empty').describe('Expense category (groceries, coffee, transport, entertainment, shopping, dining, utilities, healthcare, other)'),
      timestamp: z.string().min(1, 'Timestamp cannot be empty').describe('ISO 8601 timestamp of transaction (e.g., 2026-07-25T12:00:00Z)'),
      type: z.enum(['expense', 'income']).optional().default('expense').describe('Transaction type: expense (money out) or income (money in)')
    })
  })
  async logTransaction(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Logging transaction', {
      merchant: input.merchant,
      amount: input.amount,
      type: input.type
    });

    const transaction = this.expensesService.addTransaction({
      amount: input.amount,
      merchant: input.merchant,
      category: input.category,
      timestamp: input.timestamp,
      type: input.type || 'expense'
    });

    return {
      success: true,
      transaction,
      message: `Logged ${input.type === 'income' ? 'income' : 'expense'}: ₹${input.amount} at ${input.merchant}`
    };
  }

  @Tool({
    name: 'get_spending_summary',
    description: 'Get spending summary breakdown by category for a timeframe',
    inputSchema: z.object({
      timeframe: z.enum(['week', 'month']).describe('Timeframe for summary: week or month')
    })
  })
  async getSpendingSummary(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Fetching spending summary', {
      timeframe: input.timeframe
    });

    const summary = await this.expensesService.getSummary(input.timeframe);

    return {
      timeframe: input.timeframe,
      ...summary
    };
  }

  @Tool({
    name: 'detect_zombie_subscriptions',
    description: 'Detect recurring monthly subscriptions, annual financial drain, and flag duplicate or zombie subscription waste.',
    inputSchema: z.object({})
  })
  async detectZombieSubscriptions(_input: Record<string, never>, ctx: ExecutionContext) {
    ctx.logger.info('Detecting zombie subscriptions');
    return this.expensesService.detectSubscriptions();
  }

  @OnEvent('sms.received')
  async handleSmsReceived(payload: { text: string, parsed: { amount: number, merchant: string, type: 'expense' | 'income' } }) {
    const { amount, merchant, type } = payload.parsed;
    if (amount > 0) {
      this.expensesService.addTransaction({
        amount,
        merchant: merchant || 'Unknown Merchant',
        category: 'other',
        timestamp: new Date().toISOString(),
        type
      });
    }
  }

  @Tool({
    name: 'upload_receipt',
    description: 'Upload a receipt image for scanning and expense logging.',
    inputSchema: z.object({
      file_name: z.string().describe('Name of the uploaded file'),
      file_type: z.string().describe('MIME type of the uploaded file'),
      file_content: z.string().describe('Base64 encoded file content'),
    })
  })
  async uploadReceipt(input: any, ctx: ExecutionContext) {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    const safeName = path.basename(input.file_name);
    const filePath = path.join(UPLOAD_DIR, safeName);
    
    if (!filePath.startsWith(UPLOAD_DIR)) {
      throw new Error('Invalid file path detected.');
    }

    const buffer = decodeBase64File(input.file_content);
    fs.writeFileSync(filePath, buffer);

    ctx.logger.info(`Successfully saved receipt: ${safeName}`);
    return { success: true, filePath };
  }

  @Tool({
    name: 'scan_receipt_vision',
    description: 'Reads an uploaded receipt image from disk so you can use your vision capabilities to analyze it. You MUST call this to see the receipt!',
    inputSchema: z.object({
      file_path: z.string().describe('The absolute path to the uploaded receipt image')
    })
  })
  async scanReceiptVision(input: { file_path: string }, ctx: ExecutionContext) {
    if (!fs.existsSync(input.file_path)) {
      throw new Error('File not found');
    }
    const buffer = fs.readFileSync(input.file_path);
    const base64 = buffer.toString('base64');
    
    return [
      {
        type: 'text',
        text: 'Here is the receipt image. Please extract the merchant, amount, category, and date.'
      },
      {
        type: 'image',
        data: base64,
        mimeType: 'image/jpeg'
      }
    ];
  }

  @Tool({
    name: 'get_recent_transactions',
    description: 'Get the most recent transactions, sorted newest first.',
    inputSchema: z.object({
      limit: z.number().int().min(1).max(100).optional().default(10).describe('Maximum number of transactions to return (1-100, default 10)')
    })
  })
  async getRecentTransactions(input: { limit?: number }, ctx: ExecutionContext) {
    const limit = input.limit ?? 10;
    ctx.logger.info('Fetching recent transactions', { limit });

    const transactions = await this.expensesService.getRecentTransactions(limit);

    return {
      success: true,
      count: transactions.length,
      transactions
    };
  }

  @Tool({
    name: 'get_income_vs_outgoing',
    description: 'Get total incoming vs outgoing money for a timeframe, with net cash flow.',
    inputSchema: z.object({
      timeframe: z.enum(['week', 'month']).describe('Timeframe for analysis: week or month')
    })
  })
  async getIncomeVsOutgoing(input: { timeframe: 'week' | 'month' }, ctx: ExecutionContext) {
    ctx.logger.info('Fetching income vs outgoing', { timeframe: input.timeframe });

    const result = this.expensesService.getIncomeVsOutgoing(input.timeframe);

    return {
      success: true,
      timeframe: input.timeframe,
      ...result
    };
  }

  @Tool({
    name: 'parse_transaction_message',
    description: 'Parse a forwarded bank/UPI SMS message to extract transaction details (amount, merchant/counterparty, direction). If it looks like a peer-to-peer transfer rather than a merchant transaction, flags it as a potential debt entry.',
    inputSchema: z.object({
      message_text: z.string().min(1).describe('The raw SMS or bank notification text to parse')
    })
  })
  async parseTransactionMessage(input: { message_text: string }, ctx: ExecutionContext) {
    ctx.logger.info('Parsing transaction message');

    const text = input.message_text;

    // Extract amount - look for patterns like ₹1,234.56, Rs.1234, INR 1234, etc.
    const amountPatterns = [
      /(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)/i,
      /(?:amount|amt)[:\s]*(?:₹|Rs\.?|INR)?\s*([\d,]+(?:\.\d{1,2})?)/i,
      /([\d,]+(?:\.\d{1,2})?)\s*(?:₹|Rs\.?|INR|rupees)/i
    ];

    let amount: number | null = null;
    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match) {
        amount = parseFloat(match[1].replace(/,/g, ''));
        break;
      }
    }

    // Determine direction - credited = income, debited = expense
    const creditPatterns = /(?:credited|received|deposited|refund|cashback|cr\b)/i;
    const debitPatterns = /(?:debited|paid|sent|withdrawn|spent|purchase|dr\b)/i;

    let direction: 'income' | 'expense' = 'expense';
    if (creditPatterns.test(text)) {
      direction = 'income';
    } else if (debitPatterns.test(text)) {
      direction = 'expense';
    }

    // Extract merchant/counterparty
    const merchantPatterns = [
      /(?:to|at|from|paid to|received from|transferred to|sent to)\s+([A-Za-z0-9\s&'-]+?)(?:\s+(?:on|via|ref|upi|a\/c|account|for|\d|$))/i,
      /(?:VPA|UPI)[:\s]*([a-zA-Z0-9@._-]+)/i,
      /(?:ref|txn|transaction)[:\s#]*\d+[^\n]*?(?:to|from|at)\s+([A-Za-z0-9\s&'-]+)/i
    ];

    let merchant: string | null = null;
    for (const pattern of merchantPatterns) {
      const match = text.match(pattern);
      if (match) {
        merchant = match[1].trim();
        break;
      }
    }

    // Check if this looks like a peer-to-peer transfer (friend name rather than merchant)
    const p2pIndicators = /(?:sent to|received from|paid to|transferred to)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:\s|$)/i;
    const merchantIndicators = /(?:pvt|ltd|llp|inc|corp|store|shop|mart|restaurant|cafe|hotel|airways|telecom|recharge|bill|payment|services)/i;

    const looksLikeP2P = p2pIndicators.test(text) && !merchantIndicators.test(text);

    // If we couldn't extract enough info, return parsing failure
    if (amount === null) {
      return {
        success: false,
        parsed: false,
        message: 'Could not extract transaction amount from the message.',
        rawText: text
      };
    }

    // If it looks like a P2P transfer, flag it as a potential debt
    if (looksLikeP2P && merchant) {
      return {
        success: true,
        parsed: true,
        isDebtCandidate: true,
        amount,
        counterparty: merchant,
        direction,
        message: `This looks like a peer-to-peer transfer ${direction === 'income' ? 'from' : 'to'} "${merchant}". Consider logging this via debts.add_debt instead of as a regular expense.`,
        suggestedDebtType: direction === 'income' ? 'i_owe' : 'owe_me',
        rawText: text
      };
    }

    // Log as regular transaction
    const transaction = this.expensesService.addTransaction({
      amount,
      merchant: merchant || 'Unknown Merchant',
      category: 'other',
      timestamp: new Date().toISOString(),
      type: direction
    });

    return {
      success: true,
      parsed: true,
      isDebtCandidate: false,
      transaction,
      message: `Logged ${direction}: ₹${amount} at ${merchant || 'Unknown Merchant'}`
    };
  }
}

