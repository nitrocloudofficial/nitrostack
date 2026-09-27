import { memoryRepository } from './repository.js';

export class MemoryService {
  async addMemoryEntry(data: {
    organizationId: string;
    category: string;
    entityType: string;
    entityId: string;
    title: string;
    content: string;
    tags?: string[];
    confidence?: number;
    occurredAt?: Date;
  }) {
    return memoryRepository.create(data);
  }

  async getEntityMemory(organizationId: string, entityType: string, entityId: string) {
    return memoryRepository.findByEntity(organizationId, entityType, entityId);
  }

  async searchMemory(organizationId: string, query: string, category?: string) {
    return memoryRepository.search(organizationId, query, category);
  }

  async getTimeline(organizationId: string, startDate?: Date, endDate?: Date) {
    return memoryRepository.getTimeline(organizationId, startDate, endDate);
  }
}

export const memoryService = new MemoryService();
