import { FastifyInstance } from 'fastify';
import { userController } from './controller.js';
import { authenticate } from '../../shared/middleware/authMiddleware.js';

export async function userRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [authenticate] }, (req, reply) => userController.getAll(req, reply));
  fastify.get('/:id', { preHandler: [authenticate] }, (req, reply) => userController.getById(req, reply));
  fastify.patch('/:id', { preHandler: [authenticate] }, (req, reply) => userController.update(req, reply));
  fastify.post('/:id/skills', { preHandler: [authenticate] }, (req, reply) => userController.addSkill(req, reply));
  fastify.get('/:id/workload', { preHandler: [authenticate] }, (req, reply) => userController.getWorkload(req, reply));
}
