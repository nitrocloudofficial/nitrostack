#!/usr/bin/env node
import { spawn, ChildProcess } from 'child_process';
import chokidar from 'chokidar';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Debug logging gate.
 *
 * Hot-reload notices, the SSE log-server banner, and per-restart messages
 * are useful when debugging the wrapper itself but pollute stderr during
 * normal stdio MCP development. Gate them behind one of:
 *
 *   NITROSTACK_DEBUG=1
 *   DEBUG=nitrostack            (or any value containing "nitrostack")
 *
 * Real failures (spawn errors, the consecutive-failure bail-out, unhandled
 * rejections, the usage line) always go to stderr regardless.
 */
const DEBUG_ENABLED = !!(
  process.env.NITROSTACK_DEBUG ||
  /(^|,)nitrostack(:|,|$)/.test(process.env.DEBUG ?? '')
);

function debug(...args: unknown[]): void {
  if (DEBUG_ENABLED) {
    console.error(...args);
  }
}

/**
 * MCP Server Hot Reload Wrapper
 *
 * This wrapper:
 * 1. Starts the MCP server as a child process
 * 2. Watches for changes in the dist/ directory
 * 3. Restarts the server when changes are detected
 * 4. Maintains stdio connection for Studio
 * 5. Captures stderr from the MCP server and streams it over an SSE endpoint
 *
 * IMPORTANT: All logs go to stderr to avoid corrupting MCP JSON-RPC on stdout
 */

export async function run() {
  const distPath = process.argv[2];
  if (!distPath) {
    console.error('Usage: mcp-dev-wrapper <path-to-dist/index.js>');
    process.exit(1);
    return;
  }

  const projectRoot = path.resolve(distPath, '../..');
  const watchPath = path.join(projectRoot, 'dist');

  let mcpProcess: ChildProcess | null = null;
  let isRestarting = false;
  let consecutiveFailures = 0;
  const maxConsecutiveFailures = 3;
  let restartTimeout: NodeJS.Timeout | null = null;
  let sseClient: http.ServerResponse | null = null;
  const logCache: string[] = [];

  // Create an HTTP server for SSE log streaming
  const logServer = http.createServer((req, res) => {
    if (req.url === '/mcp-logs') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*', // Allow all origins
      });
      sseClient = res;

      // Send cached logs
      logCache.forEach(log => {
        sseClient?.write(`data: ${log}\n\n`);
      });

      req.on('close', () => {
        sseClient = null;
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  const logServerPort = parseInt(process.env.MCP_LOG_PORT || '3004');
  logServer.listen(logServerPort, () => {
    debug(`[NitroStack Hot Reload] Log streaming server running at http://localhost:${logServerPort}/mcp-logs`);
  });

  function startMCPServer() {
    if (isRestarting) return;

    debug(`[DEBUG] mcp-dev-wrapper.ts: MCP_SERVER_PORT is ${process.env.MCP_SERVER_PORT}`);

    const mcpEnv = {
      ...process.env,
      NODE_ENV: 'development',
      PORT: process.env.MCP_SERVER_PORT,
    };

    mcpProcess = spawn('node', [distPath], {
      stdio: ['inherit', 'inherit', 'pipe'], // Pipe stderr to capture logs
      env: mcpEnv,
    });

    if (!mcpProcess) return;

    let buffer = '';
    if (mcpProcess.stderr) {
      mcpProcess.stderr.on('data', (data) => {
        buffer += data.toString();
        let boundary = buffer.indexOf('\n');
        while (boundary !== -1) {
          const line = buffer.substring(0, boundary);
          buffer = buffer.substring(boundary + 1);
          // Forward to the console for local debugging
          process.stderr.write(line + '\n');

          if (line.startsWith('NITRO_LOG::')) {
            const logJson = line.substring('NITRO_LOG::'.length);
            logCache.push(logJson);
            if (sseClient) {
              sseClient.write(`data: ${logJson}\n\n`);
            }
          }
          boundary = buffer.indexOf('\n');
        }
      });
    }

    mcpProcess.on('exit', (code) => {
      if (!isRestarting) {
        if (code !== 0) {
          consecutiveFailures++;
          if (consecutiveFailures >= maxConsecutiveFailures) {
            console.error(`[NitroStack Hot Reload] Server failed ${maxConsecutiveFailures} times in a row. Giving up.`);
            console.error('[NitroStack Hot Reload] Check your configuration and try again.');
            process.exit(1);
          }
          debug(`[NitroStack Hot Reload] Server exited with code ${code} (attempt ${consecutiveFailures}/${maxConsecutiveFailures}), restarting...`);
        } else {
          consecutiveFailures = 0;
          debug(`[NitroStack Hot Reload] Server exited with code ${code}, restarting...`);
        }
        mcpProcess = null;
        setTimeout(startMCPServer, 1000);
      }
    });

    mcpProcess.on('error', (err) => {
      console.error('[NitroStack Hot Reload] Server error:', err);
    });
  }

  function restartMCPServer() {
    if (restartTimeout) {
      clearTimeout(restartTimeout);
    }

    restartTimeout = setTimeout(() => {
      if (isRestarting) return;

      isRestarting = true;

      if (mcpProcess) {
        debug('[NitroStack Hot Reload] Changes detected, restarting server...');

        mcpProcess.kill('SIGTERM');

        setTimeout(() => {
          mcpProcess = null;
          isRestarting = false;
          startMCPServer();
          debug('[NitroStack Hot Reload] Server restarted successfully');
        }, 1500);
      } else {
        isRestarting = false;
        startMCPServer();
      }
    }, 1000);
  }

  // Start the server initially
  startMCPServer();

  const watcher = chokidar.watch(watchPath, {
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50,
    },
  });

  watcher.on('change', (filepath) => {
    debug(`[NitroStack Hot Reload] File changed: ${path.relative(projectRoot, filepath)}`);
    restartMCPServer();
  });

  watcher.on('add', (filepath) => {
    debug(`[NitroStack Hot Reload] File added: ${path.relative(projectRoot, filepath)}`);
    restartMCPServer();
  });

  const shutdown = () => {
    debug('[NitroStack Hot Reload] Shutting down...');
    watcher.close();
    if (mcpProcess) {
      mcpProcess.kill('SIGTERM');
    }
    logServer.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Run if main
const currentFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] && (
  process.argv[1] === currentFilePath ||
  process.argv[1].endsWith('mcp-dev-wrapper.js') ||
  process.argv[1].endsWith('mcp-dev-wrapper.ts') ||
  process.argv[1].endsWith('mcp-dev-wrapper')
)) {
  run().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
