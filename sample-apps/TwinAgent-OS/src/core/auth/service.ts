import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { authRepository } from './repository.js';
import { RegisterDTO, LoginDTO, RefreshTokenDTO, InviteUserDTO } from './dto.js';
import { BadRequestError, UnauthorizedError } from '../../shared/errors/AppError.js';
import { Role } from '@prisma/client';

export class AuthService {
  async register(dto: RegisterDTO) {
    const existing = await authRepository.findUserByEmail(dto.email);
    if (existing) {
      throw new BadRequestError('User with this email already exists');
    }

    const domainPart = dto.email.split('@')[1];
    let org = await authRepository.findOrgByNameOrDomain(dto.orgName, domainPart);
    if (!org) {
      org = await authRepository.createOrganization(dto.orgName, `${domainPart}-${Date.now()}`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await authRepository.createUser({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role || Role.OWNER,
      organizationId: org.id,
    });

    const refreshTokenString = crypto.randomBytes(40).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(refreshTokenString).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await authRepository.createRefreshToken(user.id, tokenHash, expiresAt);

    return { user, organization: org, refreshToken: refreshTokenString };
  }

  async login(dto: LoginDTO) {
    const user = await authRepository.findUserByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const refreshTokenString = crypto.randomBytes(40).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(refreshTokenString).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await authRepository.createRefreshToken(user.id, tokenHash, expiresAt);

    return { user, organization: user.organization, refreshToken: refreshTokenString };
  }

  async refreshToken(dto: RefreshTokenDTO) {
    const tokenHash = crypto.createHash('sha256').update(dto.refreshToken).digest('hex');
    const tokenRecord = await authRepository.findRefreshToken(tokenHash);

    if (!tokenRecord || tokenRecord.revoked || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    await authRepository.revokeRefreshToken(tokenHash);

    const newRefreshTokenString = crypto.randomBytes(40).toString('hex');
    const newTokenHash = crypto.createHash('sha256').update(newRefreshTokenString).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await authRepository.createRefreshToken(tokenRecord.userId, newTokenHash, expiresAt);

    return { user: tokenRecord.user, refreshToken: newRefreshTokenString };
  }

  async inviteUser(organizationId: string, dto: InviteUserDTO) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    return authRepository.createInvitation(organizationId, dto.email, dto.role, token, expiresAt);
  }

  async getProfile(userId: string) {
    const user = await authRepository.findUserById(userId);
    if (!user) throw new BadRequestError('User profile not found');
    return user;
  }
}

export const authService = new AuthService();
