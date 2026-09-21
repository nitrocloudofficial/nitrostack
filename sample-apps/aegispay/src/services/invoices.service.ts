// invoices.service.ts — Invoice queue reads and payment-batch drafting.
//
// All logic lives here; tools are thin wrappers (CLAUDE.md rule 7).
// Mutates the in-memory `invoices` fixture array in place — there is no
// database in this project (CLAUDE.md §1).

import { Injectable } from '@nitrostack/core';
import { randomUUID } from 'node:crypto';
import { invoices } from './ledger.fixtures.js';
import type { Invoice, PaymentDraft } from '../types/contracts.js';

export interface ListPendingFilter {
  vendorId?: string;
  limit?: number;
}

const DEFAULT_LIST_LIMIT = 20;

@Injectable()
export class InvoicesService {
  private drafts = new Map<string, PaymentDraft>();

  listPending(filter: ListPendingFilter = {}): Invoice[] {
    const limit = filter.limit ?? DEFAULT_LIST_LIMIT;

    return invoices
      .filter((inv) => inv.status === 'pending')
      .filter((inv) => !filter.vendorId || inv.vendorId === filter.vendorId)
      .sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt))
      .slice(0, limit);
  }

  draftBatch(invoiceIds: string[], createdBy: string): PaymentDraft {
    const matched: Invoice[] = [];
    const failures: string[] = [];

    for (const id of invoiceIds) {
      const invoice = invoices.find((inv) => inv.id === id);
      if (!invoice) {
        failures.push(`${id}: not found`);
        continue;
      }
      if (invoice.status !== 'pending') {
        failures.push(`${id}: status is "${invoice.status}", expected "pending"`);
        continue;
      }
      matched.push(invoice);
    }

    if (failures.length > 0) {
      throw new Error(`Cannot draft payment batch — invalid invoice(s): ${failures.join('; ')}`);
    }

    const total = matched.reduce((sum, inv) => sum + inv.amount, 0);
    const draftId = `draft-${randomUUID()}`;

    for (const invoice of matched) {
      invoice.status = 'drafted';
    }

    const draft: PaymentDraft = {
      draftId,
      invoiceIds: matched.map((inv) => inv.id),
      total,
      createdBy,
      createdAt: new Date().toISOString(),
    };

    this.drafts.set(draftId, draft);

    return draft;
  }

  getDraft(draftId: string): PaymentDraft | undefined {
    return this.drafts.get(draftId);
  }
}
