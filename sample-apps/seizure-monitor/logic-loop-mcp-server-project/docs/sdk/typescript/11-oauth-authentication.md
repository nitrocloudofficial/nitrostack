# OAuth 2.1 Authentication

OAuth 2.1 is the **gold standard** for modern API authentication. NitroStack makes it **incredibly easy** to implement production-grade OAuth - no complex setup, no security pitfalls.

## Why OAuth 2.1?

**Industry Standard** - Used by Google, Microsoft, Auth0, etc.
**User-Facing Apps** - Perfect for applications with end users
**Fine-Grained Permissions** - Scope-based access control
**Temporary Access** - Short-lived tokens with refresh
**Federated Identity** - Users login with existing accounts
**MCP Compliant** - Follows MCP & OpenAI Apps SDK specs

---

## How Easy Is It?

### Traditional OAuth Implementation ❌

```typescript
// 500+ lines of code
// - Token validation
// - JWKS fetching & caching
// - Audience validation
// - Issuer validation
// - Scope checking
// - Metadata endpoints
// - Error handling
// ... and more
```

### NitroStack OAuth Implementation ✅

```typescript
// 10 lines of code!
import { OAuthModule, UseGuards, OAuthGuard } from '@nitrostack/core';

OAuthModule.forRoot({
  resourceUri: 'http://localhost:3002',
  authorizationServers: ['https://auth.example.com'],
  scopesSupported: ['read', 'write', 'admin'],
});

@Tool({ name: 'protected' })
@UseGuards(OAuthGuard)
async protected() { /* ... */ }
```

**That's it!** NitroStack handles everything else automatically.

---

## 📦 Built-in OAuth Module

NitroStack's `OAuthModule` is a **complete, production-ready** OAuth 2.1 implementation.

### What It Does Automatically

**Token Validation** - JWT signature, expiry, audience, issuer
**JWKS Management** - Fetches & caches public keys
**Metadata Endpoints** - RFC 9728 Protected Resource Metadata
**Audience Binding** - RFC 8707 Resource Indicators
**Token Introspection** - RFC 7662 for opaque tokens
**Scope Validation** - Fine-grained permissions
**Error Handling** - Clear, actionable error messages
**Dual Transport** - STDIO for MCP + HTTP for OAuth metadata

---

## Quick Start

### 1. Install Template

```bash
npx @nitrostack/cli init my-oauth-server
# Select: typescript-oauth
cd my-oauth-server
npm install
```

### 2. Setup Auth0 (5 Minutes)

Follow the complete guide in [`templates/typescript-oauth/OAUTH_SETUP.md`](../../templates/typescript-oauth/OAUTH_SETUP.md)

**Quick Summary:**

1. Create Auth0 Application (get Client ID/Secret)
2. Create Auth0 API (set Identifier = your RESOURCE_URI)
3. Add scopes: `read`, `write`, `admin`
4. Configure `.env` with your Auth0 settings

### 3. Configure OAuth Module

```typescript
// src/app.module.ts
import { Module, OAuthModule } from "@nitrostack/core";

@Module({
  name: "app",
  imports: [
    OAuthModule.forRoot({
      // Your MCP server's public URL
      resourceUri: process.env.RESOURCE_URI!,

      // Your OAuth provider(s)
      authorizationServers: [process.env.AUTH_SERVER_URL!],

      // Supported scopes
      scopesSupported: ["read", "write", "admin"],

      // Optional: Token validation
      audience: process.env.TOKEN_AUDIENCE,
      issuer: process.env.TOKEN_ISSUER,
    }),
  ],
})
export class AppModule {}
```

### 4. Start Server

```bash
npm run dev
```

**You'll see:**

```
🌐 HTTP MCP Server listening on http://0.0.0.0:3002/mcp
🔐 OAuth 2.1 enabled
Server started successfully (DUAL: STDIO + HTTP)
📡 MCP Protocol: STDIO (for Studio/Claude)
🌐 OAuth Metadata: HTTP (port 3002)
```

### 5. Test in Studio

1. Open Studio at `http://localhost:3000`
2. Auth → OAuth 2.1
3. Discover: `http://localhost:3002`
4. Enter Client ID/Secret
5. Start OAuth Flow
6. Login & Authorize
7. Done! Test protected tools

---

## 🛡️ Protecting Tools

### Basic Protection

