import { Module } from '@nitrostack/core';
import { SharedModule } from '../../shared/shared.module.js';
import { DatabaseModule } from '../../database/database.module.js';
import { DocumentService } from './document.service.js';
import { DocumentTools } from './document.tools.js';

/**
 * Document & Knowledge Management Module
 *
 * Provides storage, semantic vector search, and lookup for documentation, specs, and guides.
 */
@Module({
  name: 'documents',
  description: 'Project documentation and knowledge management module',
  imports: [SharedModule, DatabaseModule],
  providers: [DocumentService],
  controllers: [DocumentTools],
  exports: [DocumentService],
})
export class DocumentModule {}
