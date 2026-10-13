/**
 * Serves the seller console over the gateway's own HTTP transport.
 *
 * The console is a browser MCP client: it talks to `/mcp` on this same origin,
 * so hosting it here means the deployed service ships both the protocol surface
 * and a human-usable view of it, with no second deployment and no CORS hop.
 *
 * Registered only when an HTTP transport exists — under STDIO-only development
 * there is nothing to attach to, and that is not an error.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/**
 * Where to look for the console, in order:
 *   1. beside this module in `dist/console/` — put there by the build step
 *   2. the source tree, for the case where `tsc` ran without `npm run build`
 * Both are derived from this module's own location, never an absolute path.
 */
const CONSOLE_CANDIDATES = [
  path.join(HERE, 'index.html'),
  path.join(HERE, '..', '..', 'console', 'index.html'),
];

export const CONSOLE_PATH = '/console';

interface HttpTransportLike {
  getApp?(): {
    get(path: string, handler: (req: unknown, res: ConsoleResponse) => void): void;
  };
}

interface ConsoleResponse {
  setHeader(name: string, value: string): void;
  status(code: number): ConsoleResponse;
  send(body: string): void;
}

interface ServerLike {
  getHttpTransport?(): HttpTransportLike | undefined;
}

/**
 * Attaches GET /console. Returns true when the route was registered, so the
 * caller can decide whether to advertise the URL.
 */
export function registerConsoleRoute(server: ServerLike): boolean {
  const transport = server.getHttpTransport?.();
  const app = transport?.getApp?.();
  if (!app) return false;

  // Read once at startup: the file is immutable for the life of the process,
  // and failing here is better than failing on a judge's first request.
  let html: string | undefined;
  for (const candidate of CONSOLE_CANDIDATES) {
    try {
      html = readFileSync(candidate, 'utf8');
      break;
    } catch {
      // try the next location
    }
  }

  if (!html) {
    console.error(
      `⚠️  Seller console asset not found (looked in: ${CONSOLE_CANDIDATES.join(', ')}) — ` +
        'run "npm run build" to copy it into dist/.',
    );
    return false;
  }

  const handler = (_req: unknown, res: ConsoleResponse) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.status(200).send(html);
  };

  // Both spellings, so a trailing slash does not 404 in front of an audience.
  app.get(CONSOLE_PATH, handler);
  app.get(`${CONSOLE_PATH}/`, handler);

  return true;
}
