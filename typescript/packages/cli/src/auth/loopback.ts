import http from 'http';
import { AddressInfo } from 'net';
import crypto from 'crypto';
import { DEFAULT_CLOUD_URL } from './token-store.js';

export interface AuthCallbackResult {
  token: string;
  apiUrl?: string;
}

export interface LoopbackAuthOptions {
  timeoutMs?: number;
  onServerReady?: (url: string) => void | Promise<void>;
  state?: string;
  port?: number;
  /** Extra API hosts allowed from the callback (in addition to defaults). */
  allowedApiHosts?: string[];
}

const DEFAULT_ALLOWED_API_HOST_SUFFIXES = [
  'nitrocloud.ai',
  'localhost',
  '127.0.0.1',
];

/**
 * Escape text for safe interpolation into HTML pages.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Allowlist apiUrl from the auth callback to known NitroCloud hosts.
 */
export function sanitizeCallbackApiUrl(
  apiUrl: string | undefined,
  allowedHosts: string[] = DEFAULT_ALLOWED_API_HOST_SUFFIXES,
): string | undefined {
  if (!apiUrl) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(apiUrl);
  } catch {
    return undefined;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return undefined;
  }
  const host = parsed.hostname.toLowerCase();
  const allowed = allowedHosts.some((suffix) => {
    const normalized = suffix.toLowerCase();
    return host === normalized || host.endsWith(`.${normalized}`);
  });
  if (!allowed) {
    return undefined;
  }
  // Prefer https outside local loopback
  if (
    parsed.protocol === 'http:' &&
    host !== 'localhost' &&
    host !== '127.0.0.1'
  ) {
    return undefined;
  }
  return parsed.toString().replace(/\/+$/, '');
}

/**
 * Renders a branded HTML page shown in the browser upon successful CLI authorization.
 */
export function renderSuccessHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NitroStack CLI - Authenticated</title>
  <style>
    :root {
      --bg: #09090b;
      --card-bg: #18181b;
      --border: #27272a;
      --text: #fafafa;
      --text-muted: #a1a1aa;
      --brand-signal: #187cf4;
      --brand-mint: #10b981;
    }
    * { box-sizing: border-box; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 24px;
    }
    .card {
      background-color: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 40px 36px;
      max-width: 440px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
      animation: fadeIn 0.4s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .icon-wrapper {
      width: 56px;
      height: 56px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }
    .icon-wrapper svg {
      stroke: var(--brand-mint);
    }
    h1 {
      font-size: 22px;
      font-weight: 600;
      margin: 0 0 10px 0;
      letter-spacing: -0.01em;
    }
    p {
      color: var(--text-muted);
      font-size: 14px;
      margin: 0;
      line-height: 1.6;
    }
    .badge {
      display: inline-block;
      margin-top: 24px;
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 500;
      color: var(--brand-signal);
      background: rgba(24, 124, 244, 0.1);
      border: 1px solid rgba(24, 124, 244, 0.25);
      border-radius: 9999px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-wrapper">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
    <h1>Authentication Successful!</h1>
    <p>Your NitroStack CLI session has been authorized. You can safely close this browser window and return to your terminal.</p>
    <div class="badge">NitroStack MCP Engine</div>
  </div>
</body>
</html>`;
}

/**
 * Renders an error HTML page for loopback failures (title/message must already be escaped).
 */
export function renderErrorHtml(title: string, message: string): string {
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NitroStack CLI - ${safeTitle}</title>
  <style>
    :root {
      --bg: #09090b;
      --card-bg: #18181b;
      --border: #27272a;
      --text: #fafafa;
      --text-muted: #a1a1aa;
      --brand-error: #ef4444;
    }
    * { box-sizing: border-box; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 24px;
    }
    .card {
      background-color: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 40px 36px;
      max-width: 440px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
    }
    .icon-wrapper {
      width: 56px;
      height: 56px;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }
    .icon-wrapper svg {
      stroke: var(--brand-error);
    }
    h1 {
      font-size: 22px;
      font-weight: 600;
      margin: 0 0 10px 0;
    }
    p {
      color: var(--text-muted);
      font-size: 14px;
      margin: 0;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-wrapper">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </div>
    <h1>${safeTitle}</h1>
    <p>${safeMessage}</p>
  </div>
</body>
</html>`;
}

/**
 * Bridge page that moves token from URL fragment (preferred) or legacy query into a POST body,
 * so the bearer token is not left in browser history / Referer when possible.
 */
function renderFragmentBridgeHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NitroStack CLI - Completing Authentication</title>
</head>
<body>
  <p>Completing authentication…</p>
  <script>
    (function () {
      function paramsFrom(source) {
        var out = {};
        source.replace(/^[#?]/, '').split('&').forEach(function (part) {
          if (!part) return;
          var idx = part.indexOf('=');
          var key = idx >= 0 ? part.slice(0, idx) : part;
          var val = idx >= 0 ? part.slice(idx + 1) : '';
          try {
            out[decodeURIComponent(key)] = decodeURIComponent(val || '');
          } catch (e) {}
        });
        return out;
      }
      var fromHash = paramsFrom(location.hash || '');
      var fromQuery = paramsFrom(location.search || '');
      var payload = {
        token: fromHash.token || fromQuery.token || '',
        state: fromHash.state || fromQuery.state || '',
        apiUrl: fromHash.apiUrl || fromQuery.apiUrl || '',
        error: fromHash.error || fromQuery.error || '',
        error_description: fromHash.error_description || fromQuery.error_description || ''
      };
      fetch(location.pathname, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
        cache: 'no-store'
      }).then(function (res) {
        return res.text().then(function (html) {
          document.open();
          document.write(html);
          document.close();
        });
      }).catch(function () {
        document.body.textContent = 'Failed to complete authentication handoff.';
      });
      if (location.hash) {
        history.replaceState(null, '', location.pathname + location.search);
      }
    })();
  </script>
