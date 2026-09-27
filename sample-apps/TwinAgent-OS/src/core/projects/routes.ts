import { FastifyInstance } from 'fastify';
import { projectController } from './controller.js';
import { authenticate } from '../../shared/middleware/authMiddleware.js';

export async function projectRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [authenticate] }, (req, reply) => projectController.getAll(req, reply));
  fastify.get('/:id', { preHandler: [authenticate] }, (req, reply) => projectController.getById(req, reply));
  fastify.post('/', { preHandler: [authenticate] }, (req, reply) => projectController.create(req, reply));
  fastify.post('/:id/milestones', { preHandler: [authenticate] }, (req, reply) => projectController.createMilestone(req, reply));
  fastify.post('/:id/sprints', { preHandler: [authenticate] }, (req, reply) => projectController.createSprint(req, reply));
  fastify.post('/:id/objectives', { preHandler: [authenticate] }, (req, reply) => projectController.createObjective(req, reply));
  fastify.post('/:id/recalculate', { preHandler: [authenticate] }, (req, reply) => projectController.recalculate(req, reply));
}
