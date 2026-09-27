import { Guard, ExecutionContext, Injectable } from '@nitrostack/core';
import jwt from 'jsonwebtoken';

/**
 * Verifies the bearer token on tools that need a known user — e.g.
 * accepting/denying a task, or writing to the calendar. Attaches the
 * decoded payload to context.auth so tools can read ctx.auth.subject.
 */
@Injectable()
export class JWTGuard implements Guard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const authHeader = context.metadata?.authorization;

    if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      return false;
    }

    const token = authHeader.substring(7);

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload;
      if (typeof payload.sub !== 'string') {
        return false;
      }
      context.auth = {
        subject: payload.sub
      } as any;
      return true;
    } catch (error) {
      context.logger.warn('JWT verification failed', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }
}