```typescript
import { Tool, UseGuards, OAuthGuard } from "@nitrostack/core";

export class DemoTools {
  // Public tool - no authentication
  @Tool({
    name: "get_server_info",
    description: "Get public server information",
  })
  async getServerInfo() {
    return {
      name: "My MCP Server",
      version: "1.0.0",
    };
  }

  // Protected tool - requires valid OAuth token
  @Tool({
    name: "get_user_profile",
    description: "Get authenticated user profile",
  })
  @UseGuards(OAuthGuard)
  async getUserProfile(@ExecutionContext() context: ExecutionContext) {
    return {
      user: context.auth.subject, // 'auth0|abc123'
      scopes: context.auth.scopes, // ['read', 'write']
      claims: context.auth.claims, // Full token payload
    };
  }
}
```

### Scope-Based Access

```typescript
import { Tool, UseGuards, OAuthGuard, createScopeGuard } from '@nitrostack/core';

export class ResourceTools {
  // Requires 'read' scope
  @Tool({ name: 'list_resources' })
  @UseGuards(OAuthGuard, createScopeGuard('read'))
  async listResources() {
    return { resources: [...] };
  }

  // Requires 'write' scope
  @Tool({ name: 'create_resource' })
  @UseGuards(OAuthGuard, createScopeGuard('write'))
  async createResource() {
    // Only users with 'write' scope can call this
  }

  // Requires BOTH 'read' AND 'admin' scopes
  @Tool({ name: 'admin_stats' })
  @UseGuards(OAuthGuard, createScopeGuard('read', 'admin'))
  async adminStats() {
    // Only admins with read access
  }
}
```

---

## Architecture: Dual Transport

NitroStack runs **two transports simultaneously** for OAuth servers:

```
┌──────────────────────────────────────────┐
│      Your OAuth 2.1 MCP Server           │
├──────────────────────────────────────────┤
│                                          │
│  📡 STDIO Transport                      │
│  ├─ MCP Protocol Communication           │
│  ├─ Tool Execution                       │
│  ├─ Connected to Studio/Claude           │
│  └─ Fast, efficient, standard            │
│                                          │
│  🌐 HTTP Server (Port 3002)              │
│  ├─ OAuth Metadata Endpoints             │
│  ├─ /.well-known/oauth-protected-        │
│  │   resource (RFC 9728)                 │
│  ├─ Token Validation                     │
│  └─ Discovery & Registration             │
│                                          │
└──────────────────────────────────────────┘
```

### Why Dual Transport?

1. **STDIO** - Fast MCP protocol for tool calls
2. **HTTP** - Standards-compliant OAuth metadata
3. **Best of Both** - Performance + Compatibility
4. **Automatic** - You don't configure anything!

When you enable `OAuthModule`, NitroStack automatically:

- Keeps STDIO for MCP protocol
- Starts HTTP server for OAuth metadata
- Exposes discovery endpoints
- Handles all the complexity

---

## Token Validation

NitroStack validates **every aspect** of OAuth tokens automatically.

### What Gets Validated

```typescript
// Token must be:
Valid JWT format
Not expired (exp claim)
Correct audience (aud claim)
Correct issuer (iss claim)
Valid signature (verified against JWKS)
Not used before valid time (nbf claim)
Has required scopes
```

### Example Token

```json
{
  "iss": "https://auth.example.com/",
  "sub": "auth0|abc123",
  "aud": "http://localhost:3002",
  "exp": 1234567890,
  "iat": 1234564290,
  "scope": "read write admin",
  "email": "user@example.com"
}
```

### Access Token Claims

```typescript
@Tool({ name: 'check_token' })
@UseGuards(OAuthGuard)
async checkToken(@ExecutionContext() context: ExecutionContext) {
  const token = context.auth;

  return {
    // Standard claims
    subject: token.subject,          // User ID
    scopes: token.scopes,            // ['read', 'write']
    expiresAt: token.expiresAt,      // Expiration timestamp

    // Full token payload
    claims: token.claims,            // All claims
    email: token.claims.email,       // Custom claims
  };
}
```

---

## 🌐 OAuth Flow Explained

### Complete Flow Diagram

