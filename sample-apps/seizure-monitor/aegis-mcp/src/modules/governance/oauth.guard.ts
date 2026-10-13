import { Guard, ExecutionContext, OAuthModule, OAuthTokenPayload } from '@nitrostack/core';

/**
 * OAuth Guard (from the NitroStack `typescript-oauth` template).
 *
 * Dev-friendly by default: when OAuth is not enforced (no OAuthModule.forRoot()
 * with `required: true` registered), requests pass through unauthenticated.
 * Set OAUTH_REQUIRED=true and register OAuthModule.forRoot() to enforce.
 */
export class OAuthGuard implements Guard {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const authHeader = context.metadata?.authorization as string;
        const metaToken = context.metadata?._oauth || context.metadata?.token;

        let token: string | null = null;

        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else if (metaToken) {
            token = metaToken as string;
        }

        if (!OAuthModule.isAuthRequired()) {
            if (token) {
                const result = await OAuthModule.validateToken(token);
                if (result.valid) {
                    const payload = result.payload as OAuthTokenPayload;
                    context.auth = {
                        subject: payload.sub,
                        scopes: this.extractScopes(payload),
                        clientId: payload.client_id,
                        tokenPayload: payload,
                    };
                }
            }
            return true;
        }

        if (!token) {
            throw new Error(
                'OAuth token required. Please authenticate in Studio (Auth → OAuth 2.1 tab) ' +
                'or provide token in Authorization header: "Bearer <token>"'
            );
        }

        const result = await OAuthModule.validateToken(token);

        if (!result.valid) {
            throw new Error(`OAuth token validation failed: ${result.error}`);
        }

        const payload = result.payload as OAuthTokenPayload;
        const scopes = this.extractScopes(payload);

        context.auth = {
            subject: payload.sub,
            scopes: scopes,
            clientId: payload.client_id,
            tokenPayload: payload,
        };

        return true;
    }

    private extractScopes(payload: OAuthTokenPayload): string[] {
        if (payload.scopes && Array.isArray(payload.scopes)) {
            return payload.scopes;
        }

        if (payload.scope && typeof payload.scope === 'string') {
            return payload.scope.split(' ').filter(s => s.length > 0);
        }

        return [];
    }
}
