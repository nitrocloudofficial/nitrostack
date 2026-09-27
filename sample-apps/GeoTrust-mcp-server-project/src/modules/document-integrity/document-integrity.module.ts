import { Module } from '@nitrostack/core';
import { DocumentIntegrityTools } from './document-integrity.tools.js';
import { CaseStoreModule } from '../case-store/case-store.module.js';

@Module({
    name: 'document-integrity',
    description: 'Document Integrity Sub-agent — tampering detection, hash deduplication, format validation',
    imports: [CaseStoreModule],
    controllers: [DocumentIntegrityTools],
})
export class DocumentIntegrityModule {}
