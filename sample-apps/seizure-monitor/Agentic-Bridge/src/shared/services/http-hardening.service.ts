/**
 * Transport-layer hardening: payload limits and the remote authorisation edge.
 *
 * Two requirements from the architecture land here, both of which NitroStack
 * 1.0.x does not yet expose as configuration:
 *
 *   1. "Override the default behavior with explicit configurations (e.g.
 *      express.json({ limit: '50mb' })) so the ingestion of massive log files or
 *      multi-year Jira exports does not overwhelm the server's memory."
 *      NitroStack's Streamable HTTP transport calls a bare `express.json()`,
 *      which is body-parser's 100kb default — two orders of magnitude below what
 *      `ingest_manual_document` is designed to accept. Upstream tracks this as
 *      nitrostack#4; until it ships, we install the limit ourselves.
 *
 *   2. "API key authentication and JWT validation ... securing all remote
 *      endpoints from unauthorized execution and ensuring that only the
 *      designated Admin Dashboard can alter workflow states or resolve
 *      conflicts."
 *
 * Both are done without patching the dependency on disk. The limit is applied by
 * decorating `express.json` on the exact express instance the transport imports,
 * before the transport is constructed; the auth edge is registered on the
 * transport's Express app during `onApplicationBootstrap`, which NitroStack runs
 * after the transport exists but before it registers its routes and listens.
 * That ordering is what makes `app.use()` land in front of `/mcp` rather than
 * behind it.
 */
import { Injectable } from '@nitrostack/core';
import type { OnApplicationBootstrap } from '@nitrostack/core';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import { AuthService, AuthError } from './auth.service.js';
import { isProtectedTool } from '../security/protected-tools.js';

/** Spec default. Override with BRIDGE_JSON_BODY_LIMIT (any body-parser size string). */
export const DEFAULT_JSON_BODY_LIMIT = '50mb';

/** Records what actually happened, so the health check can report it honestly. */
export interface HardeningState {
  jsonBodyLimit: string;
  /** How the limit was installed, or why it was not. */
  jsonBodyLimitVia: 'express-patch' | 'router-stack' | 'failed' | 'not-applied';
  jsonBodyLimitError?: string;
  authEnabled: boolean;
  authScope: 'mutations' | 'all';
  /** True once the Express auth edge is registered on the HTTP transport. */
  httpEdgeInstalled: boolean;
  /** Unprefixed liveness paths this process answers, for the boot banner. */
  probePathsMounted: string[];
}

const state: HardeningState = {
  jsonBodyLimit: DEFAULT_JSON_BODY_LIMIT,
  jsonBodyLimitVia: 'not-applied',
  authEnabled: false,
  authScope: 'mutations',
  httpEdgeInstalled: false,
  probePathsMounted: [],
};

export function hardeningState(): Readonly<HardeningState> {
  return state;
}

export function configuredJsonBodyLimit(): string {
  return process.env.BRIDGE_JSON_BODY_LIMIT?.trim() || DEFAULT_JSON_BODY_LIMIT;
}

/**
 * Minimal shape of the express module we depend on. Typing it structurally keeps
 * this file free of a direct dependency on express's own types, which are not
 * installed at the top level (NitroStack nests its own express 4).
 */
interface ExpressLike {
  json: (options?: { limit?: string }) => unknown;
}

/**
 * Resolve the express instance `@nitrostack/core` will import.
 *
 * This matters: the project's own top-level express is a different major (5.x)
 * and a *different module object*. Patching that one would silently do nothing.
 * Resolving from the core package's entry point walks the same lookup Node will
 * perform for the transport's `import express from 'express'`, and because
 * express is CommonJS both resolutions share one cached module object.
 */
function resolveNitroStackExpressPath(): string {
  const fromHere = createRequire(import.meta.url);
  const coreEntry = fromHere.resolve('@nitrostack/core');
  return createRequire(coreEntry).resolve('express');
}

/**
 * Install the JSON body limit. MUST be called before `server.start()`, because
 * the transport constructor calls `express.json()` while building its middleware
 * stack and the parser closes over its options at that point.
 *
 * Failure is reported, never thrown: a body limit that could not be raised is a
 * capability regression, not a reason to refuse to boot.
 */
export async function applyJsonBodyLimit(
  limit: string = configuredJsonBodyLimit()
): Promise<HardeningState> {
  state.jsonBodyLimit = limit;
  try {
    const expressPath = resolveNitroStackExpressPath();
    const expressModule = (await import(pathToFileURL(expressPath).href)) as {
      default: ExpressLike;
    };
    const express = expressModule.default;
    const original = express.json.bind(express);

    // Callers who pass an explicit limit still win; NitroStack passes nothing,
    // which is precisely the case we are here to fix.
    express.json = (options?: { limit?: string }) => original({ limit, ...(options ?? {}) });

    state.jsonBodyLimitVia = 'express-patch';
    delete state.jsonBodyLimitError;
  } catch (error) {
    state.jsonBodyLimitVia = 'failed';
    state.jsonBodyLimitError = error instanceof Error ? error.message : String(error);
  }
  return state;
}

