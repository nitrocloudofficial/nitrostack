import { Module } from '@nitrostack/core';
import { SharedModule } from '../shared/shared.module.js';
import { VectorStoreService } from './vector-store.service.js';
import { FileStoreService } from './file-store.service.js';

/**
 * Database Module
 *
 * Provides persistent storage services:
 *  - VectorStoreService  — vector embeddings with cosine similarity search
 *  - FileStoreService    — structured JSON document storage
 */
@Module({
  name: 'database',
  description: 'Persistent storage layer (vectors + structured data)',
  imports: [SharedModule],
  providers: [VectorStoreService, FileStoreService],
  exports: [VectorStoreService, FileStoreService],
})
export class DatabaseModule {}
