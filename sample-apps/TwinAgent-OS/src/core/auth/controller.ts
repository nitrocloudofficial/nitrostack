import { FastifyRequest, FastifyReply } from 'fastify';
import { authService } from './service.js';
import { RegisterDTOSchema, LoginDTOSchema, RefreshTokenDTOSchema, InviteUserDTOSchema } from './dto.js';
import { successResponse } from '../../shared/utils/response.js';
import { UserPayload } from '../../types/fastify.d.js';

export class AuthController {
  async register(request: FastifyRequest, reply: FastifyReply) {
    const body = RegisterDTOSchema.parse(request.body);
    const { user, organization, refreshToken } = await authService.register(body);

    const token = request.server.jwt.sign({
      userId: user.id,
      organizationId: organization.id,
      email: user.email,
      role: user.role,
    });

    return reply.status(201).send(
      successResponse({
        token,
        refreshToken,
        user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
        organization,
      })
    );
  }

  async login(request: FastifyRequest, reply: FastifyReply) {
    const body = LoginDTOSchema.parse(request.body);
    const { user, organization, refreshToken } = await authService.login(body);

    const token = request.server.jwt.sign({
      userId: user.id,
      organizationId: organization.id,
      email: user.email,
      role: user.role,
    });

    return reply.send(
      successResponse({
        token,
        refreshToken,
        user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
        organization,
      })
    );
  }

  async refreshToken(request: FastifyRequest, reply: FastifyReply) {
    const body = RefreshTokenDTOSchema.parse(request.body);
    const { user, refreshToken } = await authService.refreshToken(body);

    const token = request.server.jwt.sign({
      userId: user.id,
      organizationId: user.organizationId,
      email: user.email,
      role: user.role,
    });

    return reply.send(
      successResponse({
        token,
        refreshToken,
      })
    );
  }

  async invite(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user as UserPayload;
    const body = InviteUserDTOSchema.parse(request.body);
    const invitation = await authService.inviteUser(userPayload.organizationId, body);

    return reply.status(201).send(successResponse(invitation, 'Invitation sent successfully'));
  }

  async getProfile(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user as UserPayload;
    const profile = await authService.getProfile(userPayload.userId);
    return reply.send(successResponse(profile));
  }
}

export const authController = new AuthController();
