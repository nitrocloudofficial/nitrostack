import { FastifyInstance } from 'fastify';
import { taskController } from './controller.js';
import { authenticate } from '../../shared/middleware/authMiddleware.js';

export async function taskRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [authenticate] }, (req, reply) => taskController.getAll(req, reply));
  fastify.get('/:id', { preHandler: [authenticate] }, (req, reply) => taskController.getById(req, reply));
  fastify.post('/', { preHandler: [authenticate] }, (req, reply) => taskController.create(req, reply));
  fastify.patch('/:id', { preHandler: [authenticate] }, (req, reply) => taskController.update(req, reply));
  fastify.post('/:id/dependencies', { preHandler: [authenticate] }, (req, reply) => taskController.addDependency(req, reply));
}
