import { Module } from '@nitrostack/core';
import { MasterDataModule } from '../master-data/master-data.module.js';
import { ValidationService } from '../orchestrator/validation.service.js';
import { ApInvoiceService } from './ap-invoice.service.js';
import { ApInvoiceTools } from './ap-invoice.tools.js';

@Module({
  name: 'ap-invoice',
  imports: [MasterDataModule],
  // ValidationService has no constructor deps — safe to provide here independently
  providers: [ValidationService, ApInvoiceService],
  controllers: [ApInvoiceTools], // MCP tool endpoints
  exports: [ApInvoiceService],
})
export class ApInvoiceModule {}
