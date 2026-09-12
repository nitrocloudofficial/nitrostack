import { FastifyInstance } from 'fastify';
import { digitalTwinController } from './controller.js';
import { authenticate } from '../../shared/middleware/authMiddleware.js';

export async function digitalTwinRoutes(fastify: FastifyInstance) {
  fastify.post('/user/:userId/calculate', { preHandler: [authenticate] }, (req, reply) =>
    digitalTwinController.calculateUserTwin(req, reply)
  );
  fastify.post('/project/:projectId/calculate', { preHandler: [authenticate] }, (req, reply) =>
    digitalTwinController.calculateProjectTwin(req, reply)
  );
  fastify.get('/snapshot', { preHandler: [authenticate] }, (req, reply) =>
    digitalTwinController.getLatestSnapshot(req, reply)
  );
  fastify.get('/history', { preHandler: [authenticate] }, (req, reply) =>
    digitalTwinController.getHistoricalSnapshots(req, reply)
  );
}
