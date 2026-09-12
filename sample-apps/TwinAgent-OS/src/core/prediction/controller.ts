import { FastifyRequest, FastifyReply } from 'fastify';
import { predictionEngineService } from './service.js';
import { successResponse } from '../../shared/utils/response.js';
import { UserPayload } from '../../types/fastify.d.js';

export class PredictionController {
  async runScan(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user as UserPayload;
    const predictions = await predictionEngineService.runOrganizationScan(userPayload.organizationId);
    return reply.send(successResponse(predictions, 'Prediction scan completed successfully'));
  }

  async getActive(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user as UserPayload;
    const predictions = await predictionEngineService.getActivePredictions(userPayload.organizationId);
    return reply.send(successResponse(predictions));
  }

  async getExplanation(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const explanation = await predictionEngineService.getPredictionExplanation(id);
    return reply.send(successResponse(explanation));
  }

  async resolve(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const resolved = await predictionEngineService.resolvePrediction(id);
    return reply.send(successResponse(resolved, 'Prediction marked as resolved'));
  }
}

export const predictionController = new PredictionController();