</body>
</html>`;
}

async function readJsonBody(req: http.IncomingMessage): Promise<Record<string, string>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) return {};
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'string') out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Starts a local HTTP loopback server on 127.0.0.1, opens the browser to NitroCloud auth,
 * and awaits the redirected authorization payload with CSRF state validation.
 *
 * Prefers fragment + POST handoff (cli_v=2). Still accepts legacy query-string tokens.
 */
export async function startLoopbackAuth(
  cloudBaseUrl: string = DEFAULT_CLOUD_URL,
  options: LoopbackAuthOptions = {},
): Promise<AuthCallbackResult> {
  const timeoutMs = options.timeoutMs ?? 180000;
  const state = options.state ?? crypto.randomBytes(16).toString('hex');
  const port = options.port ?? 0;
  const allowedHosts = [
    ...DEFAULT_ALLOWED_API_HOST_SUFFIXES,
    ...(options.allowedApiHosts || []),
  ];

  return new Promise<AuthCallbackResult>((resolve, reject) => {
    let timeoutTimer: NodeJS.Timeout | undefined;
    let isSettled = false;

    const settleSuccess = (token: string, apiUrl?: string) => {
      cleanup();
      resolve({
        token,
        apiUrl: sanitizeCallbackApiUrl(apiUrl, allowedHosts) || undefined,
      });
    };

    const settleError = (message: string, htmlTitle: string, htmlMessage: string, res?: http.ServerResponse) => {
      if (res && !res.headersSent) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderErrorHtml(htmlTitle, htmlMessage));
      }
      cleanup();
      reject(new Error(message));
    };

    const handleAuthPayload = (
      payload: {
        token?: string;
        state?: string;
        apiUrl?: string;
        error?: string;
        error_description?: string;
      },
      res: http.ServerResponse,
    ) => {
      const receivedState = payload.state;
      if (receivedState !== state) {
        settleError(
          'State parameter mismatch. Security check failed.',
          'Security Verification Failed',
          'State parameter mismatch. Security check failed.',
          res,
        );
        return;
      }

      if (payload.error) {
        const errDetail = payload.error_description || payload.error;
        settleError(
          `Browser login failed: ${errDetail}`,
          'Authentication Failed',
          errDetail,
          res,
        );
        return;
      }

      if (!payload.token) {
        settleError(
          'Missing token in authorization payload',
          'Authentication Failed',
          'Missing token in authorization payload.',
          res,
        );
        return;
      }

      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, private',
      });
      res.end(renderSuccessHtml());
      settleSuccess(payload.token, payload.apiUrl);
    };

    const server = http.createServer((req, res) => {
      void (async () => {
        try {
          const reqUrl = new URL(req.url ?? '/', `http://${req.headers.host || '127.0.0.1'}`);

          if (reqUrl.pathname !== '/auth/callback') {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Not Found');
            return;
          }

          if (req.method === 'POST') {
            const body = await readJsonBody(req);
            handleAuthPayload(body, res);
            return;
          }

          if (req.method === 'GET') {
            // Prefer fragment handoff via bridge page. Legacy query tokens still work
            // after the bridge POSTs them, and direct query handling remains as fallback
            // for older redirects that cannot run JS.
            const hasQueryToken =
              reqUrl.searchParams.has('token') || reqUrl.searchParams.has('error');
            const accept = req.headers.accept || '';
            if (!hasQueryToken || String(accept).includes('text/html')) {
              res.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-store, private',
              });
              res.end(renderFragmentBridgeHtml());
              return;
            }

            handleAuthPayload(
              {
                token: reqUrl.searchParams.get('token') || undefined,
                state: reqUrl.searchParams.get('state') || undefined,
                apiUrl: reqUrl.searchParams.get('apiUrl') || undefined,
                error: reqUrl.searchParams.get('error') || undefined,
                error_description:
                  reqUrl.searchParams.get('error_description') || undefined,
              },
              res,
            );
            return;
          }

          res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Method Not Allowed');
        } catch (err) {
          cleanup();
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      })();
    });

    const cleanup = () => {
      if (isSettled) return;
      isSettled = true;
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
        timeoutTimer = undefined;
      }
      try {
        if (typeof (server as any).closeAllConnections === 'function') {
          (server as any).closeAllConnections();
        }
        server.close();
      } catch {}
    };

    server.on('error', (err) => {
      cleanup();
      reject(err);
    });

    server.listen(port, '127.0.0.1', () => {
      const address = server.address() as AddressInfo;
      const allocatedPort = address.port;
      const redirectUri = `http://127.0.0.1:${allocatedPort}/auth/callback`;

      const loginUrl = new URL('/studio/auth/login', cloudBaseUrl);
      loginUrl.searchParams.set('redirect_uri', redirectUri);
      loginUrl.searchParams.set('state', state);
      loginUrl.searchParams.set('source', 'cli');
      // Prefer fragment response so token is not placed in query / Referer.
      loginUrl.searchParams.set('cli_v', '2');
      loginUrl.searchParams.set('response_mode', 'fragment');

      timeoutTimer = setTimeout(() => {
        cleanup();
        reject(new Error('Authentication timed out.'));
      }, timeoutMs);
      timeoutTimer.unref();

      if (options.onServerReady) {
        try {
          const readyResult = options.onServerReady(loginUrl.toString());
          if (readyResult && typeof (readyResult as Promise<void>).catch === 'function') {
            (readyResult as Promise<void>).catch((readyErr) => {
              cleanup();
              reject(readyErr);
            });
          }
        } catch (syncErr) {
          cleanup();
          reject(syncErr);
        }
      }
    });
  });
}
