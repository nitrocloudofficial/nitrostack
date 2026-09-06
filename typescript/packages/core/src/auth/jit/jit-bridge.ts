import { URL } from 'url';
import {
  isClientIdMetadataUrl,
  resolveClientIdMetadataDocument,
  validateRedirectUriWithCimd,
  ClientIdMetadataDocument,
} from '../cimd.js';
import { JitBridgeConfig, JitContext, JitProviderAdapter, JitClientRegistrationResult } from './types.js';
import { Auth0JitAdapter } from './adapters/auth0.adapter.js';
import { OktaJitAdapter } from './adapters/okta.adapter.js';
import { GenericDcrJitAdapter } from './adapters/generic-dcr.adapter.js';
import { PassthroughJitAdapter } from './adapters/passthrough.adapter.js';

/**
 * Multi-Provider JIT Dynamic Discovery Bridge
 *
 * Intercepts incoming OAuth authorization requests from AI agents (ChatGPT, Claude, Cursor),
 * dynamically registers them in the target Identity Provider (Auth0, Okta, Zitadel, Keycloak),
 * and seamlessly redirects the browser to the upstream IdP login screen.
 *
 * Also bridges token exchange requests (/oauth/v2/token) to translate dynamic CIMD client
 * identifiers to upstream IdP provisioned credentials.
 */
export class JitBridge {
  private adapters: JitProviderAdapter[] = [];
  private config: JitBridgeConfig;
  private clientMapping = new Map<string, string>(); // CIMD client_id URL -> upstream IdP client_id
  private reverseMapping = new Map<string, string>(); // upstream IdP client_id -> CIMD client_id URL
  private inflightRegistrations = new Map<string, Promise<JitClientRegistrationResult | void>>();
  private readonly maxCacheEntries: number;

  constructor(config?: JitBridgeConfig) {
    this.config = config || {};
    this.maxCacheEntries = 1000;
    this.registerDefaultAdapters();
  }

  /**
   * Store client mapping with LRU eviction when exceeding max capacity
   */
  private setMapping(externalId: string, idpClientId: string): void {
    if (this.clientMapping.size >= this.maxCacheEntries && !this.clientMapping.has(externalId)) {
      const oldestKey = this.clientMapping.keys().next().value;
      if (oldestKey !== undefined) {
        const oldestMapped = this.clientMapping.get(oldestKey);
        this.clientMapping.delete(oldestKey);
        if (oldestMapped) {
          this.reverseMapping.delete(oldestMapped);
        }
      }
    }
    this.clientMapping.set(externalId, idpClientId);
    this.reverseMapping.set(idpClientId, externalId);
  }

  /**
   * Register or resolve client in upstream IdP with in-flight request deduplication
   */
  private async ensureClientRegistered(
    clientDoc: ClientIdMetadataDocument,
    context: JitContext
  ): Promise<JitClientRegistrationResult | void> {
    const externalId = clientDoc.client_id;
    if (this.clientMapping.has(externalId)) {
      return { idpClientId: this.clientMapping.get(externalId)! };
    }

    const running = this.inflightRegistrations.get(externalId);
    if (running) {
      return running;
    }

    const adapter = this.getAdapter(context.authServerUrl);
    if (!adapter) {
      context.logger?.warn?.(`JitBridge: No matching provider adapter found for ${context.authServerUrl}`);
      return;
    }

    const promise = (async () => {
      try {
        context.logger?.info?.(`JitBridge: Running adapter "${adapter.name}" for client "${externalId}"`);
        const regResult = await adapter.registerClient(clientDoc, context, this.config);
        if (regResult?.idpClientId) {
          this.setMapping(externalId, regResult.idpClientId);
        }
        return regResult;
      } finally {
        this.inflightRegistrations.delete(externalId);
      }
    })();

    this.inflightRegistrations.set(externalId, promise);
    return promise;
  }

  /**
   * Register default built-in provider adapters
   */
  private registerDefaultAdapters(): void {
    this.adapters.push(new Auth0JitAdapter());
    this.adapters.push(new OktaJitAdapter());
    this.adapters.push(new GenericDcrJitAdapter());
    this.adapters.push(new PassthroughJitAdapter());
  }

  /**
   * Register a custom provider adapter
   */
  registerAdapter(adapter: JitProviderAdapter): void {
    this.adapters.unshift(adapter);
  }

