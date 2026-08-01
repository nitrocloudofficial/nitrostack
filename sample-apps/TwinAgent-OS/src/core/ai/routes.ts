import { FastifyInstance } from 'fastify';
import { aiController } from './controller.js';
import { authenticate } from '../../shared/middleware/authMiddleware.js';

export async function aiRoutes(fastify: FastifyInstance) {
  fastify.post('/reason', { preHandler: [authenticate] }, (req, reply) => aiController.reason(req, reply));
}
