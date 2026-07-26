/**
 * NitroStack Configuration — GeoTrust AI
 *
 * Configures the MCP server for both local (NitroStudio) and cloud (NitroCloud) deployment.
 *
 * Local dev:  STDIO transport (default when `npm run dev`)
 * Production: HTTP + SSE transport for cloud-hosted MCP endpoints
 */

import 'dotenv/config';

export default {
  /**
   * Server identity — matches app.module.ts @McpApp decorator
   */
  server: {
    name: 'geotrust-ai',
    version: '2.0.0',
  },

  /**
   * Transport configuration
   *
   * - 'stdio'  → for local NitroStudio (pipes JSON-RPC over stdin/stdout)
   * - 'http'   → for cloud deployment (HTTP + SSE, accepts remote MCP clients)
   * - 'dual'   → both transports simultaneously (recommended for production)
   */
  transport: process.env.MCP_TRANSPORT_TYPE || (process.env.NODE_ENV === 'production' ? 'http' : 'dual'),

  /**
   * HTTP server settings (only used when transport includes 'http' or 'dual')
   */
  http: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    cors: {
      enabled: process.env.ENABLE_CORS !== 'false',
      origins: process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',')
        : ['*'],
    },
  },

  /**
   * Widget configuration
   *
   * Points to the statically exported Next.js frontend.
   * NitroStack serves these files and injects tool output data
   * into `window.openai.toolOutput` at runtime.
   */
  widgets: {
    dir: './src/widgets/out',
    manifest: './src/widgets/widget-manifest.json',
  },

  /**
   * Logging
   */
  logging: {
    level: process.env.NITRO_LOG_LEVEL || 'info',
  },
};