  /**
   * Whether the JIT bridge is enabled for the current server configuration
   */
  isEnabled(authServerUrl: string): boolean {
    if (this.config.enabled !== undefined) {
      return this.config.enabled;
    }

    if (process.env.OAUTH_JIT_BRIDGE_ENABLED === 'false' || process.env.JIT_BRIDGE_ENABLED === 'false') {
      return false;
    }

    if (process.env.OAUTH_JIT_BRIDGE_ENABLED === 'true' || process.env.JIT_BRIDGE_ENABLED === 'true') {
      return true;
    }

    // Auto-enable if management credentials are provided or adapter can handle
    const adapter = this.getAdapter(authServerUrl);
    return Boolean(adapter);
  }

  /**
   * Resolve the appropriate provider adapter for the given authorization server
   */
  getAdapter(authServerUrl: string): JitProviderAdapter | null {
    for (const adapter of this.adapters) {
      if (adapter.canHandle(authServerUrl, this.config)) {
        return adapter;
      }
    }
    return null;
  }

  /**
   * Handle incoming GET /oauth/v2/authorize request
   */
  async handleAuthorizeRequest(
    req: any,
    res: any,
    context: JitContext,
    upstreamAuthEndpoint: string
  ): Promise<void> {
    const headers: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization',
    };

    if (req.method === 'OPTIONS') {
      if (typeof res.writeHead === 'function') {
        res.writeHead(204, headers);
        res.end();
      } else if (typeof res.status === 'function') {
        res.status(204).end();
      }
      return;
    }

    // Extract query parameters
    let searchParams: URLSearchParams;
    if (req.query && typeof req.query === 'object') {
      searchParams = new URLSearchParams();
      for (const [k, v] of Object.entries(req.query)) {
        if (Array.isArray(v)) {
          v.forEach((item) => searchParams.append(k, String(item)));
        } else if (v !== undefined && v !== null) {
          searchParams.set(k, String(v));
        }
      }
    } else {
      const rawUrl = req.url || '';
      const queryIdx = rawUrl.indexOf('?');
      searchParams = new URLSearchParams(queryIdx >= 0 ? rawUrl.slice(queryIdx + 1) : '');
    }

    const clientId = searchParams.get('client_id');
    let redirectUri = searchParams.get('redirect_uri');

    if (!clientId) {
      this.sendOAuthError(res, 400, 'invalid_request', 'Missing required parameter: client_id');
      return;
    }

    // If client_id is a CIMD metadata URL, resolve and auto-provision in upstream IdP
    if (isClientIdMetadataUrl(clientId)) {
      try {
        context.logger?.info?.(`JitBridge: Resolving Client ID Metadata Document for "${clientId}"`);
        const allowLoopback = this.config.allowLoopback ?? (process.env.NODE_ENV !== 'production');
        const clientDoc = await resolveClientIdMetadataDocument(clientId, { allowLoopback });

        // RFC 6749 / OAuth 2.1: If redirect_uri is omitted, validate against client metadata
        if (!redirectUri) {
          if (Array.isArray(clientDoc.redirect_uris) && clientDoc.redirect_uris.length > 1) {
            this.sendOAuthError(
              res,
              400,
              'invalid_request',
              'Parameter "redirect_uri" is required when client metadata document specifies multiple redirect URIs'
            );
            return;
          }
          if (Array.isArray(clientDoc.redirect_uris) && clientDoc.redirect_uris.length === 1) {
            redirectUri = clientDoc.redirect_uris[0];
            searchParams.set('redirect_uri', redirectUri);
          }
        } else if (!validateRedirectUriWithCimd(clientDoc, redirectUri)) {
          this.sendOAuthError(
            res,
            400,
            'invalid_request',
            `Requested redirect_uri "${redirectUri}" is not authorized in client metadata document`
          );
          return;
        }

        const regResult = await this.ensureClientRegistered(clientDoc, context);
        if (regResult?.idpClientId) {
          // Replace client_id parameter with the upstream IdP registered client ID
          searchParams.set('client_id', regResult.idpClientId);
        }
      } catch (err: any) {
        context.logger?.error?.(`JitBridge: Failed to process CIMD for "${clientId}": ${err.message || String(err)}`);
        this.sendOAuthError(
          res,
          400,
          'invalid_client',
          `Could not resolve client metadata document: ${err.message || 'Validation error'}`
        );
        return;
      }
    } else if (redirectUri && (redirectUri.includes('127.0.0.1') || redirectUri.includes('localhost'))) {
      // Ephemeral desktop loopback redirect URI (Cursor, Claude Desktop)
      const adapter = this.getAdapter(context.authServerUrl);
      if (adapter?.registerCallback) {
        try {
          await adapter.registerCallback(clientId, redirectUri, context, this.config);
        } catch (err) {
          context.logger?.debug?.('JitBridge: callback registration notice', { error: err });
        }
      }
    }

