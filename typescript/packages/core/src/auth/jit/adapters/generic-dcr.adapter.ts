import { ClientIdMetadataDocument } from '../../cimd.js';
import { JitBridgeConfig, JitContext, JitProviderAdapter, JitClientRegistrationResult } from '../types.js';

/**
 * Generic RFC 7591 Dynamic Client Registration Adapter
 *
 * Compatible with Zitadel, Keycloak, Ory Hydra, and any RFC 7591 compliant
 * authorization server.
 */
export class GenericDcrJitAdapter implements JitProviderAdapter {
  readonly name = 'generic-dcr';

  private clientCache = new Map<string, JitClientRegistrationResult>();
  private readonly maxEntries: number;

  constructor(options?: { maxEntries?: number }) {
    this.maxEntries = options?.maxEntries ?? 1000;
  }

  canHandle(authServerUrl: string, config: JitBridgeConfig): boolean {
    if (config.provider === 'generic-dcr' || config.provider === 'keycloak') return true;
    if (config.provider && config.provider !== 'auto') return false;

    // Detect Zitadel, Keycloak, or generic DCR configurations
    const isKnownDcrProvider = /zitadel|keycloak|hydra/i.test(authServerUrl);
    const hasDcrConfig = Boolean(
      config.genericDcr?.registrationEndpoint ||
      process.env.DCR_REGISTRATION_ENDPOINT ||
      process.env.ZITADEL_DOMAIN ||
      process.env.KEYCLOAK_URL
    );

    return isKnownDcrProvider || hasDcrConfig;
  }

  private async resolveRegistrationEndpoint(context: JitContext, config: JitBridgeConfig): Promise<string> {
    if (config.genericDcr?.registrationEndpoint) {
      return config.genericDcr.registrationEndpoint;
    }

    if (process.env.DCR_REGISTRATION_ENDPOINT) {
      return process.env.DCR_REGISTRATION_ENDPOINT;
    }

    // Try discovering registration_endpoint from upstream metadata
    const base = context.authServerUrl.replace(/\/+$/, '');
    for (const suffix of ['/.well-known/openid-configuration', '/.well-known/oauth-authorization-server']) {
      try {
        const res = await fetch(`${base}${suffix}`);
        if (res.ok) {
          const data = (await res.json()) as { registration_endpoint?: string };
          if (data.registration_endpoint) {
            return data.registration_endpoint;
          }
        }
      } catch {}
    }

    // Standard default paths for Keycloak / Zitadel
    if (/keycloak/i.test(base)) {
      return `${base}/clients-registrations/openid-connect`;
    }

    return `${base}/oauth/v2/register`;
  }

  async registerClient(
    clientDoc: ClientIdMetadataDocument,
    context: JitContext,
    config: JitBridgeConfig
  ): Promise<JitClientRegistrationResult> {
    const externalId = clientDoc.client_id;
    const cached = this.clientCache.get(externalId);
    if (cached) {
      return cached;
    }

    const regEndpoint = await this.resolveRegistrationEndpoint(context, config);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const initialToken = config.genericDcr?.initialAccessToken || process.env.DCR_INITIAL_ACCESS_TOKEN;
    if (initialToken) {
      headers['Authorization'] = `Bearer ${initialToken}`;
    }

    const payload = {
      client_name: clientDoc.client_name || `AI Agent (${externalId})`,
      redirect_uris: clientDoc.redirect_uris,
      response_types: ['code'],
      grant_types: clientDoc.grant_types || ['authorization_code', 'refresh_token'],
      token_endpoint_auth_method: 'none',
      application_type: clientDoc.application_type || 'web',
      logo_uri: clientDoc.logo_uri,
      client_uri: clientDoc.client_uri,
    };

    const response = await fetch(regEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok && response.status !== 409) {
      const err = await response.text().catch(() => '');
      throw new Error(`GenericDcrJitAdapter: Registration failed on ${regEndpoint}: HTTP ${response.status} - ${err}`);
    }

    let result: JitClientRegistrationResult = { idpClientId: externalId };

    context.logger?.info?.(`GenericDcrJitAdapter: Registered client "${externalId}" on ${regEndpoint}`);
    if (response.ok) {
      try {
        const data = (await response.json()) as { client_id?: string; client_secret?: string };
        result = {
          idpClientId: data.client_id || externalId,
          clientSecret: data.client_secret,
        };
      } catch {}
    }

    // Set with LRU eviction
    if (this.clientCache.size >= this.maxEntries && !this.clientCache.has(externalId)) {
      const oldestKey = this.clientCache.keys().next().value;
      if (oldestKey !== undefined) {
        this.clientCache.delete(oldestKey);
      }
    }
    this.clientCache.set(externalId, result);

    return result;
  }
}
