import { ClientIdMetadataDocument } from '../../cimd.js';
import { JitBridgeConfig, JitContext, JitProviderAdapter, JitClientRegistrationResult } from '../types.js';

interface Auth0TokenCache {
  accessToken: string;
  expiresAt: number;
}

interface RegisteredClientCache {
  auth0ClientId: string;
  callbacks: Set<string>;
  expiresAt: number;
}

/**
 * Auth0 JIT Dynamic Discovery Provider Adapter
 *
 * Automatically provisions dynamic AI agent clients in Auth0 via the Management API,
 * attaches MCP API scope grants, and manages dynamic redirect URIs.
 */
export class Auth0JitAdapter implements JitProviderAdapter {
  readonly name = 'auth0';

  private tokenCache: Auth0TokenCache | null = null;
  private clientCache = new Map<string, RegisteredClientCache>();
  private defaultCacheTtlMs: number;
  private readonly maxEntries: number;

  constructor(options?: { defaultCacheTtlMs?: number; maxEntries?: number }) {
    this.defaultCacheTtlMs = options?.defaultCacheTtlMs ?? 24 * 60 * 60 * 1000; // 24 hours
    this.maxEntries = options?.maxEntries ?? 1000;
  }

  canHandle(authServerUrl: string, config: JitBridgeConfig): boolean {
    if (config.provider === 'auth0') return true;
    if (config.provider && config.provider !== 'auto') return false;

    // Auto-detection based on URL or configured Auth0 credentials
    const isAuth0Url = /auth0\.com/i.test(authServerUrl);
    const hasAuth0Creds = Boolean(
      config.auth0?.managementClientId ||
      process.env.AUTH0_MANAGEMENT_CLIENT_ID ||
      process.env.AUTH0_CLIENT_ID
    );

    return isAuth0Url || hasAuth0Creds;
  }

  private resolveDomain(context: JitContext, config: JitBridgeConfig): string {
    const raw =
      config.auth0?.domain ||
      process.env.AUTH0_DOMAIN ||
      context.authServerUrl;

    return raw.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  }

  private getManagementCredentials(config: JitBridgeConfig): { clientId: string; clientSecret: string } | null {
    const clientId =
      config.auth0?.managementClientId ||
      process.env.AUTH0_MANAGEMENT_CLIENT_ID ||
      process.env.AUTH0_CLIENT_ID ||
      process.env.OAUTH_CLIENT_ID ||
      process.env.COGNERD_CLIENT_ID;

    const clientSecret =
      config.auth0?.managementClientSecret ||
      process.env.AUTH0_MANAGEMENT_CLIENT_SECRET ||
      process.env.AUTH0_CLIENT_SECRET ||
      process.env.OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return null;
    }

