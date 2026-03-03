/**
 * Streamable HTTP Transport for MCP
 * 
 * Implements the MCP Streamable HTTP transport specification (2025-06-18).
 * https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#streamable-http
 * 
 * Features:
 * - Single MCP endpoint supporting both POST and GET
 * - POST for sending messages to server
 * - GET for SSE streams from server
 * - Session management with Mcp-Session-Id header
 * - Resumability support with Last-Event-ID
 * - Multiple concurrent client connections
 * - Protocol version header support
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import { Server as HttpServer } from 'http';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessage, JSONRPCRequest, JSONRPCResponse, JSONRPCNotification, Tool as McpTool } from '@modelcontextprotocol/sdk/types.js';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

export interface StreamableHttpTransportOptions {
  /**
   * Port to listen on (default: 3000)
   */
  port?: number;

  /**
   * Host to bind to (default: 'localhost' for security)
   */
  host?: string;

  /**
   * MCP endpoint path (default: '/mcp')
   */
  endpoint?: string;

  /**
   * Enable session management (default: true)
   */
  enableSessions?: boolean;

  /**
   * Session timeout in ms (default: 30 minutes)
   */
  sessionTimeout?: number;

  /**
   * Custom Express app (optional)
   */
  app?: Express;

  /**
   * Enable CORS (default: false for security)
   */
  enableCors?: boolean;
}

interface ClientSession {
  id: string;
  streams: Map<string, SSEStream>;
  lastActivity: number;
  messageQueue: QueuedMessage[];
  eventIdCounter: number;
}

interface SSEStream {
  id: string;
  response: Response;
  eventIdCounter: number;
  closed: boolean;
}

interface QueuedMessage {
  message: JSONRPCMessage;
  streamId?: string;
  eventId?: string;
}

/**
 * Streamable HTTP Transport
 * Implements MCP Streamable HTTP specification
 */
export class StreamableHttpTransport implements Transport {
  private app: Express;
  private server: HttpServer | null = null;
  private sessions: Map<string, ClientSession> = new Map();
  private activeStreams: Map<string, SSEStream> = new Map(); // For sessionless mode
  private messageHandler?: (message: JSONRPCMessage) => Promise<void>;
  private closeHandler?: () => void;
  private errorHandler?: (error: Error) => void;
  private options: Required<Omit<StreamableHttpTransportOptions, 'app'>>;
  private sessionCleanupInterval?: NodeJS.Timeout;
  private getToolsCallback?: () => Promise<McpTool[]>;
  private serverConfig?: { name: string; version: string; description?: string };
  private logoBase64?: string;

  constructor(options: StreamableHttpTransportOptions = {}) {
    this.options = {
      port: options.port || 3000,
      host: options.host || 'localhost',
      endpoint: options.endpoint || '/mcp',
      enableSessions: options.enableSessions === true, // Default to false for simpler clients
      sessionTimeout: options.sessionTimeout || 30 * 60 * 1000, // 30 minutes
      enableCors: options.enableCors !== false, // Default to true
    };

    this.app = options.app || express();

    // CRITICAL: Disable Express's automatic OPTIONS handling
    this.app.set('x-powered-by', false);

    // Enable trust proxy to respect X-Forwarded-* headers from reverse proxies
    // This is essential for HTTPS detection when behind a proxy
    this.app.set('trust proxy', true);

    // Load logo for documentation page
    this.loadLogo();

    this.setupMiddleware();
    this.setupRoutes();
    this.startSessionCleanup();
  }

  /**
   * Load logo image as base64 for embedding in documentation page
   */
  private loadLogo(): void {
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);

      // Try multiple paths:
      // 1. From dist/core/transports/streamable-http.js -> ../../../src/assets/nitrocloud.png (package source)
      // 2. From dist/core/transports/streamable-http.js -> ../../../../src/assets/nitrocloud.png (if in nitrostack package)
      // 3. From project root (user's project) -> src/assets/nitrocloud.png
      const possiblePaths = [
        join(__dirname, '../../../src/assets/nitrocloud.png'), // From dist/core/transports -> src/assets
        join(__dirname, '../../../../src/assets/nitrocloud.png'), // From dist/core/transports -> src/assets (alternative)
        join(process.cwd(), 'src/assets/nitrocloud.png'), // User's project
        join(process.cwd(), 'node_modules/nitrostack/src/assets/nitrocloud.png'), // From node_modules
      ];

