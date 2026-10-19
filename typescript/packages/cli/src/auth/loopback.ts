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
 * Renders an error HTML page for loopback failures.
 */
export function renderErrorHtml(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NitroStack CLI - ${title}</title>
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
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}

/**
 * Starts a local HTTP loopback server on 127.0.0.1, opens the browser to NitroCloud auth,
 * and awaits the redirected authorization payload with CSRF state validation.
 */
export async function startLoopbackAuth(
  cloudBaseUrl: string = DEFAULT_CLOUD_URL,
  options: LoopbackAuthOptions = {},
): Promise<AuthCallbackResult> {
  const timeoutMs = options.timeoutMs ?? 180000;
  const state = options.state ?? crypto.randomBytes(16).toString('hex');
  const port = options.port ?? 0;

  return new Promise<AuthCallbackResult>((resolve, reject) => {
    let timeoutTimer: NodeJS.Timeout | undefined;
    let isSettled = false;

    const server = http.createServer((req, res) => {
      try {
        const reqUrl = new URL(req.url ?? '/', `http://${req.headers.host || '127.0.0.1'}`);

        if (reqUrl.pathname !== '/auth/callback') {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Not Found');
          return;
        }

        const receivedToken = reqUrl.searchParams.get('token');
        const receivedState = reqUrl.searchParams.get('state');
        const receivedApiUrl = reqUrl.searchParams.get('apiUrl') ?? undefined;
        const error = reqUrl.searchParams.get('error');
        const errorDescription = reqUrl.searchParams.get('error_description');

        if (error) {
          const errDetail = errorDescription || error;
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(renderErrorHtml('Authentication Failed', errDetail));
          cleanup();
          reject(new Error(`Browser login failed: ${errDetail}`));
          return;
        }

        if (receivedState !== state) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(renderErrorHtml('Security Verification Failed', 'State parameter mismatch. Security check failed.'));
          cleanup();
          reject(new Error('State parameter mismatch. Security check failed.'));
          return;
        }

        if (!receivedToken) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(renderErrorHtml('Authentication Failed', 'Missing token in authorization payload.'));
          cleanup();
          reject(new Error('Missing token in authorization payload'));
          return;
        }

        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store, private',
        });
        res.end(renderSuccessHtml());

        cleanup();
        resolve({ token: receivedToken, apiUrl: receivedApiUrl });
      } catch (err) {
        cleanup();
        reject(err instanceof Error ? err : new Error(String(err)));
      }
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
