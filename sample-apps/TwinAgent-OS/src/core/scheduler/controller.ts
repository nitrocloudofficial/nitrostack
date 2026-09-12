import { FastifyRequest, FastifyReply } from 'fastify';
import { predictionEngineService } from '../prediction/service.js';
import { successResponse } from '../../shared/utils/response.js';
import { UserPayload } from '../../types/fastify.d.js';

export class SchedulerController {
  async triggerScan(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user as UserPayload;
    const predictions = await predictionEngineService.runOrganizationScan(userPayload.organizationId);
    return reply.send(successResponse(predictions, 'Manual scheduler scan triggered'));
  }
}

export const schedulerController = new SchedulerController();
