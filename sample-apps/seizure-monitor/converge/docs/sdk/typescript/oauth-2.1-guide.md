# OAuth 2.1 Guide (Legacy Alias)

## Canonical Documentation

This page is a legacy alias kept for backward compatibility. The canonical guide is:

- [OAuth 2.1 Authentication](./11-oauth-authentication.md)

See also:

- [Authentication Overview](./09-authentication-overview.md)
- [Guards Reference](../../api-reference/guards.md)

## Legacy Content

The remaining content below is retained temporarily for older bookmarks and links.

## Why OAuth 2.1?

OAuth 2.1 is required for:
- **OpenAI Apps SDK integration** - Required by OpenAI's ecosystem
- **Third-party integrations** - Google, GitHub, Microsoft, etc.
- **Secure delegated access** - Users grant access without sharing passwords
- **Production-grade security** - Industry-standard authorization

## Quick Start

### 1. Install Dependencies

```bash
npm install @panva/oauth4webapi
```

### 2. Environment Variables

```env
# .env
OAUTH_CLIENT_ID=your-client-id
OAUTH_CLIENT_SECRET=your-client-secret
OAUTH_REDIRECT_URI=http://localhost:3000/auth/callback
OAUTH_ISSUER=https://accounts.google.com
OAUTH_SCOPES=openid profile email
```

### 3. Create OAuth Module

```typescript
// src/modules/oauth/oauth.module.ts
import { Module } from '@nitrostack/core';
import { OAuthTools } from './oauth.tools.js';
import { OAuthService } from './oauth.service.js';
import { OAuthGuard } from './oauth.guard.js';

@Module({
  name: 'oauth',
  description: 'OAuth 2.1 authentication',
  controllers: [OAuthTools],
  providers: [OAuthService, OAuthGuard],
  exports: [OAuthService, OAuthGuard]
})
export class OAuthModule {}
```

## OAuth Service

### Complete OAuth Service Implementation

```typescript
// src/modules/oauth/oauth.service.ts
import { Injectable } from '@nitrostack/core';
import * as oauth from '@panva/oauth4webapi';

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  issuer: string;
  scopes: string[];
}

@Injectable()
export class OAuthService {
  private config: OAuthConfig;
  private client!: oauth.Client;
  private authServer!: oauth.AuthorizationServer;
  
  constructor(private configService: ConfigService) {
    this.config = {
      clientId: this.configService.get('OAUTH_CLIENT_ID'),
      clientSecret: this.configService.get('OAUTH_CLIENT_SECRET'),
      redirectUri: this.configService.get('OAUTH_REDIRECT_URI'),
      issuer: this.configService.get('OAUTH_ISSUER'),
      scopes: this.configService.get('OAUTH_SCOPES', 'openid profile email').split(' ')
    };
    
    this.initialize();
  }
  
  private async initialize() {
    // Discover OAuth server configuration
    const issuer = new URL(this.config.issuer);
    this.authServer = await oauth
      .discoveryRequest(issuer)
      .then((response) => oauth.processDiscoveryResponse(issuer, response));
    
    // Setup client
    this.client = {
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      token_endpoint_auth_method: 'client_secret_basic'
    };
  }
  
  /**
   * Generate authorization URL with PKCE
   */
  async generateAuthUrl(): Promise<{ url: string; codeVerifier: string; state: string }> {
    // Generate PKCE code verifier and challenge
    const codeVerifier = oauth.generateRandomCodeVerifier();
    const codeChallenge = await oauth.calculatePKCECodeChallenge(codeVerifier);
    const codeChallengeMethod = 'S256';
    
    // Generate state for CSRF protection
    const state = oauth.generateRandomState();
    
    // Build authorization URL
    const authorizationUrl = new URL(this.authServer.authorization_endpoint!);
    authorizationUrl.searchParams.set('client_id', this.config.clientId);
    authorizationUrl.searchParams.set('redirect_uri', this.config.redirectUri);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('scope', this.config.scopes.join(' '));
    authorizationUrl.searchParams.set('state', state);
    authorizationUrl.searchParams.set('code_challenge', codeChallenge);
    authorizationUrl.searchParams.set('code_challenge_method', codeChallengeMethod);
    
    return {
      url: authorizationUrl.toString(),
      codeVerifier,
      state
    };
  }
  
  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(
    code: string,
    codeVerifier: string,
    state: string,
    receivedState: string
  ): Promise<oauth.TokenEndpointResponse> {
    // Verify state to prevent CSRF
    if (state !== receivedState) {
      throw new Error('State mismatch - possible CSRF attack');
    }
    
    // Exchange authorization code for tokens
    const params = new URLSearchParams();
    params.set('grant_type', 'authorization_code');
    params.set('code', code);
    params.set('redirect_uri', this.config.redirectUri);
    params.set('code_verifier', codeVerifier);
    
    const response = await oauth.authorizationCodeGrantRequest(
      this.authServer,
      this.client,
      params
    );
    
    return await oauth.processAuthorizationCodeResponse(
      this.authServer,
      this.client,
      response
    );
  }
  
  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<oauth.TokenEndpointResponse> {
    const response = await oauth.refreshTokenGrantRequest(
      this.authServer,
      this.client,
      refreshToken
    );
    
    return await oauth.processRefreshTokenResponse(
      this.authServer,
      this.client,
      response
    );
  }
  
  /**
   * Validate and decode access token
   */
  async validateToken(accessToken: string): Promise<any> {
    const response = await oauth.userInfoRequest(
      this.authServer,
      this.client,
      accessToken
    );
    
    return await oauth.processUserInfoResponse(
      this.authServer,
      this.client,
      oauth.skipSubjectCheck,
      response
    );
  }
  
  /**
   * Revoke token
   */
  async revokeToken(token: string): Promise<void> {
    if (!this.authServer.revocation_endpoint) {
      throw new Error('Revocation not supported');
    }
    
    await oauth.revocationRequest(
      this.authServer,
      this.client,
      token
    );
  }
}
```

