
import http from 'http';
import net from 'net';

interface Logger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

export interface DiscoveryServerOptions {
  /** Preferred port to start on */
  port?: number;
  /** If true, try next available port if preferred port is in use */
  autoRetry?: boolean;
  /** Maximum number of ports to try */
  maxRetries?: number;
}

/**
 * Check if a port is available
 */
async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port);
  });
}

/**
 * Find an available port starting from the preferred port
 */
async function findAvailablePort(startPort: number, maxRetries: number): Promise<number> {
  for (let i = 0; i < maxRetries; i++) {
    const port = startPort + i;
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found in range ${startPort}-${startPort + maxRetries - 1}`);
}

export class DiscoveryHttpServer {
  private server: http.Server;
  private handlers: Map<string, http.RequestListener> = new Map();
  private _actualPort: number;
  private options: Required<DiscoveryServerOptions>;

  constructor(portOrOptions: number | DiscoveryServerOptions, private logger: Logger) {
    // Support both old (port number) and new (options object) API
    if (typeof portOrOptions === 'number') {
      this.options = {
        port: portOrOptions,
        autoRetry: false,
        maxRetries: 10,
      };
    } else {
      this.options = {
        port: portOrOptions.port ?? 3005,
        autoRetry: portOrOptions.autoRetry ?? true,
        maxRetries: portOrOptions.maxRetries ?? 10,
      };
    }
    this._actualPort = this.options.port;
    this.server = http.createServer(this.handleRequest.bind(this));
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    this.logger.info(`DiscoveryHttpServer: Received request for ${req.url}`);
    const handler = this.handlers.get(req.url || '');
    if (handler) {
      handler(req, res);
    } else {
      this.logger.warn(`DiscoveryHttpServer: No handler found for ${req.url}`);
      res.writeHead(404);
      res.end();
    }
  }

  public on(path: string, handler: http.RequestListener) {
    this.logger.info(`DiscoveryHttpServer: Registering handler for ${path}`);
    this.handlers.set(path, handler);
  }

  /**
   * Get the actual port the server is running on
   * (may differ from configured port if auto-retry found an available port)
   */
  public getPort(): number {
    return this._actualPort;
  }

  public async start(): Promise<void> {
    // Find available port if auto-retry is enabled
    if (this.options.autoRetry) {
      try {
        this._actualPort = await findAvailablePort(this.options.port, this.options.maxRetries);
        if (this._actualPort !== this.options.port) {
          this.logger.info(`DiscoveryHttpServer: Port ${this.options.port} in use, using ${this._actualPort}`);
        }
      } catch (error) {
        this.logger.error(`DiscoveryHttpServer: Failed to find available port`, error);
        throw error;
      }
    }

    return new Promise((resolve, reject) => {
      this.server.listen(this._actualPort, () => {
        this.logger.info(`🚀 OAuth discovery server running at http://localhost:${this._actualPort}`);
        resolve();
      });

      this.server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE' && !this.options.autoRetry) {
          this.logger.error(
            `OAuth discovery server error: Port ${this._actualPort} is already in use. ` +
            `Set OAUTH_DISCOVERY_PORT to a different port or enable auto-retry.`
          );
        } else {
          this.logger.error('OAuth discovery server error', err);
        }
        reject(err);
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server.listening) {
        this.server.close(() => {
          this.logger.info('OAuth discovery server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
