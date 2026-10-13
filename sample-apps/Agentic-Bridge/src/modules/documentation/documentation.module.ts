import { Module } from '@nitrostack/core';
import { DocumentationTools } from './documentation.tools.js';
import { DocumentationService } from './documentation.service.js';

@Module({
  name: 'documentation',
  description: 'Documentation Synthesizer — dependency inventory and internal wiki extraction',
  controllers: [DocumentationTools],
  providers: [DocumentationService],
  exports: [DocumentationService],
})
export class DocumentationModule {}
