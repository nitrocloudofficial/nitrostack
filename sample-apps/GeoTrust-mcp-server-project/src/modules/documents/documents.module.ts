import { Module } from '@nitrostack/core';
import { DocumentsTools } from './documents.tools.js';
import { IdentityTools } from './identity.tools.js';
import { FinancialTools } from './financial.tools.js';
import { CaseStoreModule } from '../case-store/case-store.module.js';

@Module({
    name: 'documents',
    description: 'Identity + Financial Sub-agents — OCR extraction, PAN/GSTIN/Udyam validation, bank statement analysis, business vintage',
    imports: [CaseStoreModule],
    controllers: [DocumentsTools, IdentityTools, FinancialTools],
})
export class DocumentsModule { }
