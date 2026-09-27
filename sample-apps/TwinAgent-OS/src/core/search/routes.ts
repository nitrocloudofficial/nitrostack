import { FastifyInstance } from 'fastify';
import { searchController } from './controller.js';
import { authenticate } from '../../shared/middleware/authMiddleware.js';

export async function searchRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [authenticate] }, (req, reply) => searchController.search(req, reply));
}
