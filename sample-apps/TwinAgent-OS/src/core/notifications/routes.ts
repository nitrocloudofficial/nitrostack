import { FastifyInstance } from 'fastify';
import { notificationController } from './controller.js';
import { authenticate } from '../../shared/middleware/authMiddleware.js';

export async function notificationRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [authenticate] }, (req, reply) => notificationController.getAll(req, reply));
  fastify.patch('/:id/read', { preHandler: [authenticate] }, (req, reply) => notificationController.markRead(req, reply));
}
