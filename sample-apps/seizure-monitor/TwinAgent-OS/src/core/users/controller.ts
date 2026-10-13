import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { userService } from './service.js';
import { successResponse } from '../../shared/utils/response.js';
import { UserPayload } from '../../types/fastify.d.js';

export class UserController {
  async getAll(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user as UserPayload;
    const users = await userService.getAllUsers(userPayload.organizationId);
    return reply.send(successResponse(users));
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const user = await userService.getUserById(id);
    return reply.send(successResponse(user));
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const schema = z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      jobTitle: z.string().optional(),
      departmentId: z.string().optional(),
      managerId: z.string().optional(),
      weeklyCapacity: z.number().optional(),
    });
    const body = schema.parse(request.body);
    const updated = await userService.updateUserProfile(id, body);
    return reply.send(successResponse(updated, 'User updated successfully'));
  }

  async addSkill(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const schema = z.object({
      name: z.string(),
      proficiency: z.number().min(1).max(5).default(3),
      category: z.string().optional(),
    });
    const body = schema.parse(request.body);
    const skill = await userService.addSkill(id, body.name, body.proficiency, body.category);
    return reply.status(201).send(successResponse(skill, 'Skill added successfully'));
  }

  async getWorkload(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const workload = await userService.calculateWorkload(id);
    return reply.send(successResponse(workload));
  }
}

export const userController = new UserController();
