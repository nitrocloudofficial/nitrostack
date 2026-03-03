# Dual Transport Support (STDIO + HTTP)

NitroStack now supports dual transport mode, allowing MCP servers to expose tools via both STDIO (standard input/output) and HTTP transports simultaneously. This enables flexibility in how clients connect to your MCP servers.

## Overview

**What is Dual Transport?**

Dual transport allows your MCP server to:
- Accept direct STDIO connections (for local development and CLI tools)
- Accept HTTP connections with Server-Sent Events (SSE) for bidirectional communication (for remote access and web clients)

**Benefits:**

- **Flexibility**: Connect via STDIO locally or HTTP remotely
- **Compatibility**: Work with any MCP client that supports either transport
- **Development**: Test locally with STDIO, deploy with HTTP
- **Multiple Clients**: HTTP allows multiple clients to connect simultaneously

## How It Works

```
┌─────────────────────────────────────┐
│   Your MCP Server (Dual Mode)      │
├─────────────────────────────────────┤
│                                     │
│  📡 STDIO Transport                 │
│  ├─ MCP Protocol                    │
│  ├─ Direct process communication    │
│  └─ For local connections           │
│                                     │
│  🌐 HTTP Server (Port 3000)         │
│  ├─ SSE for server→client msgs      │
│  ├─ POST for client→server msgs     │
│  ├─ /mcp/sse endpoint               │
│  ├─ /mcp/message endpoint           │
│  └─ /mcp/health endpoint            │
│                                     │
└─────────────────────────────────────┘
```

## Configuration

### For Generated Projects

All projects generated with NitroStack templates now use dual transport by default:

```typescript
// src/index.ts
async function bootstrap() {
  const server = await McpApplicationFactory.create(AppModule);
  
  // Start with dual transport
  const port = parseInt(process.env.PORT || '3000');
  await server.start('dual', {
    port,
    host: '0.0.0.0',
    basePath: '/mcp',
  });
}
```

### Environment Variables

Configure the HTTP transport port via environment variables:

```bash
# .env
PORT=3002  # HTTP server port (default: 3002)
```

**Port Allocation:**
- **3000**: NitroStack Studio UI
- **3001**: Widget Dev Server
- **3002**: MCP HTTP Server (default)
- **3003+**: Additional MCP servers (if needed)

### Transport Options

You can customize the transport configuration:

```typescript
await server.start('dual', {
  port: 3002,              // HTTP server port (3000=Studio, 3001=Widgets)
  host: '0.0.0.0',        // Bind to all interfaces
  basePath: '/mcp',       // Base path for MCP endpoints
});
```

## Using STDIO Transport

**When to use STDIO:**
- Local development
- Direct process spawning
- Single client connections
- Integration with CLI tools

**Studio Configuration:**
1. Open NitroStack Studio
2. Go to **Settings** page
3. Select **STDIO** transport
4. Click **Save & Connect**

**Environment Setup (for Studio):**
```bash
export MCP_COMMAND="node"
export MCP_ARGS="[\"dist/index.js\"]"
```

## Using HTTP Transport

**When to use HTTP:**
- Remote server access
- Multiple simultaneous clients
- Web-based integrations
- Production deployments

**Studio Configuration:**
1. Start your MCP server: `npm run dev`
2. Open NitroStack Studio
3. Go to **Settings** page
4. Select **HTTP** transport
5. Enter Server URL: `http://localhost:3002` (MCP server port)
6. Base Path: `/mcp` (default)
7. Click **Save & Connect**

> **Note**: The MCP HTTP server runs on port 3002 by default to avoid conflicts with Studio (3000) and Widgets (3001).

**Programmatic Usage:**

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { HttpClientTransport } from './http-client-transport.js';

// Create HTTP transport
const transport = new HttpClientTransport({
  baseUrl: 'http://localhost:3000',
  basePath: '/mcp',
  headers: {
    'Authorization': 'Bearer your-token', // Optional
  },
});

// Start transport (establishes SSE connection)
await transport.start();

// Create and connect client
const client = new Client(
  { name: 'my-client', version: '1.0.0' },
  { capabilities: {} }
);

await client.connect(transport);

// Use the client
const tools = await client.listTools();
console.log('Available tools:', tools);
```

## HTTP Endpoints

When running in dual or HTTP mode, your server exposes these endpoints:

### SSE Endpoint (Server → Client)
```
GET /mcp/sse?clientId=<client-id>
```
Establishes a Server-Sent Events connection for receiving messages from the server.

### Message Endpoint (Client → Server)
```
POST /mcp/message
Content-Type: application/json

{
  "clientId": "client_123",
  "message": {
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 1
  }
}
```

### Health Check
```
GET /mcp/health