## OAuth Tools

### Authentication Flow Tools

```typescript
// src/modules/oauth/oauth.tools.ts
import { Tool, Widget, ExecutionContext } from '@nitrostack/core';
import { z } from 'zod';

export class OAuthTools {
  constructor(
    private oauthService: OAuthService,
    private sessionService: SessionService
  ) {}
  
  @Tool({
    name: 'oauth_authorize',
    description: 'Initiate OAuth 2.1 authorization flow',
    inputSchema: z.object({
      provider: z.enum(['google', 'github', 'microsoft']).describe('OAuth provider')
    }),
    examples: {
      response: {
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth?...',
        sessionId: 'session-123'
      }
    }
  })
  @Widget('oauth-authorize')
  async initiateOAuth(input: any, ctx: ExecutionContext) {
    // Generate authorization URL with PKCE
    const { url, codeVerifier, state } = await this.oauthService.generateAuthUrl();
    
    // Store PKCE parameters in session
    const sessionId = await this.sessionService.create({
      codeVerifier,
      state,
      provider: input.provider
    });
    
    ctx.logger.info('OAuth flow initiated', { provider: input.provider });
    
    return {
      authUrl: url,
      sessionId,
      message: 'Please visit the authorization URL to continue'
    };
  }
  
  @Tool({
    name: 'oauth_callback',
    description: 'Handle OAuth callback and exchange code for token',
    inputSchema: z.object({
      code: z.string().describe('Authorization code from OAuth provider'),
      state: z.string().describe('State parameter for CSRF protection'),
      sessionId: z.string().describe('Session ID from authorization request')
    }),
    examples: {
      response: {
        accessToken: 'ya29.a0AfH6...',
        refreshToken: 'ya29.a0AfH6...',
        expiresIn: 3600,
        tokenType: 'Bearer',
        user: {
          sub: 'user-123',
          email: 'user@example.com',
          name: 'John Doe'
        }
      }
    }
  })
  @Widget('oauth-success')
  async handleCallback(input: any, ctx: ExecutionContext) {
    // Retrieve session data
    const session = await this.sessionService.get(input.sessionId);
    if (!session) {
      throw new Error('Invalid session');
    }
    
    // Exchange code for tokens
    const tokenResponse = await this.oauthService.exchangeCodeForToken(
      input.code,
      session.codeVerifier,
      session.state,
      input.state
    );
    
    // Get user info
    const userInfo = await this.oauthService.validateToken(tokenResponse.access_token);
    
    // Store tokens securely
    await this.sessionService.update(input.sessionId, {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: Date.now() + (tokenResponse.expires_in * 1000),
      userInfo
    });
    
    ctx.logger.info('OAuth authentication successful', { sub: userInfo.sub });
    
    return {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresIn: tokenResponse.expires_in,
      tokenType: tokenResponse.token_type,
      user: userInfo
    };
  }
  
  @Tool({
    name: 'oauth_refresh',
    description: 'Refresh expired access token',
    inputSchema: z.object({
      refreshToken: z.string().describe('Refresh token')
    })
  })
  async refreshToken(input: any, ctx: ExecutionContext) {
    const tokenResponse = await this.oauthService.refreshToken(input.refreshToken);
    
    ctx.logger.info('Token refreshed successfully');
    
    return {
      accessToken: tokenResponse.access_token,
      expiresIn: tokenResponse.expires_in,
      tokenType: tokenResponse.token_type
    };
  }
  
  @Tool({
    name: 'oauth_revoke',
    description: 'Revoke OAuth token',
    inputSchema: z.object({
      token: z.string().describe('Access or refresh token to revoke')
    })
  })
  async revokeToken(input: any, ctx: ExecutionContext) {
    await this.oauthService.revokeToken(input.token);
    
    ctx.logger.info('Token revoked successfully');
    
    return { success: true, message: 'Token revoked' };
  }
}
```

