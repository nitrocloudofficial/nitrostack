/**
 * ThreatMatrix HTTP Server
 * Serves:
 *   1. MCP over SSE  — GET  /mcp/sse  (NitroStack Cloud / Claude Web)
 *   2. MCP over HTTP — POST /mcp/message
 *   3. Dynamic Agent API — POST /api/groq-analysis & POST /api/process-request
 *   4. Health check  — GET  /health
 *   5. Static Web UI & Reports — GET / & GET /exports/*
 *
 * Run with: npm run start (node dist/main.js)
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createMcpServer } from './mcp.server.js';
import { ThreatMatrixModule } from './threatmatrix.module.js';
import { UniversalInputProcessor } from './input.processor.js';
import { executeTool } from './mcp.tools.js';
import { logger } from './logger.js';
import { config } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '../public');

import { container } from './container.js';

const module_ = new ThreatMatrixModule();
const controller = module_.getController();
const inputProcessor = container.inputProcessor;
const agentEngine = container.agentEngine;

// Track SSE transports by session
const sseTransports: Map<string, SSEServerTransport> = new Map();

const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5MB guard limit

// Helper to accumulate request body safely
function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytesRead = 0;

    req.on('data', (chunk) => {
      bytesRead += chunk.length;
      if (bytesRead > MAX_BODY_BYTES) {
        req.destroy();
        reject(new Error('Payload Too Large: Max body size is 5MB'));
        return;
      }
      body += chunk;
    });

    req.on('end', () => resolve(body));
    req.on('error', (err) => reject(err));
  });
}

// ─── Request Handler ──────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, x-session-id');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ── GET /health ──────────────────────────────────────────────────────────
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ONLINE',
      service: config.mcpServerName,
      version: config.mcpServerVersion,
      serverId: config.nitrostackServerId,
      uptime: process.uptime(),
      transport: ['stdio', 'sse', 'http'],
      tools: 28,
      resources: 6,
      prompts: 16,
      ts: new Date().toISOString(),
    }));
    return;
  }

  // ── Authentication — only enforced on external MCP transports (SSE/message) ────
  // /mcp/tools/* and /api/* are Web UI internal routes — no auth required
  const isMcpTransport = req.url?.startsWith('/mcp/sse') || req.url?.startsWith('/mcp/message');
  if (isMcpTransport && config.nitroApiKey) {
    const apiKeyHeader = (req.headers['x-api-key'] || req.headers['authorization']) as string | undefined;
    const providedKey = apiKeyHeader?.replace(/^Bearer\s+/i, '').trim();

    if (!providedKey || providedKey !== config.nitroApiKey) {
      logger.warn('Unauthorized MCP transport access attempt', { path: req.url, ip: req.socket.remoteAddress });
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: { type: 'Unauthorized', message: 'Invalid or missing API key header (x-api-key)' } }));
      return;
    }
  }

  // ── GET /mcp/sse — SSE transport for NitroStack Cloud ────────────────────
  if (req.url?.startsWith('/mcp/sse') && req.method === 'GET') {
    logger.info('MCP SSE Client Connected');

    const transport = new SSEServerTransport('/mcp/message', res);
    const sessionId = transport.sessionId;
    sseTransports.set(sessionId, transport);

    res.on('close', () => {
      logger.info('MCP SSE Client Disconnected', { sessionId });
      sseTransports.delete(sessionId);
    });

    // Create a fresh server instance per session
    const sessionServer = createMcpServer();
    await sessionServer.connect(transport);
    logger.info('MCP Handshake Ready', { sessionId, transport: 'sse' });
    return;
  }

  // ── POST /mcp/message — SSE message handler ──────────────────────────────
  if (req.url?.startsWith('/mcp/message') && req.method === 'POST') {
    const sessionId = new URL(req.url, `http://localhost`).searchParams.get('sessionId') ?? '';
    const transport = sseTransports.get(sessionId);

    if (!transport) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: { type: 'InvalidSession', message: 'Session not found' } }));
      return;
    }

    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > MAX_BODY_BYTES) {
      req.destroy();
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: { type: 'PayloadTooLarge', message: 'Max body size is 5MB' } }));
      return;
    }

    await transport.handlePostMessage(req, res);
    return;
  }

  // ── POST /mcp/tools/:toolName — Direct HTTP tool invocation ──────────────
  if (req.url?.startsWith('/mcp/tools/') && req.method === 'POST') {
    const toolName = req.url.replace('/mcp/tools/', '');
    try {
      const body = await readBody(req);
      const payload = JSON.parse(body || '{}');
      const resultStr = await executeTool(toolName, payload);
      const resultObj = JSON.parse(resultStr);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, tool: toolName, result: resultObj }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: { type: 'ToolExecutionError', message: msg } }));
    }
    return;
  }

  // ── POST /api/groq-analysis & /api/process-request — Universal Agent API ────
  if ((req.url === '/api/groq-analysis' || req.url === '/api/process-request') && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const payload = JSON.parse(body || '{}');
      const rawInput = payload.input || payload.threat || payload;

      // 1. Universal Input Pipeline (Format Detection -> Content Extraction -> Normalization)
      const processedInput = await inputProcessor.process(rawInput);

      // 2. Pre-parse Threat Context if URL/PDF/Image
      let extractionContext = '';
      try {
        const extraction = await controller.investigateThreatMatrix({
          inputType: payload.type || processedInput.format.toLowerCase(),
          rawText: typeof rawInput === 'string' ? rawInput : JSON.stringify(rawInput),
          url: payload.type === 'url' ? payload.threat : undefined,
          filePath: payload.type === 'file' ? payload.threat : undefined,
          imageInput: payload.type === 'image' ? payload.threat : undefined,
        });
        extractionContext = JSON.stringify(extraction, null, 2);
      } catch (e) {
        logger.debug('Extraction context bypassed', { reason: String(e) });
      }

      // 3. Agentic AI Reasoning Engine
      logger.info('Universal Agent API requested', { format: processedInput.format });
      const agentResult = await agentEngine.processAgenticTask(processedInput, extractionContext);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        response: agentResult.response,
        reasoning_summary: agentResult.reasoningSummary,
        intent: agentResult.intent,
        riskScore: agentResult.riskScore,
        confidence: agentResult.confidence,
        riskLevel: agentResult.riskLevel,
        findings: agentResult.findings,
        recommendedActions: agentResult.recommendedActions,
        metadata: agentResult.metadata,
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('Universal Agent API error', { error: msg });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: { type: 'AgentInferenceError', message: msg }
      }));
    }
    return;
  }

  // ── Static File Serving (Web UI & Reports) ──────────────────────────────
  let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : (req.url ?? 'index.html'));
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.html': 'text/html',
      '.css':  'text/css',
      '.js':   'application/javascript',
      '.json': 'application/json',
      '.svg':  'image/svg+xml',
      '.ico':  'image/x-icon',
      '.png':  'image/png',
      '.webp': 'image/webp',
    };
    res.writeHead(200, { 'Content-Type': `${mimeTypes[ext] ?? 'text/plain'}; charset=utf-8` });
    res.end(fs.readFileSync(filePath));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: false, error: { type: 'NotFound', message: `Route ${req.url} not found` } }));
});

// ─── Startup ──────────────────────────────────────────────────────────────────
const PORT = config.port;

server.listen(PORT, () => {
  logger.info('MCP Server Started', {
    webUI:   `http://localhost:${PORT}`,
    health:  `http://localhost:${PORT}/health`,
    mcpSSE:  `http://localhost:${PORT}/mcp/sse`,
    groqAPI: `http://localhost:${PORT}/api/groq-analysis`,
    agentAPI:`http://localhost:${PORT}/api/process-request`,
  });
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const gracefulShutdown = (signal: string) => {
  logger.info('Server Shutdown', { signal });
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000); // Force exit after 5s
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (err) => logger.error('Uncaught exception', { error: err.message }));
process.on('unhandledRejection', (reason) => logger.error('Unhandled rejection', { reason: String(reason) }));
