import { ClientIdMetadataDocument } from '../../cimd.js';
import { JitBridgeConfig, JitContext, JitProviderAdapter, JitClientRegistrationResult } from '../types.js';

/**
 * Okta JIT Dynamic Discovery Provider Adapter
 *
 * Implements client dynamic registration against Okta OAuth 2.0 Dynamic Client Registration
 * API (/oauth2/v1/clients) and Okta Apps API.
 */
export class OktaJitAdapter implements JitProviderAdapter {
  readonly name = 'okta';

  private clientCache = new Map<string, JitClientRegistrationResult>();
  private readonly maxEntries: number;

  constructor(options?: { maxEntries?: number }) {
    this.maxEntries = options?.maxEntries ?? 1000;
  }

  canHandle(authServerUrl: string, config: JitBridgeConfig): boolean {
    if (config.provider === 'okta') return true;
    if (config.provider && config.provider !== 'auto') return false;

    const isOktaUrl = /okta\.com|oktapreview\.com/i.test(authServerUrl);
    const hasOktaCreds = Boolean(
      config.okta?.apiToken ||
      process.env.OKTA_API_TOKEN ||
      process.env.OKTA_DOMAIN
    );

    return isOktaUrl || hasOktaCreds;
  }

  private resolveDomain(context: JitContext, config: JitBridgeConfig): string {
    const raw =
      config.okta?.domain ||
      process.env.OKTA_DOMAIN ||
      context.authServerUrl;

    return raw.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
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

    const domain = this.resolveDomain(context, config);
    const apiToken = config.okta?.apiToken || process.env.OKTA_API_TOKEN;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (apiToken) {
      headers['Authorization'] = `SSWS ${apiToken}`;
    }

    const payload = {
      client_name: clientDoc.client_name || `AI Agent (${externalId})`,
      redirect_uris: clientDoc.redirect_uris,
      response_types: ['code'],
      grant_types: clientDoc.grant_types || ['authorization_code', 'refresh_token'],
      token_endpoint_auth_method: 'none',
      application_type: clientDoc.application_type || 'web',
      logo_uri: clientDoc.logo_uri,
    };

    const dcrEndpoint = `https://${domain}/oauth2/v1/clients`;
    const response = await fetch(dcrEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok && response.status !== 409) {
      const err = await response.text().catch(() => '');
      throw new Error(`OktaJitAdapter: DCR registration failed on ${dcrEndpoint}: HTTP ${response.status} - ${err}`);
    }

    let result: JitClientRegistrationResult = { idpClientId: externalId };

    context.logger?.info?.(`OktaJitAdapter: Registered client for "${externalId}" on Okta`);
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
