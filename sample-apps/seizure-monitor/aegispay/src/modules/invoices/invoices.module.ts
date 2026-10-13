import { Module } from '@nitrostack/core';
import { InvoicesTools } from './invoices.tools.js';
import { InvoicesService } from '../../services/invoices.service.js';

@Module({
  name: 'invoices',
  description: 'Invoice queue listing and payment batch drafting',
  controllers: [InvoicesTools],
  providers: [InvoicesService],
})
export class InvoicesModule {}
