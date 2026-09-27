import { Module } from '@nitrostack/core';
import { InvoiceTools } from '../../tools/invoice.tools.js';
import { ItemTools } from '../../tools/item.tools.js';
import { PartyTools } from '../../tools/party.tools.js';
import { NoteTools } from '../../tools/note.tools.js';
import { PaymentTools } from '../../tools/payment.tools.js';
import { BankingTools } from '../../tools/banking.tools.js';

@Module({
  name: 'alphatex_platform',
  description: 'AlphaTex ERP Complete Platform Modules (Invoices, Inventory, Parties, Credit/Debit Notes, Payments, Ledgers, Banking)',
  controllers: [
    InvoiceTools,
    ItemTools,
    PartyTools,
    NoteTools,
    PaymentTools,
    BankingTools,
  ],
})
export class InvoiceModule {}
