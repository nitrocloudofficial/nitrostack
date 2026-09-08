import { randomUUID } from 'crypto';
import { Injectable } from '@nitrostack/core';
import type { AuditEntry } from '../types/index.js';
import {
  DataLoaderService,
  KnowledgeInputError,
} from './data-loader.service.js';

@Injectable({ deps: [DataLoaderService] })
export class AuditService {
  constructor(private readonly dataLoader: DataLoaderService) {}

  recordEntry(entry: Omit<AuditEntry, 'id' | 'timestamp'>): AuditEntry {
    const audit: AuditEntry = {
      ...entry,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
    };
    const log = [...this.dataLoader.getAuditLog(), audit];
    this.dataLoader.saveAuditLog(log);
    return audit;
  }

  getLog(filter?: { documentId?: string; limit?: number }): AuditEntry[] {
    if (filter?.documentId !== undefined && filter.documentId.trim() === '') {
      throw new KnowledgeInputError('documentId must not be empty');
    }
    if (
      filter?.limit !== undefined &&
      (!Number.isInteger(filter.limit) || filter.limit < 0)
    ) {
      throw new KnowledgeInputError('limit must be a non-negative integer');
    }

    const filtered = this.dataLoader
      .getAuditLog()
      .filter(
        (entry) =>
          filter?.documentId === undefined ||
          entry.document_id === filter.documentId,
      );
    const limit = filter?.limit ?? 50;
    if (limit === 0) return [];
    return filtered.slice(-limit).reverse();
  }
}
