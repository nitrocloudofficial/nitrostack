import { FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';

declare module 'fastify' {
  interface FastifyRequest {
    correlationId: string;
  }
}

export async function correlationMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const correlationId = (request.headers['x-correlation-id'] as string) || (request.headers['x-request-id'] as string) || randomUUID();
  request.correlationId = correlationId;
  reply.header('x-correlation-id', correlationId);
}