Response:
{
  "status": "ok",
  "transport": "http"
}
```

## OAuth 2.1 and HTTP Transport

When using OAuth authentication, HTTP transport is automatically enabled for OAuth metadata endpoints:

```typescript
@Module({
  imports: [
    OAuthModule.forRoot({
      resourceUri: process.env.RESOURCE_URI,
      authorizationServers: [process.env.AUTH_SERVER_URL],
      // ...
    }),
  ],
})
export class AppModule {}
```

The server will automatically expose:
- `/.well-known/oauth-protected-resource` - RFC 9728 metadata
- `/mcp/*` - MCP protocol endpoints

## Security Considerations

### STDIO Transport
- Runs in isolated process
- No network exposure
-  Single client only

### HTTP Transport
- Supports multiple clients
- Can use HTTPS in production
-  Exposed to network (use firewall rules)
-  Implement authentication for production use

**Production Recommendations:**

1. **Use HTTPS**: Deploy behind a reverse proxy (nginx, Caddy)
   ```nginx
   server {
     listen 443 ssl;
     server_name mcp.example.com;
     
     location /mcp/ {
       proxy_pass http://localhost:3000/mcp/;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
     }
   }
   ```

2. **Add Authentication**: Use OAuth 2.1, API Keys, or JWT tokens
   ```typescript
   await client.connect({
     type: 'http',
     baseUrl: 'https://mcp.example.com',
     headers: {
       'Authorization': 'Bearer ' + accessToken,
     },
   });
   ```

3. **Rate Limiting**: Implement rate limits to prevent abuse

4. **Firewall**: Restrict access to known IP ranges if possible

## Troubleshooting

### STDIO Connection Issues

**Problem**: "Failed to spawn process"
**Solution**: Check that MCP_COMMAND and MCP_ARGS are correct:
```bash
# Test manually
node dist/index.js
```

**Problem**: "Connection closed unexpectedly"
**Solution**: Check server logs for errors, ensure NODE_ENV is set

### HTTP Connection Issues

**Problem**: "Failed to establish SSE connection"
**Solutions**:
- Verify server is running: `curl http://localhost:3000/mcp/health`
- Check firewall rules
- Ensure port is not already in use: `lsof -i :3000`

**Problem**: "CORS errors in browser"
**Solution**: HTTP transport includes CORS headers by default. For custom domains, update CORS configuration.

**Problem**: "Connection timeout"
**Solution**: Increase timeout in HttpClientTransport options

## Examples

### Example 1: Local Development with STDIO

```bash
# Terminal 1: Start Studio
cd nitrostack/src/studio
npm run dev

# Studio will use STDIO by default (via MCP_COMMAND/MCP_ARGS)
```

### Example 2: Remote Development with HTTP

```bash
# Terminal 1: Start MCP Server
cd my-mcp-project
PORT=3001 npm run dev

# Terminal 2: Connect from anywhere
# Open Studio → Settings → HTTP Transport
# URL: http://localhost:3001
```

### Example 3: Multiple Clients via HTTP

```typescript
// Client 1
const client1 = new Client(/*...*/);
const transport1 = new HttpClientTransport({
  baseUrl: 'http://localhost:3000'
});
await transport1.start();
await client1.connect(transport1);

// Client 2 (simultaneously)
const client2 = new Client(/*...*/);
const transport2 = new HttpClientTransport({
  baseUrl: 'http://localhost:3000'
});
await transport2.start();
await client2.connect(transport2);

// Both clients can interact with the server simultaneously
```

## Migration Guide

### From STDIO-only to Dual Transport

If you have an existing NitroStack project using only STDIO:

1. **Update your `src/index.ts`:**

```typescript
// Old (STDIO only)
await server.start();

// New (Dual transport)
const port = parseInt(process.env.PORT || '3002');
await server.start('dual', {
  port,
  host: '0.0.0.0',
  basePath: '/mcp',
});
```

2. **Add PORT to `.env`:**
```bash
PORT=3002  # Avoid conflicts: 3000=Studio, 3001=Widgets, 3002=MCP
```

3. **Update your npm scripts** (optional):
```json
{
  "scripts": {
    "dev": "node dist/index.js",
    "start": "PORT=3000 node dist/index.js"
  }
}
```

4. **Test both transports:**
```bash
# Start server
npm run dev

# Test HTTP
curl http://localhost:3000/mcp/health

# Test STDIO via Studio (already works)
```

## Next Steps

- [OAuth 2.1 Authentication](../sdk/typescript/11-oauth-authentication.md)
- [Studio Overview](../studio/01-overview.md)
- [Authentication Overview](../sdk/typescript/09-authentication-overview.md)
- [Production Deployment](../deployment/01-checklist.md)

