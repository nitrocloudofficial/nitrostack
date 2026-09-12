import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { graphService } from './service.js';
import { successResponse } from '../../shared/utils/response.js';
import { UserPayload } from '../../types/fastify.d.js';

export class GraphController {
  async getGraph(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user as UserPayload;
    const graph = await graphService.getGraph(userPayload.organizationId);
    return reply.send(successResponse(graph));
  }

  async addNode(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user as UserPayload;
    const schema = z.object({
      type: z.string(),
      name: z.string(),
      externalId: z.string().optional(),
      properties: z.record(z.unknown()).optional(),
    });
    const body = schema.parse(request.body);
    const node = await graphService.addNode(userPayload.organizationId, body.type, body.name, body.externalId, body.properties);
    return reply.status(201).send(successResponse(node, 'Graph node created'));
  }

  async addEdge(request: FastifyRequest, reply: FastifyReply) {
    const schema = z.object({
      sourceNodeId: z.string(),
      targetNodeId: z.string(),
      relation: z.string(),
      weight: z.number().optional(),
      properties: z.record(z.unknown()).optional(),
    });
    const body = schema.parse(request.body);
    const edge = await graphService.addEdge(
      body.sourceNodeId,
      body.targetNodeId,
      body.relation,
      body.weight,
      body.properties
    );
    return reply.status(201).send(successResponse(edge, 'Graph edge created'));
  }

  async getNeighbors(request: FastifyRequest, reply: FastifyReply) {
    const { nodeId } = request.params as { nodeId: string };
    const neighbors = await graphService.getNeighbors(nodeId);
    return reply.send(successResponse(neighbors));
  }
}

export const graphController = new GraphController();
