import { z } from 'zod';
import { Role } from '@prisma/client';

export const RegisterDTOSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  orgName: z.string().min(1),
  role: z.nativeEnum(Role).optional(),
});

export const LoginDTOSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const RefreshTokenDTOSchema = z.object({
  refreshToken: z.string().min(1),
});

export const InviteUserDTOSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(Role).default(Role.EMPLOYEE),
});

export type RegisterDTO = z.infer<typeof RegisterDTOSchema>;
export type LoginDTO = z.infer<typeof LoginDTOSchema>;
export type RefreshTokenDTO = z.infer<typeof RefreshTokenDTOSchema>;
export type InviteUserDTO = z.infer<typeof InviteUserDTOSchema>;
