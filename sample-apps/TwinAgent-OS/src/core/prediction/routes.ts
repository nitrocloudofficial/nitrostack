import { FastifyInstance } from 'fastify';
import { predictionController } from './controller.js';
import { authenticate } from '../../shared/middleware/authMiddleware.js';

export async function predictionRoutes(fastify: FastifyInstance) {
  fastify.post('/scan', { preHandler: [authenticate] }, (req, reply) => predictionController.runScan(req, reply));
  fastify.get('/active', { preHandler: [authenticate] }, (req, reply) => predictionController.getActive(req, reply));
  fastify.get('/:id/explain', { preHandler: [authenticate] }, (req, reply) => predictionController.getExplanation(req, reply));
  fastify.patch('/:id/resolve', { preHandler: [authenticate] }, (req, reply) => predictionController.resolve(req, reply));
}
