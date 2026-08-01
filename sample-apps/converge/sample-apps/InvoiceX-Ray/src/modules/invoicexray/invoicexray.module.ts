import { Module } from '@nitrostack/core';
import { InvoicexrayTools } from './invoicexray.tools.js';
import { InvoicexrayResources } from './invoicexray.resources.js';
import { InvoicexrayPrompts } from './invoicexray.prompts.js';

@Module({
  name: 'invoicexray',
  description: 'InvoiceX-Ray trade finance TBML compliance module',
  controllers: [InvoicexrayTools, InvoicexrayResources, InvoicexrayPrompts]
})
export class InvoicexrayModule {}