```
┌────────┐                                  ┌────────────┐
│ Studio │                                  │  Your MCP  │
│        │                                  │   Server   │
└───┬────┘                                  └─────┬──────┘
    │                                             │
    │ 1. Discover OAuth Config                   │
    ├─────────────────────────────────────────►  │
    │    GET /.well-known/oauth-protected-resource
    │                                             │
    │ 2. OAuth Metadata Response                 │
    │  ◄─────────────────────────────────────────┤
    │    { resource, authorization_servers, ... }
    │                                             │
┌───┴──────┐
│          │
│ User     │
│ Enters   │ 3. User Enters Client ID/Secret
│ Creds    │
│          │
└───┬──────┘
    │
    │ 4. Start OAuth Flow
    ├─────────────────────────┐
    │                         │
    │                   ┌─────▼──────┐
    │                   │   Auth0    │
    │ 5. Redirect       │   Login    │
    │  ◄────────────────┤            │
    │                   └─────┬──────┘
    │                         │
    │ 6. User Logs In         │
    ├────────────────────────►│
    │                         │
    │ 7. Authorization Code   │
    │  ◄──────────────────────┤
    │                         │
    │ 8. Exchange Code        │
    ├────────────────────────►│
    │                         │
    │ 9. JWT Access Token     │
    │  ◄──────────────────────┤
    │                         │
    │ 10. Store Token         │
    │                         │
    │ 11. Call Tool (+ Token) │
    ├───────────────────────────────────────────►│
    │                         │                  │
    │                         │  12. Validate    │
    │                         │      Token       │
    │                         │                  │
    │ 13. Tool Response       │                  │
    │  ◄──────────────────────────────────────────┤
    │                         │                  │
```

---

## Advanced Configuration

### Token Introspection (Opaque Tokens)

If your OAuth provider uses opaque tokens (not JWTs):

```typescript
OAuthModule.forRoot({
  resourceUri: process.env.RESOURCE_URI!,
  authorizationServers: [process.env.AUTH_SERVER_URL!],
  scopesSupported: ["read", "write"],

  // Token introspection (RFC 7662)
  tokenIntrospectionEndpoint: process.env.INTROSPECTION_ENDPOINT,
  tokenIntrospectionClientId: process.env.INTROSPECTION_CLIENT_ID,
  tokenIntrospectionClientSecret: process.env.INTROSPECTION_CLIENT_SECRET,
});
```

### Custom Token Validation

Add your own validation logic:

```typescript
OAuthModule.forRoot({
  resourceUri: process.env.RESOURCE_URI!,
  authorizationServers: [process.env.AUTH_SERVER_URL!],
  scopesSupported: ["read", "write"],

  // Custom validation
  customValidation: async (tokenPayload) => {
    // Check if user is active in your database
    const user = await db.users.findOne({ id: tokenPayload.sub });
    if (!user || !user.active) {
      return false;
    }

    // Check subscription status
    if (!user.subscription || user.subscription.expired) {
      return false;
    }

    return true;
  },
});
```

### Multiple Authorization Servers

Support federated authentication:

```typescript
OAuthModule.forRoot({
  resourceUri: process.env.RESOURCE_URI!,

  // Accept tokens from multiple providers
  authorizationServers: [
    "https://auth0.example.com",
    "https://okta.example.com",
    "https://azuread.example.com",
  ],

  scopesSupported: ["read", "write"],
});
```

---

## Security Features

### 1. Token Audience Binding (RFC 8707)

**Critical for security!** Tokens are validated to ensure they were issued specifically for your MCP server.

```typescript
// Token MUST have your RESOURCE_URI in the audience claim
{
  "aud": "http://localhost:3002",  // ← Must match RESOURCE_URI
  "sub": "user123",
  "scope": "read write"
}
```

**Why This Matters:**

- Without audience binding: Tokens from ANY service work
- With audience binding: Only tokens for YOUR service work

### 2. No Token Passthrough

**Never forward OAuth tokens to other services!**

```typescript
// WRONG - Security vulnerability!
async function callUpstream(clientToken: string) {
  await upstreamAPI.call({
    headers: { Authorization: clientToken },
  });
}

// CORRECT - Get separate token
async function callUpstream() {
  const upstreamToken = await getTokenForUpstream();
  await upstreamAPI.call({
    headers: { Authorization: upstreamToken },
  });
}
```

### 3. Short-Lived Tokens

Configure your OAuth provider to issue short-lived tokens:

```
Access Token: 1 hour
Refresh Token: 30 days
```

NitroStack Studio automatically handles token refresh.

---

## 🧪 Testing

### In Studio

**Complete flow:**

1. Auth → OAuth 2.1
2. Discover server
3. Enter credentials
4. Start OAuth flow
5. Login & authorize
6. Test tools

### Programmatic Testing

```typescript
// test/oauth.test.ts
import { createTestClient } from "nitrostack/testing";

describe("OAuth Authentication", () => {
  it("should protect tools with OAuth", async () => {
    const client = await createTestClient(AppModule);

    // Without token - should fail
    await expect(client.callTool("protected_tool", {})).rejects.toThrow(
      "OAuth token required"
    );

    // With token - should succeed
    const result = await client.callTool(
      "protected_tool",
      {},
      {
        token: "eyJhbGciOiJSUzI1NiIs...", // Valid JWT
      }
    );

    expect(result.success).toBe(true);
  });

  it("should validate scopes", async () => {
    const client = await createTestClient(AppModule);

    // Token without required scope
    await expect(
      client.callTool(
        "admin_tool",
        {},
        {
          token: tokenWithoutAdminScope,
        }
      )
    ).rejects.toThrow("Insufficient scope");
  });
});
```

