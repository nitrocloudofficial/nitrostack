import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { AuthService } from './auth.service.js';

const authService = new AuthService();

export class AuthResources {
  @Resource({
    uri: 'aeios://auth/stats',
    name: 'Auth Statistics',
    description: 'Authentication system statistics - users, sessions, roles',
    mimeType: 'application/json',
  })
  async authStats(ctx: ExecutionContext) {
    const stats = authService.getStats();
    return {
      contents: [{
        uri: 'aeios://auth/stats',
        mimeType: 'application/json',
        text: JSON.stringify(stats, null, 2),
      }],
    };
  }
}