    return { clientId, clientSecret };
  }

  /**
   * Acquire or return cached Auth0 Management API access token
   */
  async getManagementToken(domain: string, config: JitBridgeConfig): Promise<string> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt) {
      return this.tokenCache.accessToken;
    }

    const creds = this.getManagementCredentials(config);
    if (!creds) {
      throw new Error(
        'Auth0JitAdapter: Management credentials missing. Please set AUTH0_MANAGEMENT_CLIENT_ID and AUTH0_MANAGEMENT_CLIENT_SECRET.'
      );
    }

    const tokenUrl = `https://${domain}/oauth/token`;
    const audience = `https://${domain}/api/v2/`;

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        audience,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Auth0JitAdapter: Failed to obtain Management API token: HTTP ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as { access_token: string; expires_in: number };
    const expiresAt = Date.now() + (data.expires_in - 60) * 1000;

    this.tokenCache = {
      accessToken: data.access_token,
      expiresAt,
    };

    return data.access_token;
  }

  /**
   * Register a CIMD client in Auth0 and attach API grants
   */
  async registerClient(
    clientDoc: ClientIdMetadataDocument,
    context: JitContext,
    config: JitBridgeConfig
  ): Promise<JitClientRegistrationResult> {
    const externalId = clientDoc.client_id;
    const cached = this.clientCache.get(externalId);

    const redirectUris = clientDoc.redirect_uris || [];
    if (cached && Date.now() < cached.expiresAt) {
      // Check if all redirect URIs are already registered
      const hasAllCallbacks = redirectUris.every((uri) => cached.callbacks.has(uri));
      if (hasAllCallbacks) {
        context.logger?.debug?.(`Auth0JitAdapter: Client "${externalId}" is already cached and up to date.`);
        return { idpClientId: cached.auth0ClientId };
      }
    }

    const domain = this.resolveDomain(context, config);
    const token = await this.getManagementToken(domain, config);

    // 1. Search for existing client with this external identifier or name
    let auth0ClientId: string | null = null;
    let existingCallbacks: string[] = [];

    try {
      const searchRes = await fetch(
        `https://${domain}/api/v2/clients?fields=client_id,name,callbacks,client_metadata&include_fields=true&per_page=100`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );

      if (searchRes.ok) {
        const clients = (await searchRes.json()) as Array<{
          client_id: string;
          name: string;
          callbacks?: string[];
          client_metadata?: Record<string, string>;
        }>;

        const match = clients.find(
          (c) =>
            c.client_metadata?.external_client_id === externalId ||
            c.name === clientDoc.client_name ||
            c.name === externalId
        );

        if (match) {
          auth0ClientId = match.client_id;
          existingCallbacks = match.callbacks || [];
        }
      }
    } catch (err) {
      context.logger?.debug?.('Auth0JitAdapter: client lookup error, proceeding with creation', { error: err });
    }

    // 2. Create or Update Client in Auth0
    if (!auth0ClientId) {
      const clientName = clientDoc.client_name || `AI Agent (${externalId})`;
      const supportedMethods = Array.isArray(clientDoc.token_endpoint_auth_methods_supported)
        ? clientDoc.token_endpoint_auth_methods_supported
        : [];
      const isPublicClient =
        !clientDoc.token_endpoint_auth_method ||
        clientDoc.token_endpoint_auth_method === 'none' ||
        supportedMethods.includes('none');
      const resolvedAppType =
        clientDoc.application_type === 'native'
          ? 'native'
          : isPublicClient
          ? 'spa'
          : clientDoc.application_type || 'regular_web';

      const payload: Record<string, any> = {
        name: clientName,
        app_type: resolvedAppType,
        callbacks: redirectUris,
        grant_types: clientDoc.grant_types || ['authorization_code', 'refresh_token'],
        token_endpoint_auth_method: 'none', // OAuth 2.1 Public client with PKCE
        oidc_conformant: true,
        client_metadata: {
          external_client_id: externalId,
          external_metadata_type: 'cimd',
        },
      };

      if (clientDoc.logo_uri) {
        payload.logo_uri = clientDoc.logo_uri;
      }

      const createRes = await fetch(`https://${domain}/api/v2/clients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!createRes.ok) {
        const errorText = await createRes.text().catch(() => '');
        throw new Error(`Auth0JitAdapter: Failed to create client in Auth0: HTTP ${createRes.status} - ${errorText}`);
      }

      const created = (await createRes.json()) as { client_id: string };
      auth0ClientId = created.client_id;
      context.logger?.info?.(`Auth0JitAdapter: Created Auth0 client "${auth0ClientId}" for CIMD: ${externalId}`);
    } else {
      // Merge callbacks if new redirect URIs are present
      const combinedCallbacks = Array.from(new Set([...existingCallbacks, ...redirectUris]));
      if (combinedCallbacks.length > existingCallbacks.length) {
        await fetch(`https://${domain}/api/v2/clients/${auth0ClientId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ callbacks: combinedCallbacks }),
        });
        context.logger?.info?.(`Auth0JitAdapter: Updated callbacks for Auth0 client "${auth0ClientId}"`);
      }
    }

    // 3. Ensure Client Grant exists for the MCP Resource URI
    if (context.resourceUri && auth0ClientId) {
      try {
        const scopes = context.scopesSupported || ['read', 'write', 'admin'];
        const grantRes = await fetch(`https://${domain}/api/v2/client-grants`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            client_id: auth0ClientId,
            audience: context.resourceUri,
            scope: scopes,
          }),
        });

        // 409 Conflict means grant already exists, which is expected & successful
        if (!grantRes.ok && grantRes.status !== 409) {
          const grantErr = await grantRes.text().catch(() => '');
          context.logger?.warn?.(`Auth0JitAdapter: Client grant notice: ${grantRes.status} - ${grantErr}`);
        }
      } catch (err) {
        context.logger?.debug?.('Auth0JitAdapter: Client grant creation error', { error: err });
      }
    }

    // Cache registration with LRU eviction
    if (this.clientCache.size >= this.maxEntries && !this.clientCache.has(externalId)) {
      const oldestKey = this.clientCache.keys().next().value;
      if (oldestKey !== undefined) {
        this.clientCache.delete(oldestKey);
      }
    }
    const ttl = config.cacheTtlMs ?? this.defaultCacheTtlMs;
    this.clientCache.set(externalId, {
      auth0ClientId,
      callbacks: new Set(redirectUris),
      expiresAt: Date.now() + ttl,
    });

    return { idpClientId: auth0ClientId };
  }

  /**
   * Register an ephemeral callback URI (such as dynamic desktop/CLI loopback ports)
   */
  async registerCallback(
    clientId: string,
    redirectUri: string,
    context: JitContext,
    config: JitBridgeConfig
  ): Promise<void> {
    if (!redirectUri || !clientId) return;

    const domain = this.resolveDomain(context, config);
    const token = await this.getManagementToken(domain, config);

    try {
      const getRes = await fetch(`https://${domain}/api/v2/clients/${clientId}?fields=callbacks`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (getRes.ok) {
        const data = (await getRes.json()) as { callbacks?: string[] };
        const callbacks = data.callbacks || [];
        if (!callbacks.includes(redirectUri)) {
          callbacks.push(redirectUri);
          await fetch(`https://${domain}/api/v2/clients/${clientId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ callbacks }),
          });
          context.logger?.info?.(`Auth0JitAdapter: Added callback "${redirectUri}" to client "${clientId}"`);
        }
      }
    } catch (err) {
      context.logger?.debug?.('Auth0JitAdapter: registerCallback error', { error: err });
    }
  }
}
