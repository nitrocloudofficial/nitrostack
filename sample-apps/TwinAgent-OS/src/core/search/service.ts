import { prisma } from '../../config/database.js';

export class SearchService {
  async globalSearch(organizationId: string, query: string) {
    const q = query.trim();
    if (!q) return { users: [], projects: [], tasks: [], memories: [], nodes: [] };

    const users = await prisma.user.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { jobTitle: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true, role: true },
      take: 10,
    });

    const projects = await prisma.project.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { key: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, key: true, status: true, riskScore: true },
      take: 10,
    });

    const tasks = await prisma.task.findMany({
      where: {
        project: { organizationId },
        deletedAt: null,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, title: true, status: true, priority: true, projectId: true },
      take: 10,
    });

    const memories = await prisma.memoryEntry.findMany({
      where: {
        organizationId,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 10,
    });

    const nodes = await prisma.graphNode.findMany({
      where: {
        organizationId,
        name: { contains: q, mode: 'insensitive' },
      },
      take: 10,
    });

    return { users, projects, tasks, memories, nodes };
  }
}

export const searchService = new SearchService();
