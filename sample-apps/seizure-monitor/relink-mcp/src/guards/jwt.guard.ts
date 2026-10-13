import { type ExecutionContext, type Guard } from '@nitrostack/core';
import { jwtVerify } from 'jose';
import { config } from '../config/index.js';

export class JwtGuard implements Guard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const authHeader = context.metadata?.authorization as string | undefined;

    if (!authHeader?.startsWith('Bearer ')) return false;

    const token = authHeader.slice(7);
    const secret = new TextEncoder().encode(config.jwt.secret);

    try {
      const { payload } = await jwtVerify(token, secret);

      context.auth = {
        subject: payload.sub as string,
        scopes: (payload.scopes as string[]) || [],
      };


      return true;
    } catch {
      return false;
    }
  }
}
