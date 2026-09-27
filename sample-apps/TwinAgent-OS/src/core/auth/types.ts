import { Role, User, Organization } from '@prisma/client';

export interface AuthTokenPayload {
  userId: string;
  organizationId: string;
  email: string;
  role: Role;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: Partial<User>;
  organization: Organization;
}
