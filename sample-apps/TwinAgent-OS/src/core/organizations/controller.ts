import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { organizationService } from './service.js';
import { successResponse } from '../../shared/utils/response.js';
import { UserPayload } from '../../types/fastify.d.js';

export class OrganizationController {
  async get(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user as UserPayload;
    const org = await organizationService.getOrganization(userPayload.organizationId);
    return reply.send(successResponse(org));
  }

  async getHierarchy(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user as UserPayload;
    const hierarchy = await organizationService.getHierarchy(userPayload.organizationId);
    return reply.send(successResponse(hierarchy));
  }

  async createDepartment(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user as UserPayload;
    const schema = z.object({
      name: z.string(),
      description: z.string().optional(),
    });
    const body = schema.parse(request.body);
    const dept = await organizationService.createDepartment(userPayload.organizationId, body.name, body.description);
    return reply.status(201).send(successResponse(dept, 'Department created'));
  }

  async createTeam(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user as UserPayload;
    const schema = z.object({
      name: z.string(),
      departmentId: z.string().optional(),
      leadId: z.string().optional(),
    });
    const body = schema.parse(request.body);
    const team = await organizationService.createTeam(userPayload.organizationId, body.name, body.departmentId, body.leadId);
    return reply.status(201).send(successResponse(team, 'Team created'));
  }

  async addMemberToTeam(request: FastifyRequest, reply: FastifyReply) {
    const { teamId } = request.params as { teamId: string };
    const schema = z.object({ userId: z.string() });
    const { userId } = schema.parse(request.body);
    const updatedTeam = await organizationService.addMemberToTeam(teamId, userId);
    return reply.send(successResponse(updatedTeam, 'Member added to team'));
  }

  async createOfficeLocation(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user as UserPayload;
    const schema = z.object({
      name: z.string(),
      city: z.string(),
      country: z.string(),
      address: z.string().optional(),
    });
    const body = schema.parse(request.body);
    const location = await organizationService.createOfficeLocation(
      userPayload.organizationId,
      body.name,
      body.city,
      body.country,
      body.address
    );
    return reply.status(201).send(successResponse(location, 'Office location created'));
  }
}

export const organizationController = new OrganizationController();
