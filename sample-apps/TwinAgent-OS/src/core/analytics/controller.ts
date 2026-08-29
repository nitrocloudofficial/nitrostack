import { FastifyRequest, FastifyReply } from 'fastify';
import { analyticsService } from './service.js';
import { successResponse } from '../../shared/utils/response.js';
import { UserPayload } from '../../types/fastify.d.js';

export class AnalyticsController {
  async getDashboard(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user as UserPayload;
    const analytics = await analyticsService.getDashboardAnalytics(userPayload.organizationId);
    return reply.send(successResponse(analytics));
  }
}

export const analyticsController = new AnalyticsController();