/** Express layer shape we reach into for the fallback path. */
interface RouterLayer {
  name?: string;
  handle?: unknown;
}
interface ExpressAppLike {
  use: (...handlers: unknown[]) => unknown;
  get?: (path: string, ...handlers: unknown[]) => unknown;
  _router?: { stack: RouterLayer[] };
  router?: { stack: RouterLayer[] };
}

/**
 * Root-level liveness paths.
 *
 * NitroStack mounts its own health route under the MCP endpoint — `/mcp/health`
 * — but orchestrators (NitroCloud, Kubernetes, Cloud Run, ECS) probe an
 * unprefixed path and mark a deployment failed when it 404s. The app being
 * demonstrably up while the platform reports a failed rollout is the exact
 * symptom that produces. These are aliases, not a second health system.
 */
const PROBE_PATHS = ['/health', '/healthz', '/readyz', '/livez'];

function routerStack(app: ExpressAppLike): RouterLayer[] | null {
  return app._router?.stack ?? app.router?.stack ?? null;
}

/**
 * Is this request a health/liveness probe?
 *
 * Covers the root aliases mounted above and the framework's own
 * `<endpoint>/health` (`/mcp/health`, `/sse/health`), whatever endpoint the
 * transport was configured with.
 */
function isHealthPath(req: { path?: string; url?: string }): boolean {
  const raw = req.path ?? req.url ?? '';
  const path = raw.split('?')[0].replace(/\/+$/, '') || '/';
  return PROBE_PATHS.includes(path) || path.endsWith('/health');
}

@Injectable({ deps: [AuthService] })
export class HttpHardeningService implements OnApplicationBootstrap {
  constructor(private auth: AuthService) {}

  /**
   * NitroStack's start sequence is: build the HTTP transport → start dynamic
   * modules → fire `onApplicationBootstrap` → register routes and listen. This
   * hook is therefore the last point at which a middleware can be placed in
   * front of `/mcp`.
   */
  async onApplicationBootstrap(): Promise<void> {
    state.authEnabled = this.auth.enabled;
    state.authScope = process.env.BRIDGE_AUTH_SCOPE === 'all' ? 'all' : 'mutations';

    // Imported lazily: pulling the registry in at module scope would create an
    // import cycle through the modules that depend on this service.
    const { getServer } = await import('./server-registry.js');
    // `getHttpTransport()` is declared as the base HttpTransport, which does not
    // surface `getApp()`; the Streamable HTTP implementation it actually returns
    // does. Narrow structurally rather than asserting the concrete class, so a
    // future transport without an Express app degrades to "stdio" instead of
    // throwing during bootstrap.
    const transport = getServer()?.getHttpTransport?.() as
      | { getApp?: () => ExpressAppLike }
      | undefined;
    const app = transport?.getApp?.();
    if (!app) return; // stdio — nothing to harden at the HTTP layer.

    await this.ensureJsonBodyLimit(app);

    // Before the auth edge, deliberately: a readiness probe arrives without a
    // credential, and a 401 fails a rollout just as surely as a 404.
    this.mountProbeRoutes(app);

    app.use(this.authEdge());
    app.use(this.payloadErrorHandler());
    state.httpEdgeInstalled = true;
  }

  /**
   * Answer the unprefixed liveness paths an orchestrator expects.
   *
   * Reports 200 as soon as the process is serving. This is deliberately a
   * liveness signal and not an aggregate of the `@HealthCheck` classes: those
   * report `degraded` for conditions that are perfectly legitimate in a
   * container — no admin key on a private network, no git binary, fixtures
   * instead of live Jira — and failing a deployment for any of them would be
   * wrong. `/mcp/health` and the `health://checks` resource still carry the
   * detailed per-subsystem view.
   */
  private mountProbeRoutes(app: ExpressAppLike): void {
    if (typeof app.get !== 'function') return;

    for (const path of PROBE_PATHS) {
      try {
        app.get(path, (_req: HttpRequestLike, res: HttpResponseLike) => {
          res.status(200).json({
            status: 'ok',
            service: 'enterprise-agentic-bridge',
            uptimeSeconds: Math.round(process.uptime()),
            mcpEndpoint: '/mcp',
          });
        });
        state.probePathsMounted.push(path);
      } catch {
        // A path already claimed by the framework is fine — theirs answers.
      }
    }
  }

