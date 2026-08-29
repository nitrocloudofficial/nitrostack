import { graphRepository } from './repository.js';

export class GraphService {
  async addNode(organizationId: string, type: string, name: string, externalId?: string, properties?: object) {
    return graphRepository.upsertNode(organizationId, type, name, externalId, properties);
  }

  async addEdge(sourceNodeId: string, targetNodeId: string, relation: string, weight = 1.0, properties?: object) {
    return graphRepository.upsertEdge(sourceNodeId, targetNodeId, relation, weight, properties);
  }

  async getGraph(organizationId: string) {
    return graphRepository.findGraph(organizationId);
  }

  async getNeighbors(nodeId: string) {
    return graphRepository.findNeighbors(nodeId);
  }
}

export const graphService = new GraphService();
