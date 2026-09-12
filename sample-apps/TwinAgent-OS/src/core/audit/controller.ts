import { FastifyRequest, FastifyReply } from 'fastify';
import { auditService } from './service.js';
import { successResponse } from '../../shared/utils/response.js';
import { UserPayload } from '../../types/fastify.d.js';

export class AuditController {
  async getLogs(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user as UserPayload;
    const logs = await auditService.getAuditLogs(userPayload.organizationId);
    return reply.send(successResponse(logs));
  }
}

export const auditController = new AuditController();