---

## Production Deployment

### 1. Use Production OAuth Provider

```bash
# Production environment variables
RESOURCE_URI=https://mcp.yourapp.com
AUTH_SERVER_URL=https://auth.yourapp.com
TOKEN_AUDIENCE=https://mcp.yourapp.com
TOKEN_ISSUER=https://auth.yourapp.com/
```

### 2. Configure HTTPS

OAuth **requires HTTPS** in production:

```typescript
// Use reverse proxy (nginx, Cloudflare, etc.)
// Or configure HTTPS directly:
OAuthModule.forRoot({
  resourceUri: "https://mcp.yourapp.com", // HTTPS!
  // ...
});
```

### 3. Monitor Token Usage

```typescript
// Add logging/metrics
OAuthModule.forRoot({
  customValidation: async (token) => {
    // Log token usage
    await metrics.increment("oauth.token.validated", {
      user: token.sub,
      scopes: token.scope,
    });

    return true;
  },
});
```

---

## Common Patterns

### Role-Based Access Control

```typescript
// Map OAuth scopes to roles
@Tool({ name: 'admin_panel' })
@UseGuards(OAuthGuard, createScopeGuard('admin'))
async adminPanel(@ExecutionContext() context: ExecutionContext) {
  const userRoles = context.auth.claims.roles;  // ['admin', 'moderator']

  if (!userRoles.includes('admin')) {
    throw new Error('Admin role required');
  }

  // ... admin operations
}
```

### Tenant Isolation

```typescript
// Multi-tenant applications
@Tool({ name: 'get_data' })
@UseGuards(OAuthGuard)
async getData(@ExecutionContext() context: ExecutionContext) {
  const tenantId = context.auth.claims.tenant_id;

  // Only return data for user's tenant
  return await db.data.find({ tenantId });
}
```

---

## 📚 Standards Compliance

NitroStack implements:

**OAuth 2.1** ([draft-ietf-oauth-v2-1-13](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-13))
**RFC 9728** - Protected Resource Metadata
**RFC 8414** - Authorization Server Metadata
**RFC 7591** - Dynamic Client Registration
**RFC 8707** - Resource Indicators (Token Audience Binding)
**RFC 7636** - PKCE
**RFC 7662** - Token Introspection

Compatible with:
[MCP Specification](https://modelcontextprotocol.io/specification/draft/basic/authorization)
[OpenAI Apps SDK](https://developers.openai.com/apps-sdk/build/auth)

---

## 🌐 Supported Providers

NitroStack works with **any** RFC-compliant OAuth 2.1 provider:

- **Auth0** - Easiest for testing
- **Okta** - Enterprise-ready
- **Keycloak** - Self-hosted
- **Azure AD / Entra ID**
- **Google Identity Platform**
- **AWS Cognito**
- **Custom OAuth servers**

See [`templates/typescript-oauth/OAUTH_SETUP.md`](../../templates/typescript-oauth/OAUTH_SETUP.md) for provider-specific setup guides.

---

## Why NitroStack Makes OAuth Easy

### Traditional Approach ❌

**Complexity:**

- 500+ lines of boilerplate code
- Manual JWKS fetching & caching
- Token validation logic
- Metadata endpoints
- Audience/issuer validation
- Scope checking
- Error handling
- Security pitfalls everywhere

**Time:** 2-3 days to implement correctly

### NitroStack Approach ✅

**Simplicity:**

```typescript
OAuthModule.forRoot({ resourceUri, authorizationServers, scopesSupported });
@UseGuards(OAuthGuard)
```

**Time:** 5 minutes!

### What You Get

**Production-Grade** - Battle-tested OAuth implementation
**Standards-Compliant** - Follows all RFCs
**Secure by Default** - No security pitfalls
**Zero Config** - Sensible defaults, works out of the box
**Fully Tested** - Comprehensive test suite
**Well Documented** - Clear, actionable docs
**Active Maintenance** - Regular updates

---

## Learn More

- [OAuth 2.1 Template](../../templates/typescript-oauth/)
- [Complete Setup Guide](../../templates/typescript-oauth/OAUTH_SETUP.md)
- [Multi-Auth Patterns](./09-authentication-overview.md#multi-auth-patterns)
- [Guards Reference](../../api-reference/guards.md)
- [ExecutionContext Reference](../../api-reference/execution-context.md)

---

**Previous:** [← API Key Authentication](./10-api-key-authentication.md)
