import { prisma } from '../../config/database.js';
import { Role } from '@prisma/client';

export class AuthRepository {
  async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });
  }

  async findUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        organization: true,
        department: true,
        skills: true,
        preferences: true,
      },
    });
  }

  async findOrgByNameOrDomain(orgName: string, domain: string) {
    return prisma.organization.findFirst({
      where: {
        OR: [{ name: orgName }, { domain }],
      },
    });
  }

  async createOrganization(name: string, domain: string) {
    return prisma.organization.create({
      data: { name, domain },
    });
  }

  async createUser(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    role: Role;
    organizationId: string;
  }) {
    return prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        organizationId: data.organizationId,
        preferences: { create: {} },
      },
    });
  }

  async createRefreshToken(userId: string, tokenHash: string, expiresAt: Date) {
    return prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  }

  async findRefreshToken(tokenHash: string) {
    return prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { organization: true } } },
    });
  }

  async revokeRefreshToken(tokenHash: string) {
    return prisma.refreshToken.update({
      where: { tokenHash },
      data: { revoked: true },
    });
  }

  async createInvitation(organizationId: string, email: string, role: Role, token: string, expiresAt: Date) {
    return prisma.invitation.create({
      data: { organizationId, email, role, token, expiresAt },
    });
  }
}

export const authRepository = new AuthRepository();
