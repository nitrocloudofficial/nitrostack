import { FastifyRequest, FastifyReply } from 'fastify';
import { digitalTwinService } from './service.js';
import { successResponse } from '../../shared/utils/response.js';
import { TwinTargetType } from '@prisma/client';

export class DigitalTwinController {
  async calculateUserTwin(request: FastifyRequest, reply: FastifyReply) {
    const { userId } = request.params as { userId: string };
    const scores = await digitalTwinService.calculateUserTwin(userId);
    return reply.send(successResponse(scores, 'User digital twin recalculated successfully'));
  }

  async calculateProjectTwin(request: FastifyRequest, reply: FastifyReply) {
    const { projectId } = request.params as { projectId: string };
    const scores = await digitalTwinService.calculateProjectTwin(projectId);
    return reply.send(successResponse(scores, 'Project digital twin recalculated successfully'));
  }

  async getLatestSnapshot(request: FastifyRequest, reply: FastifyReply) {
    const { targetType, targetId } = request.query as { targetType: TwinTargetType; targetId: string };
    const snapshot = await digitalTwinService.getLatestSnapshot(targetType, targetId);
    return reply.send(successResponse(snapshot));
  }

  async getHistoricalSnapshots(request: FastifyRequest, reply: FastifyReply) {
    const { targetType, targetId, limit } = request.query as {
      targetType: TwinTargetType;
      targetId: string;
      limit?: string;
    };
    const history = await digitalTwinService.getHistoricalSnapshots(
      targetType,
      targetId,
      limit ? parseInt(limit, 10) : 20
    );
    return reply.send(successResponse(history));
  }
}

export const digitalTwinController = new DigitalTwinController();
