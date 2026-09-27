import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { AuthService, type Role } from './auth.service.js';

const authService = new AuthService();

export class AuthTools {
  @Tool({
    name: 'auth_create_user',
    description: 'Create a new enterprise user with a specific role (admin, operator, viewer, agent)',
    parameters: z.object({
      username: z.string().describe('Username for the new user'),
      role: z.enum(['admin', 'operator', 'viewer', 'agent']).describe('User role'),
    }),
  })
  async createUser(ctx: ExecutionContext) {
    const { username, role } = ctx.params as { username: string; role: Role };
    try {
      const user = authService.createUser(username, role);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            user: { id: user.id, username: user.username, role: user.role, apiKey: user.apiKey, permissions: user.permissions },
          }, null, 2),
        }],
      };
    } catch (err) {
      return { content: [{ type: 'text' as const, text: JSON.stringify({ success: false, error: (err as Error).message }, null, 2) }] };
    }
  }

  @Tool({
    name: 'auth_authenticate',
    description: 'Authenticate a user with their API key and create a session',
    parameters: z.object({
      apiKey: z.string().describe('The API key to authenticate with'),
    }),
  })
  async authenticate(ctx: ExecutionContext) {
    const { apiKey } = ctx.params as { apiKey: string };
    const user = authService.authenticate(apiKey);
    if (!user) {
      return { content: [{ type: 'text' as const, text: JSON.stringify({ success: false, error: 'Invalid API key' }, null, 2) }] };
    }
    const session = authService.createSession(user.id);
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          success: true,
          user: { id: user.id, username: user.username, role: user.role },
          session: { token: session.token, expiresAt: session.expiresAt },
        }, null, 2),
      }],
    };
  }

  @Tool({
    name: 'auth_check_permission',
    description: 'Check if a user has permission for a specific action',
    parameters: z.object({
      apiKey: z.string().describe('User API key'),
      permission: z.string().describe('Permission to check (e.g., chat, pipeline, agents)'),
    }),
  })
  async checkPermission(ctx: ExecutionContext) {
    const { apiKey, permission } = ctx.params as { apiKey: string; permission: string };
    const user = authService.authenticate(apiKey);
    if (!user) {
      return { content: [{ type: 'text' as const, text: JSON.stringify({ authorized: false, error: 'Invalid API key' }, null, 2) }] };
    }
    const allowed = authService.hasPermission(user, permission);
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ authorized: allowed, user: user.username, role: user.role, permission }, null, 2),
      }],
    };
  }

  @Tool({
    name: 'auth_list_users',
    description: 'List all registered enterprise users',
    parameters: z.object({}),
  })
  async listUsers(ctx: ExecutionContext) {
    const users = authService.listUsers();
    const stats = authService.getStats();
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ users, stats }, null, 2),
      }],
    };
  }

  @Tool({
    name: 'auth_revoke_session',
    description: 'Revoke an active user session',
    parameters: z.object({
      token: z.string().describe('Session token to revoke'),
    }),
  })
  async revokeSession(ctx: ExecutionContext) {
    const { token } = ctx.params as { token: string };
    const revoked = authService.revokeSession(token);
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ success: revoked, message: revoked ? 'Session revoked' : 'Session not found' }, null, 2),
      }],
    };
  }
}
