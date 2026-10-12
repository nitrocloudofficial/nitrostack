import { FastifyInstance } from 'fastify';
import { approvalController } from './controller.js';
import { authenticate } from '../../shared/middleware/authMiddleware.js';

export async function approvalRoutes(fastify: FastifyInstance) {
  fastify.get('/pending', { preHandler: [authenticate] }, (req, reply) => approvalController.getPending(req, reply));
  fastify.post('/:id/review', { preHandler: [authenticate] }, (req, reply) => approvalController.review(req, reply));
}
