import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { integrationsService } from './service.js';
import { successResponse } from '../../shared/utils/response.js';
import { UserPayload } from '../../types/fastify.d.js';
import { ConnectorType } from '@prisma/client';

export class IntegrationsController {
  async getAccounts(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user as UserPayload;
    const accounts = await integrationsService.getConnectedAccounts(userPayload.organizationId);
    return reply.send(successResponse(accounts));
  }

  async connect(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user as UserPayload;
    const schema = z.object({
      type: z.nativeEnum(ConnectorType),
      name: z.string(),
      config: z.record(z.unknown()).default({}),
    });

    const body = schema.parse(request.body);
    const account = await integrationsService.connectAccount(userPayload.organizationId, body.type, body.name, body.config);
    return reply.status(201).send(successResponse(account, 'Connector account connected successfully'));
  }

  async sync(request: FastifyRequest, reply: FastifyReply) {
    const { accountId } = request.params as { accountId: string };
    const schema = z.object({ mode: z.enum(['FULL', 'INCREMENTAL']).default('INCREMENTAL') });
    const { mode } = schema.parse(request.body || {});

    const result = await integrationsService.triggerSync(accountId, mode);
    return reply.send(successResponse(result, 'Sync triggered successfully'));
  }

  async webhook(request: FastifyRequest, reply: FastifyReply) {
    const { connectorType } = request.params as { connectorType: ConnectorType };
    const result = await integrationsService.processWebhook(connectorType, request.body);
    return reply.send(successResponse(result, 'Webhook processed successfully'));
  }
}

export const integrationsController = new IntegrationsController();