## OAuth Guard

### Protect Tools with OAuth

```typescript
// src/modules/oauth/oauth.guard.ts
import { Guard, ExecutionContext, Injectable } from '@nitrostack/core';

@Injectable()
export class OAuthGuard implements Guard {
  constructor(private oauthService: OAuthService) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const accessToken = this.extractToken(context);
    
    if (!accessToken) {
      context.logger.warn('No OAuth token provided');
      return false;
    }
    
    try {
      // Validate token and get user info
      const userInfo = await this.oauthService.validateToken(accessToken);
      
      // Attach user info to context
      context.auth = {
        subject: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name,
        provider: 'oauth',
        token: accessToken
      };
      
      context.logger.info('OAuth authentication successful', { sub: userInfo.sub });
      return true;
      
    } catch (error) {
      context.logger.error('OAuth token validation failed:', error);
      return false;
    }
  }
  
  private extractToken(context: ExecutionContext): string | null {
    // Check Authorization header
    const authHeader = context.metadata?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    // Check metadata
    if (context.metadata?.accessToken) {
      return context.metadata.accessToken;
    }
    
    return null;
  }
}
```

### Using OAuth Guard

```typescript
import { Tool, UseGuards } from '@nitrostack/core';
import { OAuthGuard } from '../oauth/oauth.guard.js';

export class ProtectedTools {
  @Tool({ name: 'protected_resource' })
  @UseGuards(OAuthGuard)  // ← Requires OAuth authentication
  async protectedResource(input: any, ctx: ExecutionContext) {
    const userEmail = ctx.auth?.email;
    const userId = ctx.auth?.subject;
    
    // Access protected resource
    return await this.resourceService.getForUser(userId);
  }
}
```

## OpenAI Apps SDK Integration

### Configure for OpenAI

```typescript
// OpenAI Apps SDK requires specific OAuth 2.1 configuration
export const openAIConfig = {
  clientId: process.env.OPENAI_CLIENT_ID!,
  clientSecret: process.env.OPENAI_CLIENT_SECRET!,
  redirectUri: process.env.OPENAI_REDIRECT_URI!,
  issuer: 'https://auth.openai.com',
  scopes: ['openid', 'profile', 'email', 'offline_access'],
  
  // OpenAI-specific requirements
  audience: 'https://api.openai.com',
  responseType: 'code',
  grantType: 'authorization_code',
  
  // PKCE is required
  codeChallengeMethod: 'S256'
};
```

