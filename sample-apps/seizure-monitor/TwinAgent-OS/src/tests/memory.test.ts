import { describe, it, expect } from 'vitest';
import { memoryService } from '../core/memory/service.js';
import { graphService } from '../core/graph/service.js';
import { prisma } from '../config/database.js';

describe('Organizational Memory & Enterprise Graph Test Suite', () => {
  it('should store and retrieve memory timeline entries', async () => {
    const org = await prisma.organization.findFirst();
    if (!org) return;

    const entry = await memoryService.addMemoryEntry({
      organizationId: org.id,
      category: 'DECISION',
      entityType: 'PROJECT',
      entityId: 'proj-1',
      title: 'Database Choice',
      content: 'Chose PostgreSQL for relational integrity',
      tags: ['db', 'postgres'],
    });

    expect(entry.id).toBeDefined();

    const search = await memoryService.searchMemory(org.id, 'PostgreSQL');
    expect(search.length).toBeGreaterThan(0);
  });

  it('should manipulate graph nodes and edges', async () => {
    const org = await prisma.organization.findFirst();
    if (!org) return;

    const n1 = await graphService.addNode(org.id, 'EMPLOYEE', 'John Doe');
    const n2 = await graphService.addNode(org.id, 'PROJECT', 'Project Apollo');

    const edge = await graphService.addEdge(n1.id, n2.id, 'owns');
    expect(edge.relation).toBe('owns');

    const graph = await graphService.getGraph(org.id);
    expect(graph.nodes.length).toBeGreaterThan(1);
  });
});
