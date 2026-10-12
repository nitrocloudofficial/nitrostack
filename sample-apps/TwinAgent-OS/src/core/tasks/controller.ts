import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { taskService } from './service.js';
import { successResponse } from '../../shared/utils/response.js';
import { UserPayload } from '../../types/fastify.d.js';

export class TaskController {
  async getAll(request: FastifyRequest, reply: FastifyReply) {
    const { projectId, assigneeId } = request.query as { projectId?: string; assigneeId?: string };
    const tasks = await taskService.getTasks(projectId, assigneeId);
    return reply.send(successResponse(tasks));
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const task = await taskService.getTaskById(id);
    return reply.send(successResponse(task));
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user as UserPayload;
    const schema = z.object({
      projectId: z.string(),
      assigneeId: z.string().optional(),
      title: z.string(),
      description: z.string().optional(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL']).optional(),
      complexity: z.number().min(1).max(5).optional(),
      estimatedHours: z.number().optional(),
      dueDate: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
      labels: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
    });

    const body = schema.parse(request.body);
    const task = await taskService.createTask(userPayload.userId, body);
    return reply.status(201).send(successResponse(task, 'Task created successfully'));
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const userPayload = request.user as UserPayload;
    const schema = z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED']).optional(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL']).optional(),
      assigneeId: z.string().optional(),
      actualHours: z.number().optional(),
      riskScore: z.number().optional(),
    });

    const body = schema.parse(request.body);
    const updated = await taskService.updateTask(id, userPayload.userId, body);
    return reply.send(successResponse(updated, 'Task updated successfully'));
  }

  async addDependency(request: FastifyRequest, reply: FastifyReply) {
    const { id: blockedTaskId } = request.params as { id: string };
    const schema = z.object({ dependentOnId: z.string() });
    const { dependentOnId } = schema.parse(request.body);

    const dep = await taskService.addDependency(blockedTaskId, dependentOnId);
    return reply.status(201).send(successResponse(dep, 'Dependency added'));
  }
}

export const taskController = new TaskController();
