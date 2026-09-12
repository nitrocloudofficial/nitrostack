import { FastifyRequest, FastifyReply } from 'fastify';
import { searchService } from './service.js';
import { successResponse } from '../../shared/utils/response.js';
import { UserPayload } from '../../types/fastify.d.js';

export class SearchController {
  async search(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user as UserPayload;
    const { q } = request.query as { q: string };
    const results = await searchService.globalSearch(userPayload.organizationId, q || '');
    return reply.send(successResponse(results));
  }
}

export const searchController = new SearchController();
