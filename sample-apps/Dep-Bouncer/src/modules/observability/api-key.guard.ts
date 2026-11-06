import { ApiKeyModule, ExecutionContext, Guard, Injectable } from '@nitrostack/core';

/** ApiKeyModule.forRoot configures a static SDK validator; it is not a DI module. */
export function configureApiKeys(raw: string | undefined): boolean {
  const enabled = Boolean(raw?.trim());
  const keys = (raw ?? '').split(',').map(key => key.trim()).filter(Boolean);
  ApiKeyModule.forRoot({
    keys: keys.map(key => ApiKeyModule.hashKey(key)),
    keysEnvPrefix: undefined,
    hashed: true,
    headerName: 'x-api-key',
    metadataField: 'apiKey',
    customValidation: undefined,
  });
  return enabled;
}

@Injectable()
export class BouncerApiKeyGuard implements Guard {
  private readonly enabled = configureApiKeys(process.env.DEP_BOUNCER_API_KEYS);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.enabled) return true;
    const key = context.metadata?.['x-api-key'] ?? context.metadata?.apiKey;
    if (typeof key !== 'string' || !key) {
      throw new Error('API key required: supply x-api-key or apiKey in MCP request _meta.');
    }
    if (!await ApiKeyModule.validate(key)) {
      throw new Error('Invalid API key: access to Dep Bouncer tools denied.');
    }
    context.auth = { authenticated: true, subject: 'dep-bouncer-api-key', scopes: ['bouncer:tools'] };
    return true;
  }
}
