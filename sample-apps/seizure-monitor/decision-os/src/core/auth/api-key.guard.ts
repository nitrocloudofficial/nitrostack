import { ApiKeyModule, ExecutionContext, Guard, Injectable } from '@nitrostack/core';

/**
 * Requires a valid DecisionOS client API key on every public tool call.
 * MCP clients must provide the raw key in request metadata as `apiKey`.
 */
@Injectable()
export class ApiKeyGuard implements Guard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const configuredField = ApiKeyModule.getConfig().metadataField || 'apiKey';
    const candidate = context.metadata?.[configuredField];
    if (typeof candidate !== 'string' || !candidate) {
      return false;
    }

    const valid = await ApiKeyModule.validate(candidate);
    if (!valid) {
      return false;
    }

    context.auth = {
      subject: `apikey_${candidate.slice(0, 8)}`,
      scopes: ['decision:read'],
    };
    return true;
  }
}
