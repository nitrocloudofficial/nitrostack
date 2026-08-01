import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { workflowService } from './service.js';
import { successResponse } from '../../shared/utils/response.js';
import { UserPayload } from '../../types/fastify.d.js';

export class WorkflowController {
  async getAll(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user as UserPayload;
    const workflows = await workflowService.getWorkflows(userPayload.organizationId);
    return reply.send(successResponse(workflows));
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user as UserPayload;
    const schema = z.object({
      name: z.string(),
      description: z.string().optional(),
      triggerConfig: z.record(z.unknown()),
      conditionConfig: z.record(z.unknown()).optional(),
      actionConfig: z.record(z.unknown()),
      approvalMode: z.enum(['AUTOMATIC', 'MANAGER_APPROVAL', 'MANUAL_APPROVAL']).optional(),
    });

    const body = schema.parse(request.body);
    const workflow = await workflowService.createWorkflow(userPayload.organizationId, body as any);
    return reply.status(201).send(successResponse(workflow, 'Workflow created successfully'));
  }

  async execute(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const userPayload = request.user as UserPayload;
    const schema = z.object({ payload: z.record(z.unknown()).default({}) });
    const { payload } = schema.parse(request.body || {});

    const result = await workflowService.executeWorkflow(id, payload, userPayload.userId);
    return reply.send(successResponse(result, 'Workflow triggered'));
  }
}

export const workflowController = new WorkflowController();
