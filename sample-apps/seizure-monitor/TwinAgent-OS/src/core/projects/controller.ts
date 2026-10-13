import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { projectService } from './service.js';
import { successResponse } from '../../shared/utils/response.js';
import { UserPayload } from '../../types/fastify.d.js';

export class ProjectController {
  async getAll(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user as UserPayload;
    const projects = await projectService.getProjects(userPayload.organizationId);
    return reply.send(successResponse(projects));
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const project = await projectService.getProjectById(id);
    return reply.send(successResponse(project));
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user as UserPayload;
    const schema = z.object({
      name: z.string(),
      key: z.string(),
      description: z.string().optional(),
      managerId: z.string().optional(),
      targetEndDate: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
      budget: z.number().optional(),
    });
    const body = schema.parse(request.body);
    const project = await projectService.createProject(userPayload.organizationId, body);
    return reply.status(201).send(successResponse(project, 'Project created'));
  }

  async createMilestone(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const schema = z.object({
      name: z.string(),
      dueDate: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
    });
    const body = schema.parse(request.body);
    const milestone = await projectService.createMilestone(id, body.name, body.dueDate);
    return reply.status(201).send(successResponse(milestone, 'Milestone created'));
  }

  async createSprint(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const schema = z.object({
      name: z.string(),
      startDate: z.string().transform((val) => new Date(val)),
      endDate: z.string().transform((val) => new Date(val)),
      goal: z.string().optional(),
    });
    const body = schema.parse(request.body);
    const sprint = await projectService.createSprint(id, body.name, body.startDate, body.endDate, body.goal);
    return reply.status(201).send(successResponse(sprint, 'Sprint created'));
  }

  async createObjective(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const schema = z.object({
      title: z.string(),
      targetValue: z.number(),
      metric: z.string(),
    });
    const body = schema.parse(request.body);
    const objective = await projectService.createObjective(id, body.title, body.targetValue, body.metric);
    return reply.status(201).send(successResponse(objective, 'Objective created'));
  }

  async recalculate(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const metrics = await projectService.calculateProjectMetrics(id);
    return reply.send(successResponse(metrics, 'Project metrics recalculated'));
  }
}

export const projectController = new ProjectController();
