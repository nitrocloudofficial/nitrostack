import { prisma } from '../../config/database.js';

export class GraphRepository {
  async upsertNode(organizationId: string, type: string, name: string, externalId?: string, properties?: object) {
    return prisma.graphNode.upsert({
      where: {
        organizationId_type_name: { organizationId, type, name },
      },
      update: {
        externalId,
        properties: (properties || {}) as any,
      },
      create: {
        organizationId,
        type,
        name,
        externalId,
        properties: (properties || {}) as any,
      },
    });
  }

  async upsertEdge(sourceNodeId: string, targetNodeId: string, relation: string, weight = 1.0, properties?: object) {
    return prisma.graphEdge.upsert({
      where: {
        sourceNodeId_targetNodeId_relation: { sourceNodeId, targetNodeId, relation },
      },
      update: { weight, properties: (properties || {}) as any },
      create: { sourceNodeId, targetNodeId, relation, weight, properties: (properties || {}) as any },
    });
  }

  async findGraph(organizationId: string) {
    const nodes = await prisma.graphNode.findMany({ where: { organizationId } });
    const nodeIds = nodes.map((n) => n.id);
    const edges = await prisma.graphEdge.findMany({
      where: { sourceNodeId: { in: nodeIds } },
    });
    return { nodes, edges };
  }

  async findNeighbors(nodeId: string) {
    const outgoing = await prisma.graphEdge.findMany({
      where: { sourceNodeId: nodeId },
      include: { targetNode: true },
    });

    const incoming = await prisma.graphEdge.findMany({
      where: { targetNodeId: nodeId },
      include: { sourceNode: true },
    });

    return { outgoing, incoming };
  }
}

export const graphRepository = new GraphRepository();
