import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * console/server.ts — the Forge Console. Deliberately a SEPARATE process
 * from the MCP server (different failure domain, per docs/README-team.md):
 * reads .forge/ directly off disk via fs, never imports src/ and never
 * talks to the MCP server over any IPC. If .forge/ doesn't exist yet
 * (nothing forged this session), every panel just renders empty rather
 * than erroring — this has to be able to boot before the pipeline has run
 * once.
 *
 * Run: node console/server.js (after `npm run build`, or `tsx
 * console/server.ts` directly in dev). Listens on PORT (default 3002).
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const FORGE_DIR = join(REPO_ROOT, '.forge');
const PUBLIC_DIR = join(__dirname, 'public');
const ACTIVITY_LOG = join(FORGE_DIR, 'activity.log');
// Dev fixture: lets the console be built/demoed with zero pipeline runs.
const FIXTURE_ACTIVITY_LOG = join(REPO_ROOT, 'fixtures', 'activity.log');

const PORT = Number(process.env.PORT) || 3002;

async function listDir(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];
  try {
    return (await readdir(dir)).filter((f) => f.endsWith('.json'));
  } catch {
    return [];
  }
}

async function readJSON(path: string): Promise<unknown | null> {
  try {
    return JSON.parse(await readFile(path, 'utf-8'));
  } catch {
    return null;
  }
}

/** Snapshot of everything currently in .forge/ — the /api/state response. */
async function buildState() {
  const [graphFiles, irFiles, serverFiles] = await Promise.all([
    listDir(join(FORGE_DIR, 'graphs')),
    listDir(join(FORGE_DIR, 'irs')),
    listDir(join(FORGE_DIR, 'servers')),
  ]);

  const graphs = await Promise.all(
    graphFiles.map(async (f) => {
      const data: any = await readJSON(join(FORGE_DIR, 'graphs', f));
      return { id: f.replace(/\.json$/, ''), title: data?.source?.title, endpointCount: data?.endpoints?.length };
    }),
  );
  const irs = await Promise.all(
    irFiles.map(async (f) => {
      const data: any = await readJSON(join(FORGE_DIR, 'irs', f));
      const toolCount = data?.modules?.reduce((n: number, m: any) => n + (m.tools?.length ?? 0), 0) ?? 0;
      return { id: f.replace(/\.json$/, ''), serverName: data?.server?.name, toolCount };
    }),
  );
  const servers = await Promise.all(
    serverFiles.map(async (f) => {
      const data: any = await readJSON(join(FORGE_DIR, 'servers', f));
      return {
        id: f.replace(/\.json$/, ''),
        irId: data?.irId,
        status: data?.report?.status,
        toolCount: data?.project?.toolNames?.length,
        createdAt: data?.createdAt,
      };
    }),
  );

  return { graphs, irs, servers, generatedAt: new Date().toISOString() };
}

async function readActivityTail(limit = 200): Promise<unknown[]> {
  const path = existsSync(ACTIVITY_LOG) ? ACTIVITY_LOG : existsSync(FIXTURE_ACTIVITY_LOG) ? FIXTURE_ACTIVITY_LOG : null;
  if (!path) return [];
  try {
    const raw = await readFile(path, 'utf-8');
    const lines = raw.split('\n').filter((l) => l.trim());
    return lines
      .slice(-limit)
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

  if (url.pathname === '/api/state') {
    const state = await buildState();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(state));
    return;
  }

  if (url.pathname === '/api/activity') {
    const tail = await readActivityTail();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(tail));
    return;
  }

  if (url.pathname === '/api/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write(': connected\n\n');

    let lastSize = existsSync(ACTIVITY_LOG) ? (await readFile(ACTIVITY_LOG, 'utf-8')).length : 0;

    const poll = setInterval(async () => {
      if (!existsSync(ACTIVITY_LOG)) return;
      try {
        const raw = await readFile(ACTIVITY_LOG, 'utf-8');
        if (raw.length > lastSize) {
          const newLines = raw.slice(lastSize).split('\n').filter((l) => l.trim());
          lastSize = raw.length;
          for (const line of newLines) {
            res.write(`data: ${line}\n\n`);
          }
        } else if (raw.length < lastSize) {
          lastSize = raw.length; // log rotated/cleared
        }
      } catch {
        /* transient read race with a concurrent writer — skip this tick */
      }
    }, 1000);

    req.on('close', () => clearInterval(poll));
    return;
  }

  // Static file serving — single-file public/index.html, no build step.
  let filePath = join(PUBLIC_DIR, url.pathname === '/' ? 'index.html' : url.pathname);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  try {
    const contents = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] ?? 'application/octet-stream' });
    res.end(contents);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`Forge Console listening on http://localhost:${PORT}`);
  console.log(`Reading .forge/ from: ${FORGE_DIR}${existsSync(FORGE_DIR) ? '' : ' (does not exist yet — panels will be empty until something is forged)'}`);
});
