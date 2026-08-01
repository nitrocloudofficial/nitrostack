import { Guard, ExecutionContext, Injectable } from '@nitrostack/core';

/**
 * Optional API-key guard.
 *
 * Authentication is DISABLED unless the `API_KEY` environment variable is set,
 * so the public demo stays keyless. When `API_KEY` is present, callers must
 * supply a matching key (via the auth context or request metadata); the guard
 * fails closed otherwise. Wire it with `@UseGuards(ApiKeyGuard)` on any tool
 * or controller that should be protected in a production deployment.
 */
@Injectable()
export class ApiKeyGuard implements Guard {
    canActivate(context: ExecutionContext): boolean {
        const required = process.env.API_KEY;
        if (!required) return true; // auth off by default (keyless demo)

        const auth = context.auth as { credentials?: string; token?: string } | undefined;
        const provided =
            auth?.credentials ??
            auth?.token ??
            (context.metadata?.apiKey as string | undefined);

        if (provided && provided === required) return true;
        throw new Error('Unauthorized: a valid API key is required for this server.');
    }
}
