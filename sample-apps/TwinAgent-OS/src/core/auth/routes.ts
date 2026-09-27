import { FastifyInstance } from 'fastify';
import { authController } from './controller.js';
import { authenticate, authorize } from '../../shared/middleware/authMiddleware.js';
import { Role } from '@prisma/client';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/register', (req, reply) => authController.register(req, reply));
  fastify.post('/login', (req, reply) => authController.login(req, reply));
  fastify.post('/refresh', (req, reply) => authController.refreshToken(req, reply));
  fastify.post('/invite', { preHandler: [authenticate, authorize([Role.OWNER, Role.ADMIN, Role.MANAGER])] }, (req, reply) =>
    authController.invite(req, reply)
  );
  fastify.get('/me', { preHandler: [authenticate] }, (req, reply) => authController.getProfile(req, reply));
}
