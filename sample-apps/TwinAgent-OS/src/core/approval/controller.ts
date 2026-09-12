import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { approvalService } from './service.js';
import { successResponse } from '../../shared/utils/response.js';
import { UserPayload } from '../../types/fastify.d.js';

export class ApprovalController {
  async getPending(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user as UserPayload;
    const approvals = await approvalService.getPendingApprovals(userPayload.organizationId);
    return reply.send(successResponse(approvals));
  }

  async review(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const userPayload = request.user as UserPayload;
    const schema = z.object({
      status: z.enum(['APPROVED', 'REJECTED']),
      reason: z.string().optional(),
    });

    const { status, reason } = schema.parse(request.body);
    const updated = await approvalService.reviewApproval(id, userPayload.userId, status, reason);
    return reply.send(successResponse(updated, `Approval ${status.toLowerCase()}`));
  }
}

export const approvalController = new ApprovalController();
