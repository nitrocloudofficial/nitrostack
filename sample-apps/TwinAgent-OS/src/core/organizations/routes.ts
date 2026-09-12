import { FastifyInstance } from 'fastify';
import { organizationController } from './controller.js';
import { authenticate } from '../../shared/middleware/authMiddleware.js';

export async function organizationRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [authenticate] }, (req, reply) => organizationController.get(req, reply));
  fastify.get('/hierarchy', { preHandler: [authenticate] }, (req, reply) => organizationController.getHierarchy(req, reply));
  fastify.post('/departments', { preHandler: [authenticate] }, (req, reply) => organizationController.createDepartment(req, reply));
  fastify.post('/teams', { preHandler: [authenticate] }, (req, reply) => organizationController.createTeam(req, reply));
  fastify.post('/teams/:teamId/members', { preHandler: [authenticate] }, (req, reply) => organizationController.addMemberToTeam(req, reply));
  fastify.post('/office-locations', { preHandler: [authenticate] }, (req, reply) => organizationController.createOfficeLocation(req, reply));
}
