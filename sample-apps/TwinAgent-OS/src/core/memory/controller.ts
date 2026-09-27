import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { memoryService } from './service.js';
import { successResponse } from '../../shared/utils/response.js';
import { UserPayload } from '../../types/fastify.d.js';

export class MemoryController {
  async add(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user as UserPayload;
    const schema = z.object({
      category: z.string(),
      entityType: z.string(),
      entityId: z.string(),
      title: z.string(),
      content: z.string(),
      tags: z.array(z.string()).optional(),
      confidence: z.number().optional(),
      occurredAt: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
    });

    const body = schema.parse(request.body);
    const entry = await memoryService.addMemoryEntry({ organizationId: userPayload.organizationId, ...body });
    return reply.status(201).send(successResponse(entry, 'Memory entry added successfully'));
  }

  async getByEntity(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user as UserPayload;
    const { entityType, entityId } = request.params as { entityType: string; entityId: string };
    const entries = await memoryService.getEntityMemory(userPayload.organizationId, entityType, entityId);
    return reply.send(successResponse(entries));
  }

  async search(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user as UserPayload;
    const { q, category } = request.query as { q: string; category?: string };
    const results = await memoryService.searchMemory(userPayload.organizationId, q || '', category);
    return reply.send(successResponse(results));
  }

  async getTimeline(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user as UserPayload;
    const { startDate, endDate } = request.query as { startDate?: string; endDate?: string };
    const timeline = await memoryService.getTimeline(
      userPayload.organizationId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
    return reply.send(successResponse(timeline));
  }
}

export const memoryController = new MemoryController();
