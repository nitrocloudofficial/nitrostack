import { FastifyInstance } from 'fastify';
import { graphController } from './controller.js';
import { authenticate } from '../../shared/middleware/authMiddleware.js';

export async function graphRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [authenticate] }, (req, reply) => graphController.getGraph(req, reply));
  fastify.post('/nodes', { preHandler: [authenticate] }, (req, reply) => graphController.addNode(req, reply));
  fastify.post('/edges', { preHandler: [authenticate] }, (req, reply) => graphController.addEdge(req, reply));
  fastify.get('/nodes/:nodeId/neighbors', { preHandler: [authenticate] }, (req, reply) =>
    graphController.getNeighbors(req, reply)
  );
}
