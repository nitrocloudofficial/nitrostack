import { FastifyInstance } from 'fastify';
import { auditController } from './controller.js';
import { authenticate } from '../../shared/middleware/authMiddleware.js';

export async function auditRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [authenticate] }, (req, reply) => auditController.getLogs(req, reply));
}