      let logoPath: string | null = null;
      for (const path of possiblePaths) {
        try {
          if (readFileSync(path, { flag: 'r' })) {
            logoPath = path;
            break;
          }
        } catch {
          continue;
        }
      }

      if (logoPath) {
        const logoBuffer = readFileSync(logoPath);
        this.logoBase64 = logoBuffer.toString('base64');
      } else {
        this.logoBase64 = undefined;
      }
    } catch (error) {
      // Logo is optional, continue without it
      this.logoBase64 = undefined;
    }
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // CORS (if enabled) - MUST be the very first middleware, handles ALL requests
    if (this.options.enableCors) {
      // Add CORS headers to ALL responses
      this.app.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID');
        res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');

        // Handle OPTIONS immediately
        if (req.method === 'OPTIONS') {
          res.status(200).end();
          return;
        }
        next();
      });
    }

    // Security: Validate Origin header to prevent DNS rebinding attacks (skip if CORS enabled)
    if (!this.options.enableCors) {
      this.app.use((req, res, next) => {
        const origin = req.get('Origin');
        const host = req.get('Host');

        if (origin && host) {
          const originHost = new URL(origin).host;
          if (originHost !== host && !this.isLocalhost(originHost)) {
            res.status(403).json({ error: 'Invalid Origin header' });
            return;
          }
        }
        next();
      });
    }

    // JSON parsing
    this.app.use(express.json());
  }

  /**
   * Setup MCP endpoint routes
   */
  private setupRoutes(): void {
    const endpoint = this.options.endpoint;

    // IMPORTANT: Add OPTIONS handlers FIRST to override Express's auto-OPTIONS
    if (this.options.enableCors) {
      // Main endpoint OPTIONS
      this.app.options(endpoint, (req, res) => {
        res.sendStatus(200);
      });

      // SSE endpoint OPTIONS
      this.app.options(`${endpoint}/sse`, (req, res) => {
        res.sendStatus(200);
      });

      // Message endpoint OPTIONS
      this.app.options(`${endpoint}/message`, (req, res) => {
        res.sendStatus(200);
      });
    }

    // MCP Endpoint - POST for sending messages to server (main endpoint)
    this.app.post(endpoint, async (req, res) => {
      await this.handlePost(req, res);
    });

    // Legacy message endpoint for backward compatibility with old HTTP transport clients
    // Some clients may POST to /mcp/message instead of /mcp
    this.app.post(`${endpoint}/message`, async (req, res) => {
      await this.handlePost(req, res);
    });

    // MCP Endpoint - GET for SSE streams (main endpoint)
    this.app.get(endpoint, (req, res) => {
      this.handleGet(req, res);
    });

    // Legacy SSE endpoint for backward compatibility with old HTTP transport clients
    // Some clients may connect to /mcp/sse instead of /mcp
    this.app.get(`${endpoint}/sse`, (req, res) => {
      this.handleGet(req, res);
    });

    // MCP Endpoint - DELETE for session termination
    this.app.delete(endpoint, (req, res) => {
      this.handleDelete(req, res);
    });

    // Backward compatibility: /sse endpoint (alias for GET /mcp)
    this.app.get(`${endpoint}/sse`, (req, res) => {
      this.handleGet(req, res);
    });

    // Backward compatibility: /message endpoint (alias for POST /mcp)
    this.app.post(`${endpoint}/message`, async (req, res) => {
      // Simple message handler that doesn't require all the session/SSE logic
      try {
        const message = req.body as JSONRPCMessage;

        if (!message || !message.jsonrpc) {
          res.status(400).json({ error: 'Invalid JSON-RPC message' });
          return;
        }

        // Pass to message handler
        if (this.messageHandler) {
          await this.messageHandler(message);
        }

        res.json({ status: 'received' });
      } catch (error: unknown) {
        console.error('Error handling message:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
      }
    });

    // Info endpoint for GET on /message
    this.app.get(`${endpoint}/message`, (req, res) => {
      res.json({
        endpoint: `${endpoint}/message`,
        method: 'POST',
        description: 'Send JSON-RPC messages to the MCP server',
        usage: 'POST with Content-Type: application/json',
        example: {
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' }
          },
          id: 1
        }
      });
    });

    // Health check
    this.app.get(`${endpoint}/health`, (req, res) => {
      res.json({
        status: 'ok',
        transport: 'streamable-http',
        version: '2025-06-18',
        sessions: this.sessions.size,
        uptime: process.uptime(),
      });
    });

    // Root documentation page (only in production mode when HTTP server runs)
    // This route is added at the end to avoid conflicts with MCP endpoints
    if (process.env.NODE_ENV !== 'development') {
      this.app.get('/', async (req, res) => {
        try {
          const tools = this.getToolsCallback ? await this.getToolsCallback() : [];

          // Get host from request headers (supports X-Forwarded-Host for reverse proxies)
          let host = req.get('x-forwarded-host') || req.get('host') || `${this.options.host}:${this.options.port}`;

          // In production, remove port if it's standard HTTP/HTTPS port
          // This handles cases where the server is behind a reverse proxy
          if (process.env.NODE_ENV === 'production') {
            // Remove port if it's 80 (HTTP) or 443 (HTTPS)
            host = host.replace(/:(80|443)$/, '');
          }

          // Support X-Forwarded-Proto for reverse proxies (production deployments)
          const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
          const baseUrl = `${protocol}://${host}`;
          const mcpEndpoint = `${baseUrl}${endpoint}`;

          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.send(this.generateDocumentationPage(tools, mcpEndpoint));
        } catch (error: unknown) {
          console.error('Error generating documentation page:', error);
          res.status(500).send('Error generating documentation page');
        }
      });
    }
  }

  /**
   * Handle POST requests (client sending messages to server)
   */
  private async handlePost(req: Request, res: Response): Promise<void> {
    try {
      const message = req.body as JSONRPCMessage;
      const sessionId = req.get('Mcp-Session-Id');
      const accept = req.get('Accept') || '';

      // Validate JSON-RPC message
      if (!message || !message.jsonrpc || message.jsonrpc !== '2.0') {
        res.status(400).json({
          jsonrpc: '2.0',
          error: { code: -32600, message: 'Invalid JSON-RPC message' }
        });
        return;
      }

      // Check session
      if (this.options.enableSessions && sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
          res.status(404).json({
            jsonrpc: '2.0',
            error: { code: -32001, message: 'Session not found' }
          });
          return;
        }
        session.lastActivity = Date.now();
      }

      // Handle different message types
      const messageType = this.getMessageType(message);

      if (messageType === 'notification' || messageType === 'response') {
        // Notification or Response: Return 202 Accepted
        if (this.messageHandler) {
          await this.messageHandler(message);
        }
        res.status(202).send();
        return;
      }

      if (messageType === 'request') {
        // Request: Accept header check (be lenient - if not specified, assume they want SSE)
        const supportsSSE = !accept || accept.includes('text/event-stream') || accept.includes('*/*');
        const supportsJSON = accept.includes('application/json');

        // Pass to message handler
        if (this.messageHandler) {
          await this.messageHandler(message);
        }

        // For InitializeRequest, create session if enabled
        if (this.isInitializeRequest(message)) {
          if (this.options.enableSessions && !sessionId) {
            const newSessionId = this.generateSessionId();
            const session: ClientSession = {
              id: newSessionId,
              streams: new Map(),
              lastActivity: Date.now(),
              messageQueue: [],
              eventIdCounter: 0,
            };
            this.sessions.set(newSessionId, session);
            res.setHeader('Mcp-Session-Id', newSessionId);
          }
        }

        // For SSE: Just acknowledge receipt, response will come via existing SSE stream
        if (supportsSSE) {
          // Accept the request
          res.status(202).send();
          // Response will be sent via the send() method to existing SSE streams
        } else {
          // Single JSON response (less common)
          res.setHeader('Content-Type', 'application/json');
          // Response will be sent by the protocol layer
          (res as any)._mcpWaitingForResponse = true;
          (res as any)._mcpRequestId = (message as JSONRPCRequest).id;
        }
      }
    } catch (error: unknown) {
      console.error('POST error:', error);
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal error' }
      });
    }
  }

  /**
   * Handle GET requests (client opening SSE stream)
   */
  private handleGet(req: Request, res: Response): void {
    const sessionId = req.get('Mcp-Session-Id');
    const lastEventId = req.get('Last-Event-ID');
    const accept = req.get('Accept') || '';

    // Check if client explicitly doesn't want SSE (e.g., asking for JSON only)
    const rejectsSSE = accept && !accept.includes('*/*') && !accept.includes('text/event-stream') && accept.length > 0;
    if (rejectsSSE) {
      res.status(405).send('Method Not Allowed - This endpoint provides Server-Sent Events');
      return;
    }

    // Check session
    let session: ClientSession | undefined;
    if (this.options.enableSessions) {
      if (!sessionId) {
        res.status(400).json({ error: 'Mcp-Session-Id required' });
        return;
      }
      session = this.sessions.get(sessionId);
      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }
      session.lastActivity = Date.now();
    }

    // Setup SSE
    // CRITICAL: Set CORS headers for SSE if enabled (must be before flushHeaders)
    // SSE connections need CORS headers explicitly set before the stream starts
    if (this.options.enableCors) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID');
      res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Create stream
    const streamId = uuidv4();
    const stream: SSEStream = {
      id: streamId,
      response: res,
      eventIdCounter: 0,
      closed: false,
    };

    // Send endpoint event immediately (required by MCP SDK)
    // This tells the client where to POST messages
    // Support X-Forwarded-Proto for reverse proxies (production deployments)
    // This ensures the endpoint URL matches the client's connection protocol (HTTPS)
    const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';

    // Detect client format based on request URL:
    // - If client connects to /mcp/sse (old format) → return /mcp/message as endpoint
    // - If client connects to /mcp (new format) → return /mcp as endpoint
    // Use originalUrl or url to get the full path including /sse
    const requestPath = req.originalUrl || req.url || req.path;
    const isOldFormat = requestPath.includes(`${this.options.endpoint}/sse`) ||
      requestPath.endsWith('/sse') ||
      req.path === `${this.options.endpoint}/sse`;
    const messageEndpoint = isOldFormat
      ? `${this.options.endpoint}/message`  // Old format: POST to /mcp/message
      : this.options.endpoint;                // New format: POST to /mcp

    const endpointUrl = `${protocol}://${req.get('host')}${messageEndpoint}`;

    try {
      res.write(`event: endpoint\n`);
      res.write(`data: ${endpointUrl}\n\n`);
    } catch (error) {
      console.error('Error sending endpoint event:', error);
      stream.closed = true;
      return;
    }

    // Add to session or activeStreams
    if (session) {
      session.streams.set(streamId, stream);

      // Resume support: replay messages after lastEventId
      if (lastEventId) {
        this.replayMessages(session, stream, lastEventId);
      }
    } else {
      // Sessionless mode: track in activeStreams
      this.activeStreams.set(streamId, stream);
    }

    // Handle client disconnect
    req.on('close', () => {
      stream.closed = true;
      if (session) {
        session.streams.delete(streamId);
      } else {
        this.activeStreams.delete(streamId);
      }
    });

    // Send ping every 30 seconds to keep connection alive
    const pingInterval = setInterval(() => {
      if (stream.closed) {
        clearInterval(pingInterval);
        return;
      }
      try {
        res.write(': ping\n\n');
      } catch (error) {
        clearInterval(pingInterval);
        stream.closed = true;
      }
    }, 30000);
  }

  /**
   * Handle DELETE requests (session termination)
   */
  private handleDelete(req: Request, res: Response): void {
    const sessionId = req.get('Mcp-Session-Id');

    if (!sessionId) {
      res.status(400).json({ error: 'Mcp-Session-Id required' });
      return;
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Close all streams
    for (const stream of session.streams.values()) {
      try {
        stream.response.end();
        stream.closed = true;
      } catch (error) {
        // Ignore
      }
    }

    // Remove session
    this.sessions.delete(sessionId);
    res.status(200).json({ status: 'session terminated' });
  }

  /**
   * Start SSE stream for a request
   */
  private async startSSEStream(
    req: Request,
    res: Response,
    request: JSONRPCRequest,
    sessionId?: string
  ): Promise<void> {
    // Setup SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Create stream
    const streamId = uuidv4();
    const stream: SSEStream = {
      id: streamId,
      response: res,
      eventIdCounter: 0,
      closed: false,
    };

    // Store stream reference for this request
    (req as any)._mcpStreamId = streamId;
    (req as any)._mcpStream = stream;

    // Add to session or activeStreams
    if (sessionId) {
      const session = this.sessions.get(sessionId);
      if (session) {
        session.streams.set(streamId, stream);
      }
    } else {
      // Sessionless mode: track in activeStreams
      this.activeStreams.set(streamId, stream);
    }

    // Handle client disconnect
    req.on('close', () => {
      stream.closed = true;
      if (sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
          session.streams.delete(streamId);
        }
      } else {
        this.activeStreams.delete(streamId);
      }
    });
  }

  /**
   * Send message to client(s)
   */
  async send(message: JSONRPCMessage): Promise<void> {
    // Find target session/stream
    // For responses, send to the stream that made the request
    if (this.isResponse(message)) {
      const response = message as JSONRPCResponse;
      await this.sendToRequestStream(response);
      return;
    }

    // For requests and notifications, send to all active streams
    // First, send to session-based streams
    for (const session of this.sessions.values()) {
      for (const stream of session.streams.values()) {
        if (!stream.closed) {
          await this.sendToStream(stream, message, session);
        }
      }
    }

    // Then, send to sessionless streams
    for (const stream of this.activeStreams.values()) {
      if (!stream.closed) {
        await this.sendToStreamSessionless(stream, message);
      }
    }
  }

  /**
   * Send message to a specific stream
   */
  private async sendToStream(
    stream: SSEStream,
    message: JSONRPCMessage,
    session: ClientSession
  ): Promise<void> {
    try {
      const eventId = `${session.id}-${++stream.eventIdCounter}`;
      const data = JSON.stringify(message);

      stream.response.write(`id: ${eventId}\n`);
      stream.response.write(`data: ${data}\n\n`);

      // Store in queue for resumability
      session.messageQueue.push({
        message,
        streamId: stream.id,
        eventId,
      });
    } catch (error) {
      console.error('Error sending to stream:', error);
      stream.closed = true;
    }
  }

  /**
   * Send response to the stream that made the request
   */
  private async sendToRequestStream(response: JSONRPCResponse): Promise<void> {
    // Find the stream associated with this request
    // For session-based streams
    for (const session of this.sessions.values()) {
      for (const stream of session.streams.values()) {
        if (!stream.closed) {
          await this.sendToStream(stream, response, session);
          // Keep stream open for multiple requests - stream will close when client disconnects
        }
      }
    }

    // For sessionless streams - CRITICAL: Keep stream open for multiple requests
    // The SSE stream should stay open to handle initialize, ping, tool calls, etc.
    // Closing it after the first response breaks subsequent requests
    for (const stream of this.activeStreams.values()) {
      if (!stream.closed) {
        await this.sendToStreamSessionless(stream, response);
        // Keep stream open - it will be closed when the client disconnects naturally
      }
    }
  }

  /**
   * Send message to a sessionless stream
   */
  private async sendToStreamSessionless(
    stream: SSEStream,
    message: JSONRPCMessage
  ): Promise<void> {
    try {
      const eventId = `${stream.id}-${++stream.eventIdCounter}`;
      const data = JSON.stringify(message);

      stream.response.write(`id: ${eventId}\n`);
      stream.response.write(`data: ${data}\n\n`);
    } catch (error) {
      console.error('Error sending to sessionless stream:', error);
      stream.closed = true;
      this.activeStreams.delete(stream.id);
    }
  }

  /**
   * Replay messages for resumability
   */
  private replayMessages(
    session: ClientSession,
    stream: SSEStream,
    lastEventId: string
  ): void {
    const messages = session.messageQueue.filter(
      (msg) => msg.streamId === stream.id && msg.eventId! > lastEventId
    );

    for (const { message, eventId } of messages) {
      try {
        const data = JSON.stringify(message);
        stream.response.write(`id: ${eventId}\n`);
        stream.response.write(`data: ${data}\n\n`);
      } catch (error) {
        console.error('Error replaying message:', error);
        break;
      }
    }
  }

  /**
   * Start the HTTP server
   */
  async start(): Promise<void> {
    if (this.server) {
      await this.close();
    }

    return new Promise((resolve, reject) => {
      const errorHandler = (error: Error) => {
        console.error(`Failed to start Streamable HTTP transport: ${error.message}`);
        this.server = null;
        reject(error);
      };

      try {
        const server = this.app.listen(this.options.port, this.options.host);

        server.once('error', errorHandler);

        server.once('listening', () => {
          server.removeListener('error', errorHandler);

          server.on('error', (error) => {
            if (this.errorHandler) {
              this.errorHandler(error);
            }
          });

          this.server = server;

          console.error(`🌐 MCP Streamable HTTP transport listening on http://${this.options.host}:${this.options.port}${this.options.endpoint}`);
          console.error(`   Protocol: MCP 2025-06-18`);
          console.error(`   Sessions: ${this.options.enableSessions ? 'enabled' : 'disabled'}`);

          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Register additional HTTP routes
   * Allows modules (like OAuthModule) to add custom endpoints
   */
  on(path: string, handler: (req: Request, res: Response) => void): void {
    this.app.get(path, handler);
  }

  /**
   * Close the transport
   */
  async close(): Promise<void> {
    // Clear session cleanup
    if (this.sessionCleanupInterval) {
      clearInterval(this.sessionCleanupInterval);
    }

    // Close all sessions
    for (const session of this.sessions.values()) {
      for (const stream of session.streams.values()) {
        try {
          stream.response.end();
          stream.closed = true;
        } catch (error) {
          // Ignore
        }
      }
    }
    this.sessions.clear();

    // Close HTTP server
    if (this.server) {
      return new Promise((resolve) => {
        const server = this.server!;
        this.server = null;

        server.closeAllConnections?.();

        server.close((err) => {
          if (err) {
            console.error('HTTP server close error:', err.message);
          }
          if (this.closeHandler) {
            this.closeHandler();
          }
          resolve();
        });
      });
    }

    if (this.closeHandler) {
      this.closeHandler();
    }
  }

  /**
   * Set message handler
   */
  set onmessage(handler: (message: JSONRPCMessage) => Promise<void>) {
    this.messageHandler = handler;
  }

  /**
   * Set close handler
   */
  set onclose(handler: () => void) {
    this.closeHandler = handler;
  }

  /**
   * Set error handler
   */
  set onerror(handler: (error: Error) => void) {
    this.errorHandler = handler;
  }

  /**
   * Start session cleanup interval
   */
  private startSessionCleanup(): void {
    this.sessionCleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [sessionId, session] of this.sessions.entries()) {
        if (now - session.lastActivity > this.options.sessionTimeout) {
          // Cleanup expired session
          for (const stream of session.streams.values()) {
            try {
              stream.response.end();
              stream.closed = true;
            } catch (error) {
              // Ignore
            }
          }
          this.sessions.delete(sessionId);
          console.error(`Session ${sessionId} expired and cleaned up`);
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Helper methods
   */

  private generateSessionId(): string {
    return uuidv4();
  }

  private getMessageType(message: JSONRPCMessage): 'request' | 'response' | 'notification' {
    if ('method' in message && 'id' in message) return 'request';
    if ('result' in message || 'error' in message) return 'response';
    return 'notification';
  }

  private isResponse(message: JSONRPCMessage): boolean {
    return 'result' in message || 'error' in message;
  }

  private isInitializeRequest(message: JSONRPCMessage): boolean {
    return 'method' in message && (message as any).method === 'initialize';
  }

  private isLocalhost(host: string): boolean {
    // Extract hostname without port (handles both IPv4 and IPv6 formats)
    let hostname = host;
    if (host.includes('[') && host.includes(']')) {
      // IPv6 with port format: [::1]:3000
      hostname = host.substring(host.indexOf('[') + 1, host.indexOf(']'));
    } else if (host.includes(':') && (host.match(/:/g) || []).length > 1) {
      // Raw IPv6: ::1
      hostname = host;
    } else {
      // IPv4 or hostname: localhost:3000 or 127.0.0.1:3000
      hostname = host.split(':')[0];
    }

    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  }

  /**
   * Get the Express app (for adding custom routes)
   */
  getApp(): Express {
    return this.app;
  }

  /**
   * Set callback to get tools list for documentation page
   */
  setToolsCallback(callback: () => Promise<McpTool[]>): void {
    this.getToolsCallback = callback;
  }

  /**
   * Set server configuration for documentation page
   */
  setServerConfig(config: { name: string; version: string; description?: string }): void {
    this.serverConfig = config;
  }

  /**
   * Generate HTML documentation page
   */
  private generateDocumentationPage(tools: McpTool[], mcpEndpoint: string): string {
    const serverName = this.serverConfig?.name || 'NitroStack MCP Server';
    const serverVersion = this.serverConfig?.version || '1.0.0';
    const serverDescription = this.serverConfig?.description || 'A powerful MCP server built with NitroStack';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${serverName} - MCP Server Documentation</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --nitrocloud-primary: hsl(217, 91%, 60%);
      --nitrocloud-primary-dark: hsl(217, 91%, 50%);
      --nitrocloud-gradient-start: hsl(217, 91%, 60%);
      --nitrocloud-gradient-end: hsl(221, 83%, 53%);
      --background: hsl(0, 0%, 100%);
      --foreground: hsl(222.2, 84%, 4.9%);
      --primary: hsl(221.2, 83.2%, 53.3%);
      --primary-foreground: hsl(210, 40%, 98%);
      --secondary: hsl(210, 40%, 96.1%);
      --muted: hsl(210, 40%, 96.1%);
      --muted-foreground: hsl(215.4, 16.3%, 46.9%);
      --border: hsl(214.3, 31.8%, 91.4%);
      --radius: 0.75rem;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
      min-height: 100vh;
      padding: 2rem;
      color: var(--foreground);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    .container {
      max-width: 1280px;
      margin: 0 auto;
      background: var(--background);
      border-radius: 24px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, var(--nitrocloud-gradient-start) 0%, var(--nitrocloud-gradient-end) 100%);
      color: white;
      padding: 4rem 2rem;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    
    .header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 100%);
      pointer-events: none;
    }
    
    .header > * {
      position: relative;
      z-index: 1;
    }
    
    .logo-container {
      margin-bottom: 2rem;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    
    .logo {
      height: 80px;
      width: auto;
      max-width: 200px;
      object-fit: contain;
      filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3));
      transition: transform 0.3s ease;
    }
    
    .logo:hover {
      transform: scale(1.05);
    }
    
    .header h1 {
      font-size: 3rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      letter-spacing: -0.025em;
    }
    
    .header .version {
      font-size: 1rem;
      opacity: 0.95;
      font-weight: 400;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    
    .header .description {
      margin-top: 1rem;
      font-size: 1.125rem;
      opacity: 0.95;
      font-weight: 400;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
    }
    
    .content {
      padding: 3rem 2rem;
    }
    
    .section {
      margin-bottom: 4rem;
    }
    
    .section:last-child {
      margin-bottom: 0;
    }
    
    .section h2 {
      font-size: 2rem;
      font-weight: 700;
      color: var(--foreground);
      margin-bottom: 1.5rem;
      padding-bottom: 0.75rem;
      border-bottom: 3px solid var(--nitrocloud-primary);
      letter-spacing: -0.02em;
    }
    
    .connection-info {
      background: linear-gradient(to right, var(--secondary) 0%, var(--muted) 100%);
      border-left: 4px solid var(--nitrocloud-primary);
      padding: 2rem;
      border-radius: var(--radius);
      margin-bottom: 2rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    
    .connection-info p {
      font-weight: 600;
      color: var(--foreground);
      margin-bottom: 0.75rem;
      font-size: 0.9375rem;
    }
    
    .connection-info code {
      background: hsl(222.2, 84%, 4.9%);
      color: hsl(142, 76%, 36%);
      padding: 1rem 1.25rem;
      border-radius: 8px;
      font-family: 'Monaco', 'Courier New', 'Menlo', monospace;
      display: block;
      margin-top: 0.75rem;
      word-break: break-all;
      font-size: 0.875rem;
      line-height: 1.6;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .connection-info .description {
      margin-top: 1rem;
      color: var(--muted-foreground);
      font-size: 0.9375rem;
      line-height: 1.6;
    }
    
    .tools-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.5rem;
      margin-top: 1.5rem;
    }
    
    .tool-card {
      background: var(--background);
      border: 2px solid var(--border);
      border-radius: var(--radius);
      padding: 1.75rem;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    
    .tool-card:hover {
      border-color: var(--nitrocloud-primary);
      box-shadow: 0 8px 24px rgba(59, 159, 255, 0.15);
      transform: translateY(-4px);
    }
    
    .tool-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, var(--nitrocloud-gradient-start), var(--nitrocloud-gradient-end));
    }
    
    .tool-name {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--foreground);
      margin-bottom: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      letter-spacing: -0.01em;
    }
    
    .tool-name::before {
      content: '⚡';
      font-size: 1.25rem;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
    }
    
    .tool-description {
      color: var(--muted-foreground);
      margin-bottom: 1rem;
      line-height: 1.625;
      font-size: 0.9375rem;
    }
    
    .tool-schema {
      background: var(--secondary);
      border-radius: 8px;
      padding: 1rem;
      margin-top: 1rem;
      font-size: 0.875rem;
      border: 1px solid var(--border);
    }
    
    .tool-schema summary {
      cursor: pointer;
      font-weight: 600;
      color: var(--nitrocloud-primary);
      margin-bottom: 0.5rem;
      user-select: none;
      transition: color 0.2s;
    }
    
    .tool-schema summary:hover {
      color: var(--nitrocloud-primary-dark);
    }
    
    .tool-schema pre {
      background: hsl(222.2, 84%, 4.9%);
      color: hsl(142, 76%, 36%);
      padding: 1rem;
      border-radius: 6px;
      overflow-x: auto;
      margin-top: 0.75rem;
      font-size: 0.8125rem;
      line-height: 1.6;
      font-family: 'Monaco', 'Courier New', 'Menlo', monospace;
    }
    
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.375rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      margin-top: 0.5rem;
      transition: all 0.2s;
    }
    
    .badge.widget {
      background: linear-gradient(135deg, hsl(271, 81%, 56%) 0%, hsl(271, 81%, 46%) 100%);
      color: white;
      box-shadow: 0 2px 8px rgba(196, 132, 252, 0.3);
    }
    
    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      color: var(--muted-foreground);
    }
    
    .empty-state svg {
      width: 64px;
      height: 64px;
      margin: 0 auto 1.5rem;
      opacity: 0.5;
      color: var(--muted-foreground);
    }
    
    .empty-state p {
      font-size: 1rem;
      font-weight: 500;
    }
    
    .footer {
      background: linear-gradient(to right, var(--secondary) 0%, var(--muted) 100%);
      padding: 2.5rem 2rem;
      text-align: center;
      color: var(--muted-foreground);
      border-top: 1px solid var(--border);
    }
    
    .footer p {
      font-size: 0.9375rem;
      line-height: 1.6;
    }
    
    .footer a {
      color: var(--nitrocloud-primary);
      text-decoration: none;
      font-weight: 600;
      transition: color 0.2s;
    }
    
    .footer a:hover {
      color: var(--nitrocloud-primary-dark);
      text-decoration: underline;
    }
    
    @media (max-width: 768px) {
      body {
        padding: 1rem;
      }
      
      .header {
        padding: 3rem 1.5rem;
      }
      
      .header h1 {
        font-size: 2.25rem;
      }
      
      .content {
        padding: 2rem 1.5rem;
      }
      
      .section h2 {
        font-size: 1.75rem;
      }
      
      .tools-grid {
        grid-template-columns: 1fr;
      }
      
      .connection-info {
        padding: 1.5rem;
      }
    }
    
    @media (prefers-color-scheme: dark) {
      :root {
        --background: hsl(222.2, 84%, 4.9%);
        --foreground: hsl(210, 40%, 98%);
        --primary: hsl(217, 91%, 60%);
        --secondary: hsl(217.2, 32.6%, 17.5%);
        --muted: hsl(217.2, 32.6%, 17.5%);
        --muted-foreground: hsl(215, 20.2%, 65.1%);
        --border: hsl(217.2, 32.6%, 17.5%);
      }
      
      .connection-info code {
        background: hsl(217.2, 32.6%, 17.5%);
        color: hsl(142, 76%, 56%);
      }
      
      .tool-schema pre {
        background: hsl(217.2, 32.6%, 17.5%);
        color: hsl(142, 76%, 56%);
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${this.logoBase64 ? `
      <div class="logo-container">
        <img src="data:image/png;base64,${this.logoBase64}" alt="NitroCloud Logo" class="logo">
      </div>
      ` : ''}
      <h1>${serverName}</h1>
      <div class="version">v${serverVersion}</div>
      <div class="description">${serverDescription}</div>
    </div>
    
    <div class="content">
      <div class="section">
        <h2>🔌 Connection Information</h2>
        <div class="connection-info">
          <p>MCP Endpoint</p>
          <code>${mcpEndpoint}</code>
          <p class="description">
            Connect to this MCP server using the endpoint above. The server supports Server-Sent Events (SSE) for real-time bidirectional communication following the Model Context Protocol specification.
          </p>
        </div>
      </div>
      
      <div class="section">
        <h2>🛠️ Available Tools</h2>
        ${tools.length > 0 ? `
          <div class="tools-grid">
            ${tools.map(tool => `
              <div class="tool-card">
                <div class="tool-name">${this.escapeHtml(tool.name)}</div>
                <div class="tool-description">${this.escapeHtml(tool.description || 'No description available')}</div>
                ${(tool as any).widget || (tool as any).outputTemplate || tool._meta?.['openai/outputTemplate'] ? `
                  <span class="badge widget">🎨 Has UI Widget</span>
                ` : ''}
                ${tool.inputSchema ? `
                  <details class="tool-schema">
                    <summary>Input Schema</summary>
                    <pre>${this.escapeHtml(JSON.stringify(tool.inputSchema, null, 2))}</pre>
                  </details>
                ` : ''}
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No tools are currently registered on this server.</p>
          </div>
        `}
      </div>
    </div>
    
    <div class="footer">
      <p>Built with <a href="https://nitrostack.ai" target="_blank" rel="noopener noreferrer">NitroStack</a> - The TypeScript MCP Framework</p>
      <p style="margin-top: 0.5rem; font-size: 0.875rem;">Model Context Protocol Server</p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}
