import { FastifyInstance } from 'fastify';
import { integrationsController } from './controller.js';
import { authenticate } from '../../shared/middleware/authMiddleware.js';

export async function integrationRoutes(fastify: FastifyInstance) {
  fastify.get('/accounts', { preHandler: [authenticate] }, (req, reply) => integrationsController.getAccounts(req, reply));
  fastify.post('/connect', { preHandler: [authenticate] }, (req, reply) => integrationsController.connect(req, reply));
  fastify.post('/accounts/:accountId/sync', { preHandler: [authenticate] }, (req, reply) => integrationsController.sync(req, reply));
  fastify.post('/webhook/:connectorType', (req, reply) => integrationsController.webhook(req, reply));
}
