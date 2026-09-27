import '@fastify/jwt';
import { Role } from '@prisma/client';

export interface UserPayload {
  userId: string;
  organizationId: string;
  email: string;
  role: Role;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: UserPayload;
    user: UserPayload;
  }
}
