import { FastifyInstance } from 'fastify';
import { schedulerController } from './controller.js';
import { authenticate, authorize } from '../../shared/middleware/authMiddleware.js';
import { Role } from '@prisma/client';

export async function schedulerRoutes(fastify: FastifyInstance) {
  fastify.post('/trigger-scan', { preHandler: [authenticate, authorize([Role.OWNER, Role.ADMIN])] }, (req, reply) =>
    schedulerController.triggerScan(req, reply)
  );
}