  /**
   * Belt and braces for the body limit.
   *
   * If `applyJsonBodyLimit` ran before `start()` the transport already holds a
   * 50mb parser and there is nothing to do. If it did not — a bundler rewrote
   * the resolution, the module graph differs under a future NitroStack — the
   * transport is holding a 100kb parser, and the only remaining fix is to swap
   * that layer's handler out of the router stack in place. Registering another
   * `express.json()` behind it would not help: the first parser consumes the
   * stream and throws before the second is ever reached.
   */
  private async ensureJsonBodyLimit(app: ExpressAppLike): Promise<void> {
    if (state.jsonBodyLimitVia === 'express-patch') return;

    const stack = routerStack(app);
    const layer = stack?.find((entry) => entry.name === 'jsonParser');
    if (!layer) {
      state.jsonBodyLimitVia = 'failed';
      state.jsonBodyLimitError =
        state.jsonBodyLimitError ?? 'no jsonParser layer found on the transport router';
      return;
    }

    try {
      const expressPath = resolveNitroStackExpressPath();
      const expressModule = (await import(pathToFileURL(expressPath).href)) as {
        default: ExpressLike;
      };
      layer.handle = expressModule.default.json({ limit: state.jsonBodyLimit });
      state.jsonBodyLimitVia = 'router-stack';
      delete state.jsonBodyLimitError;
    } catch (error) {
      state.jsonBodyLimitVia = 'failed';
      state.jsonBodyLimitError = error instanceof Error ? error.message : String(error);
    }
  }

  /**
   * The remote authorisation edge.
   *
   * Runs after the JSON body has been parsed, so it can read the JSON-RPC method
   * and tool name and apply the credential requirement only where it belongs.
   * On success the credential is copied into the call's `_meta`, which is what
   * lets `AdminGuard` re-verify the same principal downstream without the HTTP
   * layer having to reach into tool execution.
   */
  private authEdge() {
    // Typed structurally rather than against express's own request/response
    // interfaces, which are not available at the top level of this project.
    return (req: HttpRequestLike, res: HttpResponseLike, next: (error?: unknown) => void): void => {
      if (!this.auth.enabled) return next();

      // Health endpoints are never gated, under any scope. `all` is meant to
      // cover the MCP protocol surface, not to make the service unmonitorable:
      // an orchestrator's probe arrives without a credential, and a 401 there
      // fails the rollout of an otherwise healthy container.
      if (isHealthPath(req)) return next();

      const body = req.body as JsonRpcCall | JsonRpcCall[] | undefined;
      const calls = Array.isArray(body) ? body : body ? [body] : [];

      // Scope `all` covers the request, not just the calls in it: the SSE stream
      // (GET /mcp) and session teardown (DELETE /mcp) carry no body, and keying
      // off the parsed calls would wave both straight through.
      const needsCredential =
        state.authScope === 'all' ||
        calls.some((call) => call?.method === 'tools/call' && isProtectedTool(call?.params?.name));
      if (!needsCredential) return next();

      try {
        const principal = this.auth.authenticate({
          apiKey: headerValue(req, 'x-api-key'),
          authorization: headerValue(req, 'authorization'),
        });

        // Hand the verified credential down to AdminGuard via `_meta`. Without
        // this the guard would reject an already-authenticated HTTP caller,
        // because MCP does not propagate transport headers into tool context.
        for (const call of calls) {
          if (call?.method !== 'tools/call' || !call.params) continue;
          const args = (call.params.arguments ??= {});
          const meta = ((args as Record<string, unknown>)._meta ??= {}) as Record<string, unknown>;
          meta.apiKey = headerValue(req, 'x-api-key');
          meta.authorization = headerValue(req, 'authorization');
          meta.authenticatedSubject = principal.subject;
        }
        return next();
      } catch (error) {
        const status = error instanceof AuthError ? error.status : 403;
        const message = error instanceof Error ? error.message : 'Unauthorized.';
        res.status(status).json({
          jsonrpc: '2.0',
          id: calls[0]?.id ?? null,
          // -32001 is the reserved implementation-defined server error range;
          // MCP has no dedicated auth code.
          error: { code: -32001, message },
        });
        return;
      }
    };
  }

  /**
   * Turn body-parser's 413 into something an operator can act on. Registered
   * after the parser layer, so it is the first error handler the failure reaches.
   */
  private payloadErrorHandler() {
    return (
      error: (Error & { type?: string; status?: number; statusCode?: number }) | undefined,
      _req: HttpRequestLike,
      res: HttpResponseLike,
      next: (error?: unknown) => void
    ): void => {
      const status = error?.status ?? error?.statusCode;
      if (!error || (error.type !== 'entity.too.large' && status !== 413)) {
        return next(error);
      }
      res.status(413).json({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32001,
          message:
            `Request body exceeds the configured limit of ${state.jsonBodyLimit}. ` +
            `Raise it with BRIDGE_JSON_BODY_LIMIT, or chunk the document and call ` +
            `ingest_manual_document once per chunk.`,
        },
      });
    };
  }
}

/* ------------------------------------------------------------------ *
 * Structural types for the Express objects we touch
 * ------------------------------------------------------------------ */

interface HttpRequestLike {
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
  get?: (name: string) => string | undefined;
  path?: string;
  url?: string;
}

interface HttpResponseLike {
  status: (code: number) => { json: (body: unknown) => unknown };
}

interface JsonRpcCall {
  id?: unknown;
  method?: string;
  params?: { name?: string; arguments?: unknown };
}

function headerValue(req: HttpRequestLike, name: string): string | undefined {
  const raw = req.headers?.[name] ?? req.get?.(name);
  if (Array.isArray(raw)) return raw[0];
  return typeof raw === 'string' ? raw : undefined;
}
