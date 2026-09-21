import { Module } from '@nitrostack/core';
import { DocumentTools } from './document.tools.js';

@Module({
  name: 'documents',
  description: 'Document Intelligence - analysis, summarization, keyword extraction, comparison',
  controllers: [DocumentTools],
})
export class DocumentsModule {}
