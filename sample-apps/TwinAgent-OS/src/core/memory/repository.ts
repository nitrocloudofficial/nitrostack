import { prisma } from '../../config/database.js';

export class MemoryRepository {
  async create(data: {
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
    return prisma.memoryEntry.create({
      data: {
        organizationId: data.organizationId,
        category: data.category,
        entityType: data.entityType,
        entityId: data.entityId,
        title: data.title,
        content: data.content,
        tags: data.tags || [],
        confidence: data.confidence ?? 1.0,
        occurredAt: data.occurredAt || new Date(),
      },
    });
  }

  async findByEntity(organizationId: string, entityType: string, entityId: string) {
    return prisma.memoryEntry.findMany({
      where: { organizationId, entityType, entityId },
      orderBy: { occurredAt: 'desc' },
    });
  }

  async search(organizationId: string, query: string, category?: string) {
    return prisma.memoryEntry.findMany({
      where: {
        organizationId,
        ...(category && { category }),
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
          { tags: { hasSome: [query] } },
        ],
      },
      orderBy: { occurredAt: 'desc' },
      take: 50,
    });
  }

  async getTimeline(organizationId: string, startDate?: Date, endDate?: Date) {
    return prisma.memoryEntry.findMany({
      where: {
        organizationId,
        ...(startDate || endDate
          ? {
              occurredAt: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
              },
            }
          : {}),
      },
      orderBy: { occurredAt: 'desc' },
      take: 100,
    });
  }
}

export const memoryRepository = new MemoryRepository();
