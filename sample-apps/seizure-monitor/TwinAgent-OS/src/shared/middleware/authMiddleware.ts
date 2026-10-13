import { FastifyRequest, FastifyReply } from 'fastify';
import { Role } from '@prisma/client';
import { UnauthorizedError, ForbiddenError } from '../errors/AppError.js';
import { UserPayload } from '../../types/fastify.d.js';

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired authentication token');
  }
}

export function authorize(roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as UserPayload | undefined;
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }
    if (!roles.includes(user.role)) {
      throw new ForbiddenError(`User role '${user.role}' is not authorized to access this resource`);
    }
  };
}
