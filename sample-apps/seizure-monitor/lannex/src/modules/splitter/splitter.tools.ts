import { ControllerDecorator as Controller, ToolDecorator as Tool, Injectable, ExecutionContext, z } from '@nitrostack/core';
import { SplitterService } from './splitter.service.js';

@Injectable({ deps: [SplitterService] })
@Controller('splitter')
export class SplitterTools {
  constructor(private readonly splitterService: SplitterService) {
    this.splitBill = this.splitBill.bind(this);
    this.createPaymentLink = this.createPaymentLink.bind(this);
    this.extractReceiptItems = this.extractReceiptItems.bind(this);
    this.extractAndSplitReceipt = this.extractAndSplitReceipt.bind(this);
    this.minimizeGroupSettlement = this.minimizeGroupSettlement.bind(this);
    this.parseReceiptText = this.parseReceiptText.bind(this);
  }

  @Tool({
    name: 'split_bill',
    description: 'Split a bill among multiple people proportionally, factoring in tax and tip.',
    inputSchema: z.object({
      items: z.array(
        z.object({
          name: z.string().describe('The name of the item'),
          price: z.number().describe('The price of the item'),
          person: z.string().describe('The person who ordered/consumed the item (can be a name, comma-separated names, or "shared" / "all")'),
          coveredBy: z.string().optional().describe('The person who paid for this item if it is meant to be shared but covered by someone else')
        })
      ).describe('List of items ordered'),
      tax: z.number().optional().default(0).describe('Total tax amount to split proportionally'),
      tip: z.number().optional().default(0).describe('Total tip amount to split proportionally'),
      payer: z.string().optional().default('me').describe('The name of the person who paid the bill (defaults to "me")')
    })
  })
  async splitBill(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Performing bill split tool invocation', {
      itemsCount: input.items?.length,
      tax: input.tax,
      tip: input.tip,
      payer: input.payer
    });

    const result = this.splitterService.splitBill(input.items, input.tax, input.tip, input.payer);
    return result;
  }

  @Tool({
    name: 'create_payment_link',
    description: 'Generate WhatsApp and UPI payment links to request a specific amount from a person.',
    inputSchema: z.object({
      person: z.string().describe('The name of the person who owes money'),
      amount: z.number().describe('The amount of money owed'),
      payee_vpa: z.string().optional().describe('Optional custom UPI handle (defaults to person@upi or env config)')
    })
  })
  async createPaymentLink(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Performing create payment link tool invocation', {
      person: input.person,
      amount: input.amount
    });

    const result = this.splitterService.createPaymentLink(input.person, input.amount, input.payee_vpa);
    return result;
  }

  @Tool({
    name: 'extract_receipt_items',
    description: 'Extract line items from a base64 encoded receipt image using vision/OCR.',
    inputSchema: z.object({
      file_name: z.string().describe('Name of the uploaded file'),
      file_type: z.string().describe('MIME type of the uploaded file'),
      file_content: z.string().describe('Base64 encoded file content'),
    })
  })
  async extractReceiptItems(input: any, ctx: ExecutionContext) {
    ctx.logger.info(`Extracting receipt items from ${input.file_name}`);
    return this.splitterService.extractReceiptItems(input.file_content, input.file_type, input.file_name);
  }

  @Tool({
    name: 'extract_and_split_receipt',
    description: 'Extract line items from a receipt image, assign them to people using an assignment prompt, and automatically split the bill to create real debt records.',
    inputSchema: z.object({
      file_content: z.string().describe('Base64 encoded file content'),
      file_type: z.string().describe('MIME type of the uploaded file'),
      file_name: z.string().describe('Name of the uploaded file'),
      assignment_prompt: z.string().describe('Freeform prompt describing item assignments (e.g. "Rahul had the biryani, Sarah had the pizza, we shared the coke")'),
      tax: z.number().optional().default(0).describe('Optional total tax amount'),
      tip: z.number().optional().default(0).describe('Optional total tip amount'),
      payer: z.string().optional().default('me').describe('The name of the person who paid the bill (defaults to "me")')
    })
  })
  async extractAndSplitReceipt(input: any, ctx: ExecutionContext) {
    ctx.logger.info(`Extracting and splitting receipt ${input.file_name} with assignment prompt`);
    return this.splitterService.extractAndSplitReceipt(
      input.file_content,
      input.file_type,
      input.file_name,
      input.assignment_prompt,
      input.tax,
      input.tip,
      input.payer
    );
  }

  @Tool({
    name: 'minimize_group_settlement',
    description: 'Compress a complex web of multi-friend group debts into the minimal number of direct settlements with payment links.',
    inputSchema: z.object({
      debts: z.array(
        z.object({
          from: z.string().describe('Name of the person who owes money'),
          to: z.string().describe('Name of the person who is owed money'),
          amount: z.number().positive().describe('The amount owed')
        })
      ).describe('List of raw individual cross-debts')
    })
  })
  async minimizeGroupSettlement(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Minimizing group settlement debts', { count: input.debts?.length });
    return this.splitterService.minimizeSettlement(input.debts);
  }

  @Tool({
    name: 'parse_receipt_text',
    description: 'Intelligently parse raw receipt text into structured line items, merchant name, tax, tip, and total.',
    inputSchema: z.object({
      raw_text: z.string().describe('The raw text or OCR output from a bill or receipt')
    })
  })
  async parseReceiptText(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Parsing receipt text input');
    return this.splitterService.parseReceiptText(input.raw_text);
  }
}

