import { FastifyInstance } from 'fastify';
import { workflowController } from './controller.js';
import { authenticate } from '../../shared/middleware/authMiddleware.js';

export async function workflowRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [authenticate] }, (req, reply) => workflowController.getAll(req, reply));
  fastify.post('/', { preHandler: [authenticate] }, (req, reply) => workflowController.create(req, reply));
  fastify.post('/:id/execute', { preHandler: [authenticate] }, (req, reply) => workflowController.execute(req, reply));
}
