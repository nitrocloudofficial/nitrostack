import { FastifyInstance } from 'fastify';
import { memoryController } from './controller.js';
import { authenticate } from '../../shared/middleware/authMiddleware.js';

export async function memoryRoutes(fastify: FastifyInstance) {
  fastify.post('/', { preHandler: [authenticate] }, (req, reply) => memoryController.add(req, reply));
  fastify.get('/entity/:entityType/:entityId', { preHandler: [authenticate] }, (req, reply) =>
    memoryController.getByEntity(req, reply)
  );
  fastify.get('/search', { preHandler: [authenticate] }, (req, reply) => memoryController.search(req, reply));
  fastify.get('/timeline', { preHandler: [authenticate] }, (req, reply) => memoryController.getTimeline(req, reply));
}
