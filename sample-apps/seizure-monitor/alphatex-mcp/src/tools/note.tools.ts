import { ToolDecorator as Tool, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { erpStore } from '../lib/erp-store.js';
import { round2, numberToWordsINR } from '../lib/erp-engine.js';

export const IssueNoteSchema = z.object({
  type: z.enum(['CREDIT', 'DEBIT']).describe('CREDIT for Sales Return / Rate Diff discount, DEBIT for Purchase Return / Extra billing'),
  partyName: z.string().describe('Customer or Supplier Name'),
  date: z.string().optional().describe('Date of Credit/Debit Note (YYYY-MM-DD)'),
  reason: z.string().describe('Reason for issuing note (e.g. Sales Return of Damaged Yarn, Rate Difference adjustment)'),
  amount: z.number().positive().describe('Taxable Amount in INR'),
  taxRatePct: z.number().min(0).max(100).optional().default(5).describe('GST Tax Rate percentage (5, 12, 18)'),
});

export const ListNotesSchema = z.object({
  typeFilter: z.enum(['CREDIT', 'DEBIT']).optional().describe('Filter by note type'),
});

@Injectable()
export class NoteTools {
  @Tool({
    name: 'issue_credit_or_debit_note',
    description: 'Issue a GST Credit Note (sales return / discount) or Debit Note (purchase return / debit charge) to a party.',
    inputSchema: IssueNoteSchema,
  })
  async issueNote(args: z.infer<typeof IssueNoteSchema>, ctx: ExecutionContext) {
    ctx.logger.info('Issuing note', { type: args.type, party: args.partyName });

    const taxAmount = round2((args.amount * args.taxRatePct) / 100);
    const totalAmount = round2(args.amount + taxAmount);
    const noteNo = `${args.type === 'CREDIT' ? 'CN' : 'DN'}-${Date.now().toString().slice(-6)}`;

    const newNote = erpStore.addNote({
      noteNo,
      type: args.type,
      partyName: args.partyName,
      date: args.date || new Date().toISOString().split('T')[0],
      reason: args.reason,
      amount: args.amount,
      taxRatePct: args.taxRatePct,
      totalAmount,
    });

    return {
      message: `${args.type === 'CREDIT' ? 'Credit Note' : 'Debit Note'} ${newNote.noteNo} issued successfully!`,
      note: newNote,
      taxAmount,
      totalAmount,
      amountInWords: numberToWordsINR(totalAmount),
    };
  }

  @Tool({
    name: 'list_notes',
    description: 'List issued Credit Notes and Debit Notes with reason, party name, tax amount, and total.',
    inputSchema: ListNotesSchema,
  })
  async listNotes(args: z.infer<typeof ListNotesSchema>, ctx: ExecutionContext) {
    const notes = erpStore.getNotes(args.typeFilter);
    return {
      totalNotes: notes.length,
      notes,
    };
  }
}
