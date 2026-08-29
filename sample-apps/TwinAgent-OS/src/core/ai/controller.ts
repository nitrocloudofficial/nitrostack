import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { aiReasoningService } from './service.js';
import { successResponse } from '../../shared/utils/response.js';
import { UserPayload } from '../../types/fastify.d.js';

export class AIController {
  async reason(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user as UserPayload;
    const schema = z.object({
      prompt: z.string(),
      provider: z.enum(['OPENAI', 'ANTHROPIC', 'GEMINI', 'OLLAMA', 'DEEPSEEK']).optional(),
    });

    const body = schema.parse(request.body);
    const result = await aiReasoningService.executePipeline({
      organizationId: userPayload.organizationId,
      userId: userPayload.userId,
      prompt: body.prompt,
      provider: body.provider,
    });

    return reply.send(successResponse(result, 'AI reasoning pipeline completed'));
  }
}

export const aiController = new AIController();
