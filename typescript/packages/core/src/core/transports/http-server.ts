/**
 * HTTP Server Transport for MCP
 * 
 * Implements HTTP transport with Server-Sent Events (SSE) for bidirectional communication.
 * Required for OAuth 2.1 authentication as per MCP specification.
 * 
 * This transport:
 * - Exposes MCP over HTTP endpoints
 * - Provides OAuth 2.1 metadata endpoints (RFC 9728)
 * - Uses SSE for server-to-client messages
 * - Uses POST for client-to-server messages
 */

import express, { Express, Request, Response } from 'express';
import { Server as HttpServer } from 'http';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

export interface HttpServerTransportOptions {
  /**
   * Port to listen on (default: 3000)
   */
  port?: number;
  
  /**
   * Host to bind to (default: '0.0.0.0')
   */
  host?: string;
  
  /**
   * Base path for MCP endpoints (default: '/mcp')
   */
  basePath?: string;
  
  /**
   * OAuth configuration (if enabled)
   */
  oauth?: {
    resourceUri: string;
    authorizationServers: string[];
    scopesSupported?: string[];
  };
  
  /**
   * Custom Express app (optional - for integration with existing apps)
   */
  app?: Express;
}

/**
 * HTTP Server Transport
 * 
 * Implements MCP protocol over HTTP with SSE for real-time communication.
 * Compatible with OAuth 2.1 authentication.
 */
export class HttpServerTransport implements Transport {
  private app: Express;
  private server: HttpServer | null = null;
  private sseClients: Map<string, Response> = new Map();
  private messageHandler?: (message: JSONRPCMessage) => Promise<void>;
  private closeHandler?: () => void;
  private errorHandler?: (error: Error) => void;
  private options: Required<Omit<HttpServerTransportOptions, 'app' | 'oauth'>> & { oauth?: HttpServerTransportOptions['oauth'] };

  constructor(options: HttpServerTransportOptions = {}) {
    this.options = {
      port: options.port || 3000,
      host: options.host || '0.0.0.0',
      basePath: options.basePath || '/mcp',
      oauth: options.oauth,
    };

    this.app = options.app || express();
    this.setupRoutes();
  }