    // Map RFC 8707 'resource' parameter to Auth0/IdP 'audience' parameter if missing
    if (!searchParams.has('audience')) {
      const resource = searchParams.get('resource') || context.resourceUri;
      if (resource) {
        searchParams.set('audience', resource);
      }
    }

    // 302 Redirect to upstream Authorization Server /authorize endpoint
    const separator = upstreamAuthEndpoint.includes('?') ? '&' : '?';
    const targetRedirectUrl = `${upstreamAuthEndpoint}${separator}${searchParams.toString()}`;

    context.logger?.info?.(`JitBridge: Redirecting client to upstream IdP: ${upstreamAuthEndpoint}`);

    if (typeof res.redirect === 'function') {
      res.redirect(302, targetRedirectUrl);
      return;
    }

    if (typeof res.writeHead === 'function') {
      res.writeHead(302, {
        Location: targetRedirectUrl,
        'Cache-Control': 'no-store',
        'Pragma': 'no-cache',
        ...headers,
      });
      res.end();
      return;
    }

    if (typeof res.setHeader === 'function') {
      res.setHeader('Location', targetRedirectUrl);
      res.setHeader('Cache-Control', 'no-store');
      if (typeof res.status === 'function') {
        res.status(302).end();
      }
    }
  }

  /**
   * Handle incoming POST /oauth/v2/token request
   */
  async handleTokenRequest(
    req: any,
    res: any,
    context: JitContext,
    upstreamTokenEndpoint: string
  ): Promise<void> {
    const headers: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization',
    };

    if (req.method === 'OPTIONS') {
      if (typeof res.writeHead === 'function') {
        res.writeHead(204, headers);
        res.end();
      } else if (typeof res.status === 'function') {
        res.status(204).end();
      }
      return;
    }

    // Read and parse request body (support JSON, urlencoded form, or raw stream)
    let bodyObj: Record<string, any> = {};
    let isJson = false;

    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body) && Object.keys(req.body).length > 0) {
      bodyObj = { ...req.body };
      isJson = req.headers?.['content-type']?.includes('application/json');
    } else {
      try {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        }
        if (chunks.length > 0) {
          const rawBody = Buffer.concat(chunks).toString('utf-8');
          const contentType = req.headers?.['content-type'] || '';
          if (contentType.includes('application/json')) {
            bodyObj = JSON.parse(rawBody);
            isJson = true;
          } else {
            const params = new URLSearchParams(rawBody);
            for (const [k, v] of params.entries()) {
              bodyObj[k] = v;
            }
          }
        }
      } catch (err) {
        context.logger?.debug?.('JitBridge: failed to parse token request body', { error: err });
      }
    }

    // Merge query parameters if present (fallback for GET/POST query args)
    if (req.query && typeof req.query === 'object') {
      for (const [k, v] of Object.entries(req.query)) {
        if (bodyObj[k] === undefined && v !== undefined) {
          bodyObj[k] = Array.isArray(v) ? v[0] : v;
        }
      }
    }

    let authHeader = req.headers?.authorization;

    // Handle Authorization: Basic <base64(client_id:client_secret)> translation
    if (authHeader && typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('basic ')) {
      try {
        const b64 = authHeader.slice(6).trim();
        const decoded = Buffer.from(b64, 'base64').toString('utf-8');
        const colonIdx = decoded.indexOf(':');
        const rawBasicClientId = colonIdx >= 0 ? decoded.slice(0, colonIdx) : decoded;
        const basicSecret = colonIdx >= 0 ? decoded.slice(colonIdx + 1) : '';
        const basicClientId = decodeURIComponent(rawBasicClientId);

        if (basicClientId) {
          if (!this.clientMapping.has(basicClientId) && isClientIdMetadataUrl(basicClientId)) {
            const allowLoopback = this.config.allowLoopback ?? (process.env.NODE_ENV !== 'production');
            const clientDoc = await resolveClientIdMetadataDocument(basicClientId, { allowLoopback });
            await this.ensureClientRegistered(clientDoc, context);
          }

          if (this.clientMapping.has(basicClientId)) {
            const mappedBasicId = this.clientMapping.get(basicClientId)!;
            context.logger?.info?.(`JitBridge: Mapping Basic Auth client_id "${basicClientId}" -> "${mappedBasicId}"`);
            const encodedMapped = `${encodeURIComponent(mappedBasicId)}:${basicSecret}`;
            authHeader = `Basic ${Buffer.from(encodedMapped).toString('base64')}`;
          }
        }
      } catch (err) {
        context.logger?.debug?.('JitBridge: basic auth translation notice', { error: err });
      }
    }

    // If client_id is in the body, resolve and map to upstream IdP client ID
    let reqClientId = bodyObj.client_id;

    if (reqClientId && !this.clientMapping.has(reqClientId) && isClientIdMetadataUrl(reqClientId)) {
      try {
        const allowLoopback = this.config.allowLoopback ?? (process.env.NODE_ENV !== 'production');
        const clientDoc = await resolveClientIdMetadataDocument(reqClientId, { allowLoopback });
        await this.ensureClientRegistered(clientDoc, context);
      } catch (err) {
        context.logger?.debug?.('JitBridge: on-the-fly token CIMD lookup notice', { error: err });
      }
    }

    if (reqClientId && this.clientMapping.has(reqClientId)) {
      const mappedId = this.clientMapping.get(reqClientId)!;
      context.logger?.info?.(`JitBridge: Mapping token client_id "${reqClientId}" -> "${mappedId}"`);
      bodyObj.client_id = mappedId;
    }

    // Prepare upstream fetch body
    let upstreamBody: string;
    let upstreamContentType: string;

    if (isJson) {
      upstreamBody = JSON.stringify(bodyObj);
      upstreamContentType = 'application/json';
    } else {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(bodyObj)) {
        if (v !== undefined && v !== null) {
          params.append(k, String(v));
        }
      }
      upstreamBody = params.toString();
      upstreamContentType = 'application/x-www-form-urlencoded';
    }

    try {
      context.logger?.info?.(`JitBridge: Forwarding token exchange to upstream: ${upstreamTokenEndpoint}`);
      const upstreamRes = await fetch(upstreamTokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': upstreamContentType,
          Accept: 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: upstreamBody,
      });

      const responseText = await upstreamRes.text();
      const responseContentType = upstreamRes.headers?.get?.('content-type') || 'application/json';

      if (typeof res.writeHead === 'function') {
        res.writeHead(upstreamRes.status, {
          'Content-Type': responseContentType,
          'Cache-Control': 'no-store',
          'Pragma': 'no-cache',
          ...headers,
        });
        res.end(responseText);
        return;
      }

      if (typeof res.status === 'function') {
        res.status(upstreamRes.status);
        res.set?.('Content-Type', responseContentType);
        res.set?.('Cache-Control', 'no-store');
        res.send(responseText);
        return;
      }

      if (typeof res.end === 'function') {
        res.end(responseText);
      }
    } catch (err: any) {
      context.logger?.error?.('JitBridge: Failed to forward token request to upstream', { error: err });
      this.sendOAuthError(res, 502, 'server_error', `Upstream token endpoint failed: ${err.message || String(err)}`);
    }
  }

  private sendOAuthError(res: any, status: number, error: string, description: string): void {
    const payload = JSON.stringify({ error, error_description: description });

    if (typeof res.writeHead === 'function') {
      res.writeHead(status, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(payload);
      return;
    }

    if (typeof res.status === 'function') {
      res.status(status);
      if (typeof res.send === 'function') {
        res.send(payload);
        return;
      }
      if (typeof res.json === 'function') {
        res.json({ error, error_description: description });
        return;
      }
    }

    if (typeof res.end === 'function') {
      res.end(payload);
    }
  }
}
