import { z } from '@nitrostack/core';

/**
 * Clinical Copilot MCP Server - User Schema
 *
 * Defines Zod schema and TypeScript interfaces for user authentication records
 * stored in the MongoDB 'users' collection.
 */

export const UserSchema = z.object({
  userId: z.string().describe('Unique identifier for the user account'),
  email: z.string().min(1).describe('User email address or username used for login'),
  passwordHash: z.string().describe('Hashed password string'),
  salt: z.string().describe('Salt used for password hashing'),
  patientId: z.string().describe('Associated patient profile identifier'),
  name: z.string().describe('User full name'),
  createdAt: z.string().optional().describe('ISO timestamp of user creation'),
  updatedAt: z.string().optional().describe('ISO timestamp of last user update'),
});

export type UserDocument = z.infer<typeof UserSchema>;