  /**
   * Setup HTTP routes for MCP protocol
   */
  private setupRoutes(): void {
    const basePath = this.options.basePath;

    // Enable CORS
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // JSON parsing
    this.app.use(express.json());

    // SSE endpoint for server-to-client messages
    this.app.get(`${basePath}/sse`, (req: Request, res: Response) => {
      this.handleSSE(req, res);
    });

    // POST endpoint for client-to-server messages
    this.app.post(`${basePath}/message`, async (req: Request, res: Response) => {
      await this.handleMessage(req, res);
    });

    // OAuth 2.1 Protected Resource Metadata (RFC 9728)
    if (this.options.oauth) {
      this.app.get('/.well-known/oauth-protected-resource', (req: Request, res: Response) => {
        this.handleProtectedResourceMetadata(req, res);
      });
    }

    // Root info endpoint
    this.app.get(basePath, (req: Request, res: Response) => {
      res.json({
        name: 'NitroStack MCP Server',
        version: '1.0.0',
        transport: 'HTTP',
        status: 'running',
        endpoints: {
          sse: `${basePath}/sse`,
          message: `${basePath}/message`,
          health: `${basePath}/health`,
        },
        docs: 'https://github.com/nitrostack/nitrostack',
      });
    });

    // Health check
    this.app.get(`${basePath}/health`, (req: Request, res: Response) => {
      res.json({ 
        status: 'ok', 
        transport: 'http',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Handle SSE connection for server-to-client messages
   */
  private handleSSE(req: Request, res: Response): void {
    const clientId = req.query.clientId as string || `client_${Date.now()}`;

    // Setup SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Store client
    this.sseClients.set(clientId, res);

    // Send initial connection event
    res.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);

    // Handle client disconnect
    req.on('close', () => {
      this.sseClients.delete(clientId);
    });
  }

  /**
   * Handle incoming message from client
   */
  private async handleMessage(req: Request, res: Response): Promise<void> {
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
  }

  /**
   * Handle OAuth Protected Resource Metadata request (RFC 9728)
   */
  private handleProtectedResourceMetadata(req: Request, res: Response): void {
    if (!this.options.oauth) {
      res.status(404).json({ error: 'OAuth not configured' });
      return;
    }

    const metadata = {
      resource: this.options.oauth.resourceUri,
      authorization_servers: this.options.oauth.authorizationServers,
      ...(this.options.oauth.scopesSupported && {
        scopes_supported: this.options.oauth.scopesSupported,
      }),
    };

    res.json(metadata);
  }

  /**
   * Start the HTTP server
   */
  async start(): Promise<void> {
    // Close existing server if any
    if (this.server) {
      await this.close();
    }

    return new Promise((resolve, reject) => {
      // Set up error handler BEFORE calling listen
      const errorHandler = (error: Error) => {
        console.error(`❌ Failed to start HTTP server: ${error.message}`);
        this.server = null;
        reject(error);
      };

      try {
        const server = this.app.listen(this.options.port, this.options.host);
        
        // Register error handler immediately
        server.once('error', errorHandler);
        
        // Success handler
        server.once('listening', () => {
          // Remove error handler since we're now listening
          server.removeListener('error', errorHandler);
          
          // Set up permanent error handler for runtime errors
          server.on('error', (error) => {
            if (this.errorHandler) {
              this.errorHandler(error);
            } else {
              console.error('HTTP server error:', error);
            }
          });
          
          this.server = server;
          
          console.error(`🌐 HTTP MCP Server listening on http://${this.options.host}:${this.options.port}${this.options.basePath}`);
          
          if (this.options.oauth) {
            console.error(`🔐 OAuth 2.1 enabled`);
            console.error(`   Resource URI: ${this.options.oauth.resourceUri}`);
            console.error(`   Auth Servers: ${this.options.oauth.authorizationServers.join(', ')}`);
            console.error(`   Metadata: http://${this.options.host}:${this.options.port}/.well-known/oauth-protected-resource`);
          }
          
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Send message to client(s)
   */
  async send(message: JSONRPCMessage): Promise<void> {
    const data = `data: ${JSON.stringify(message)}\n\n`;

    // Send to all connected SSE clients
    for (const [clientId, res] of this.sseClients) {
      try {
        res.write(data);
      } catch (error) {
        console.error(`Error sending to client ${clientId}:`, error);
        this.sseClients.delete(clientId);
      }
    }
  }

  /**
   * Close the transport
   */
  async close(): Promise<void> {
    // Close all SSE connections
    for (const [clientId, res] of this.sseClients) {
      try {
        res.end();
      } catch (error) {
        // Ignore errors on close
      }
    }
    this.sseClients.clear();

    // Close HTTP server
    if (this.server) {
      return new Promise((resolve) => {
        const server = this.server!;
        this.server = null; // Clear reference immediately
        
        // Force close all connections
        server.closeAllConnections?.(); // Available in Node 18+
        
        server.close((err) => {
          if (err) {
            console.error('HTTP server close error (ignoring):', err.message);
          } else {
            console.error('🔌 HTTP MCP Server closed');
          }
          
          // Small delay to ensure port is fully released
          setTimeout(() => {
            if (this.closeHandler) {
              this.closeHandler();
            }
            resolve();
          }, 100);
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
   * Get the Express app (for adding custom routes)
   */
  getApp(): Express {
    return this.app;
  }

  /**
   * Register a custom route handler (compatible with DiscoveryHttpServer interface)
   * @param path - The route path
   * @param handler - The request handler (Node.js http.RequestListener format)
   */
  on(path: string, handler: (req: Request, res: Response) => void): void {
    this.app.get(path, handler);
  }
}


