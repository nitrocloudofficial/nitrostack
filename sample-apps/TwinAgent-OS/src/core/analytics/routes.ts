import { FastifyInstance } from 'fastify';
import { analyticsController } from './controller.js';
import { authenticate } from '../../shared/middleware/authMiddleware.js';

export async function analyticsRoutes(fastify: FastifyInstance) {
  fastify.get('/dashboard', { preHandler: [authenticate] }, (req, reply) => analyticsController.getDashboard(req, reply));
}