### OpenAI-Compatible Tools

```typescript
@Tool({
  name: 'openai_compatible_tool',
  description: 'Tool compatible with OpenAI Apps SDK',
  inputSchema: z.object({
    query: z.string()
  })
})
@UseGuards(OAuthGuard)  // OAuth 2.1 required for OpenAI
async openAITool(input: any, ctx: ExecutionContext) {
  // Tool implementation
  return { result: 'data' };
}
```

## Provider-Specific Configurations

### Google OAuth

```env
OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
OAUTH_CLIENT_SECRET=your-client-secret
OAUTH_ISSUER=https://accounts.google.com
OAUTH_SCOPES=openid profile email
```

### GitHub OAuth

```env
OAUTH_CLIENT_ID=your-github-client-id
OAUTH_CLIENT_SECRET=your-github-client-secret
OAUTH_ISSUER=https://github.com
OAUTH_SCOPES=read:user user:email
```

### Microsoft OAuth

```env
OAUTH_CLIENT_ID=your-microsoft-client-id
OAUTH_CLIENT_SECRET=your-microsoft-client-secret
OAUTH_ISSUER=https://login.microsoftonline.com/common/v2.0
OAUTH_SCOPES=openid profile email
```

## Security Best Practices

### 1. Always Use PKCE

```typescript
// Good - PKCE enabled
const codeVerifier = oauth.generateRandomCodeVerifier();
const codeChallenge = await oauth.calculatePKCECodeChallenge(codeVerifier);

// Avoid - No PKCE (insecure)
// Authorization code flow without PKCE is vulnerable
```

### 2. Validate State Parameter

```typescript
// Good - State validation
if (receivedState !== storedState) {
  throw new Error('CSRF detected');
}

// Avoid - No state validation
```

### 3. Store Tokens Securely

```typescript
// Good - Encrypted storage
await this.secureStorage.encrypt('token', accessToken);

// Avoid - Plain text storage
localStorage.setItem('token', accessToken);
```

### 4. Implement Token Refresh

```typescript
// Good - Auto-refresh before expiry
if (Date.now() >= tokenExpiresAt - 60000) {
  await this.refreshToken();
}

// Avoid - No refresh logic
```

### 5. Revoke on Logout

```typescript
// Good - Revoke token on logout
await this.oauthService.revokeToken(accessToken);

// Avoid - Just delete locally
delete storage.accessToken;
```

## Testing OAuth Flow

### Local Testing

```typescript
// Use ngrok for local HTTPS
// ngrok http 3000

// Update redirect URI
OAUTH_REDIRECT_URI=https://your-ngrok-url.ngrok.io/auth/callback
```

### Mock OAuth for Testing

```typescript
@Injectable()
export class MockOAuthService implements OAuthService {
  async generateAuthUrl() {
    return {
      url: 'http://localhost:3000/mock-auth',
      codeVerifier: 'mock-verifier',
      state: 'mock-state'
    };
  }
  
  async exchangeCodeForToken() {
    return {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_in: 3600,
      token_type: 'Bearer'
    };
  }
}
```

## Troubleshooting

### Invalid Grant Error

```
Cause: Code verifier doesn't match challenge
Solution: Ensure PKCE verifier is stored correctly
```

### State Mismatch

```
Cause: CSRF protection failed
Solution: Verify state parameter is preserved
```

### Token Expired

```
Cause: Access token expired
Solution: Implement automatic refresh
```

## Next Steps

- [API Key Authentication](./10-api-key-authentication.md)
- [Authentication Overview](./09-authentication-overview.md)
- [Guards Guide](../../api-reference/guards.md)

---

**Tip**: Always test your OAuth flow with actual providers before production deployment!

