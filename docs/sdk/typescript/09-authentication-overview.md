# Authentication Guide

## Overview

NitroStack v3.0 supports multiple authentication methods:
- **JWT (JSON Web Tokens)** - For authenticated API calls
- **API Keys** - For service-to-service authentication
- **OAuth 2.1** - For third-party integrations (including OpenAI Apps SDK)

## Guards

### What are Guards?

Guards determine whether a request should be processed. They're used primarily for authentication and authorization.

```typescript
import { Guard, ExecutionContext } from '@nitrostack/core';

export class JWTGuard implements Guard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if user is authenticated
    const token = this.extractToken(context);
    
    if (!token) {
      return false;
    }
    
    try {
      const payload = await this.verifyToken(token);
      context.auth = {
        subject: payload.sub,
        token: token,
        ...payload
      };
      return true;
    } catch (error) {
      return false;
    }
  }
  
  private extractToken(context: ExecutionContext): string | null {
    // Extract from metadata or arguments
    return context.metadata?.token || null;
  }
  
  private async verifyToken(token: string): Promise<any> {
    // Verify JWT token
    // Implementation depends on your JWT library
  }
}
```

### Using Guards

```typescript
import { UseGuards } from '@nitrostack/core';

export class UserTools {
  @Tool({ name: 'get_profile' })
  @UseGuards(JWTGuard)  // ← Requires JWT authentication
  async getProfile(input: any, ctx: ExecutionContext) {
    const userId = ctx.auth?.subject;  // ← Available from guard
    return await this.userService.findById(userId);
  }
  
  @Tool({ name: 'delete_user' })
  @UseGuards(JWTGuard, AdminGuard)  // ← Multiple guards
  async deleteUser(input: any, ctx: ExecutionContext) {
    // Requires both JWT auth AND admin role
  }
}
```

## JWT Authentication

### Setup JWTModule

```typescript
import { JWTModule, Module, McpApp } from '@nitrostack/core';

@McpApp({
  server: { name: 'my-server', version: '1.0.0' }
})
@Module({
  imports: [
    JWTModule.forRoot({
      secret: process.env.JWT_SECRET!,
      expiresIn: '7d'
    }),
    // Other modules...
  ]
})
export class AppModule {}
```

### Create JWT Guard

```typescript
import { Guard, ExecutionContext, Injectable } from '@nitrostack/core';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JWTGuard implements Guard {
  constructor(private config: ConfigService) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const token = this.extractToken(context);
    
    if (!token) {
      context.logger.warn('No token provided');
      return false;
    }
    
    try {
      const secret = this.config.get('JWT_SECRET');
      const payload = jwt.verify(token, secret) as any;
      
      // Attach auth info to context
      context.auth = {
        subject: payload.sub,
        email: payload.email,
        role: payload.role,
        token: token
      };
      
      context.logger.info(`Authenticated user: ${payload.sub}`);
      return true;
      
    } catch (error) {
      context.logger.error('Token verification failed:', error);
      return false;
    }
  }
  
  private extractToken(context: ExecutionContext): string | null {
    // From metadata (MCP protocol)
    if (context.metadata?.authorization) {
      const auth = context.metadata.authorization;
      if (auth.startsWith('Bearer ')) {
        return auth.substring(7);
      }
    }
    
    // From tool arguments (for testing)
    if (context.metadata?.token) {
      return context.metadata.token;
    }
    
    return null;
  }
}
```

### Login Tool

```typescript
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';

export class AuthTools {
  constructor(
    private userService: UserService,
    private config: ConfigService
  ) {}
  
  @Tool({
    name: 'login',
    description: 'Authenticate user and get JWT token',
    inputSchema: z.object({
      email: z.string().email(),
      password: z.string()
    })
  })
  @Widget('login-success')
  async login(input: any, ctx: ExecutionContext) {
    // Find user
    const user = await this.userService.findByEmail(input.email);
    if (!user) {
      throw new Error('Invalid credentials');
    }
    
    // Verify password
    const valid = await bcrypt.compare(input.password, user.password_hash);
    if (!valid) {
      throw new Error('Invalid credentials');
    }
    
    // Generate JWT
    const secret = this.config.get('JWT_SECRET');
    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role
      },
      secret,
      { expiresIn: '7d' }
    );
    
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    };
  }
  
  @Tool({ name: 'whoami' })
  @UseGuards(JWTGuard)
  @Widget('user-profile')
  async whoami(input: any, ctx: ExecutionContext) {
    const userId = ctx.auth?.subject;
    const user = await this.userService.findById(userId);
    return user;
  }
}
```

## API Key Authentication

NitroStack provides built-in **ApiKeyModule** for simple and secure API key authentication.

### Setup ApiKeyModule

```typescript
import { ApiKeyModule, Module, McpApp } from '@nitrostack/core';

@McpApp({
  server: { name: 'my-server', version: '1.0.0' }
})
@Module({
  name: 'app',
  imports: [
    // Enable API key authentication
    ApiKeyModule.forRoot({
      // Read keys from environment variables: API_KEY_1, API_KEY_2, etc.
      keysEnvPrefix: 'API_KEY',
      
      // Header name (default: 'x-api-key')
      headerName: 'x-api-key',
      
      // Metadata field name in MCP requests (default: 'apiKey')
      metadataField: 'apiKey',
      
      // Set to true to store keys as SHA-256 hashes (recommended for production)
      hashed: false,
    }),
    // Other modules...
  ]
})
export class AppModule {}
```

### Environment Variables

```bash
# .env
API_KEY_1=sk_live_abc123xyz
API_KEY_2=sk_test_demo456
API_KEY_3=sk_prod_789secure
```

The module automatically loads all `API_KEY_*` variables.

### Create API Key Guard

```typescript
import { Guard, ExecutionContext, ApiKeyModule } from '@nitrostack/core';

export class ApiKeyGuard implements Guard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Extract API key from metadata (sent by Studio or client)
    const apiKey = context.metadata?.apiKey || context.metadata?.['x-api-key'];
    
    if (!apiKey) {
      throw new Error('API key required');
    }
    
    // Validate using ApiKeyModule
    const isValid = await ApiKeyModule.validate(apiKey as string);
    
    if (!isValid) {
      throw new Error('Invalid API key');
    }
    
    // Populate context.auth
    context.auth = {
      subject: `apikey_${(apiKey as string).substring(0, 12)}`,
      scopes: ['*'], // API keys typically have full access
    };
    
    return true;
  }
}
```

### Using API Key Guard

```typescript
import { Injectable, ToolDecorator as Tool, UseGuards } from '@nitrostack/core';
import { ApiKeyGuard } from './guards/apikey.guard.js';

@Injectable()
export class ProtectedTools {
  
  // PUBLIC: No authentication required
  @Tool({
    name: 'get_public_info',
    description: 'Get public information (no auth required)',
  })
  async getPublicInfo(args: any) {
    return { data: 'public' };
  }
  
  // PROTECTED: Requires API key
  @Tool({
    name: 'get_protected_data',
    description: 'Get protected data (requires API key)',
  })
  @UseGuards(ApiKeyGuard)  // 🔒 Protected!
  async getProtectedData(args: any, context?: ExecutionContext) {
    const subject = context?.auth?.subject;
    return { data: 'protected', accessedBy: subject };
  }
}
```

### Generate API Keys

```typescript
import { ApiKeyModule } from '@nitrostack/core';

// Generate a cryptographically secure API key
const apiKey = ApiKeyModule.generateKey('sk'); // sk_...

// Hash a key for secure storage
const hashed = ApiKeyModule.hashKey(apiKey);

// Store hashed key in environment
// API_KEY_1=<hashed_value>
```

### Production Best Practices

```typescript
// Use hashed keys in production
ApiKeyModule.forRoot({
  keysEnvPrefix: 'API_KEY',
  hashed: true,  // Keys stored as SHA-256 hashes
})

// Custom validation
ApiKeyModule.forRoot({
  keysEnvPrefix: 'API_KEY',
  customValidation: async (key) => {
    // Check against database, rate limits, expiration, etc.
    const keyRecord = await db.apiKeys.findOne({ key });
    return keyRecord && !keyRecord.expired;
  },
})
```

## Multi-Auth Patterns

### Option 1: Either JWT OR API Key

```typescript
export class MultiAuthGuard implements Guard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Try JWT first
    const jwt = context.metadata?._jwt || context.metadata?.authorization;
    if (jwt) {
      // Validate JWT...
      return true;
    }
    
    // Try API key
    const apiKey = context.metadata?.apiKey;
    if (apiKey) {
      return await ApiKeyModule.validate(apiKey);
    }
    
    throw new Error('Either JWT or API key required');
  }
}

// Use on tool
@Tool({ name: 'flexible_tool' })
@UseGuards(MultiAuthGuard)  // Accepts JWT OR API key
async flexibleTool() {
  // Accessible with either auth method
}
```

### Option 2: Both JWT AND API Key Required

```typescript
@Tool({ name: 'critical_operation' })
@UseGuards(JWTGuard, ApiKeyGuard)  // Both required!
async criticalOperation() {
  // Requires BOTH JWT token AND API key
}
```

### API Key Service (Advanced)

```typescript
@Injectable()
export class ApiKeyService {
  constructor(private db: DatabaseService) {}
  
  async validate(key: string): Promise<any | null> {
    const result = await this.db.queryOne(
      'SELECT * FROM api_keys WHERE key_hash = ?',
      [this.hashKey(key)]
    );
    
    return result;
  }
  
  async create(userId: string, name: string, scopes: string[]): Promise<string> {
    const key = this.generateKey();
    const keyHash = this.hashKey(key);
    
    await this.db.execute(
      'INSERT INTO api_keys (user_id, name, key_hash, scopes) VALUES (?, ?, ?, ?)',
      [userId, name, keyHash, JSON.stringify(scopes)]
    );
    
    return key;  // Return once, never shown again
  }
  
  private generateKey(): string {
    // Generate secure random key
    return `sk_${randomBytes(32).toString('hex')}`;
  }
  
  private hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }
}
```

## OAuth 2.1

### Setup OAuth Module

NitroStack supports OAuth 2.1 for integration with platforms like OpenAI Apps SDK.

```typescript
import { OAuthModule } from 'nitrostack/auth';

@Module({
  imports: [
    OAuthModule.forRoot({
      clientId: process.env.OAUTH_CLIENT_ID!,
      clientSecret: process.env.OAUTH_CLIENT_SECRET!,
      redirectUri: process.env.OAUTH_REDIRECT_URI!,
      authorizationEndpoint: 'https://auth.example.com/oauth/authorize',
      tokenEndpoint: 'https://auth.example.com/oauth/token'
    })
  ]
})
export class AppModule {}
```

### OAuth Guard

```typescript
@Injectable()
export class OAuthGuard implements Guard {
  constructor(private oauthService: OAuthService) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const accessToken = this.extractToken(context);
    
    if (!accessToken) {
      return false;
    }
    
    try {
      // Verify token with OAuth provider
      const userInfo = await this.oauthService.verifyToken(accessToken);
      
      context.auth = {
        subject: userInfo.sub,
        email: userInfo.email,
        provider: 'oauth',
        token: accessToken
      };
      
      return true;
    } catch (error) {
      context.logger.error('OAuth verification failed:', error);
      return false;
    }
  }
  
  private extractToken(context: ExecutionContext): string | null {
    if (context.metadata?.authorization) {
      const auth = context.metadata.authorization;
      if (auth.startsWith('Bearer ')) {
        return auth.substring(7);
      }
    }
    return null;
  }
}
```

### OpenAI Apps SDK Integration

```typescript
// For OpenAI Apps SDK compliance
@Tool({ name: 'openai_tool' })
@UseGuards(OAuthGuard)  // OAuth 2.1 required
async openaiTool(input: any, ctx: ExecutionContext) {
  const userId = ctx.auth?.subject;
  // Your logic here
}
```

## Role-Based Access Control

### Admin Guard

```typescript
@Injectable()
export class AdminGuard implements Guard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Assumes JWTGuard has already run
    const role = context.auth?.role;
    
    if (role !== 'admin') {
      context.logger.warn(`Access denied: User role is ${role}, requires admin`);
      return false;
    }
    
    return true;
  }
}
```

### Usage

```typescript
@Tool({ name: 'delete_all_users' })
@UseGuards(JWTGuard, AdminGuard)  // ← JWT + Admin role
async deleteAllUsers(input: any, ctx: ExecutionContext) {
  // Only admins can call this
}
```

### Custom Role Guard

```typescript
export function RoleGuard(...roles: string[]) {
  class DynamicRoleGuard implements Guard {
    async canActivate(context: ExecutionContext): Promise<boolean> {
      const userRole = context.auth?.role;
      return roles.includes(userRole);
    }
  }
  return DynamicRoleGuard;
}

// Usage
@Tool({ name: 'moderator_action' })
@UseGuards(JWTGuard, RoleGuard('admin', 'moderator'))
async moderatorAction(input: any, ctx: ExecutionContext) {
  // Admins OR moderators can call this
}
```

## Scope-Based Access

### Scope Guard

```typescript
@Injectable()
export class ScopeGuard implements Guard {
  constructor(private requiredScopes: string[]) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const userScopes = context.auth?.scopes || [];
    
    const hasAllScopes = this.requiredScopes.every(
      scope => userScopes.includes(scope)
    );
    
    if (!hasAllScopes) {
      context.logger.warn(
        `Missing scopes. Required: ${this.requiredScopes}, Has: ${userScopes}`
      );
      return false;
    }
    
    return true;
  }
}

// Usage
@Tool({ name: 'write_data' })
@UseGuards(ApiKeyGuard, ScopeGuard(['read', 'write']))
async writeData(input: any, ctx: ExecutionContext) {
  // Requires API key with read AND write scopes
}
```

## Best Practices

### 1. Chain Guards Properly

```typescript
// Good - JWT first, then role check
@UseGuards(JWTGuard, AdminGuard)

// Avoid - Role check without auth
@UseGuards(AdminGuard)  // Will fail, no auth info
```

### 2. Store Secrets Securely

```typescript
// Good - Use ConfigService
constructor(private config: ConfigService) {}
const secret = this.config.get('JWT_SECRET');

// Avoid - Hardcoded secrets
const secret = 'my-secret-key';
```

### 3. Log Auth Events

```typescript
// Good
context.logger.info(`User ${userId} authenticated`);
context.logger.warn('Authentication failed');

// Avoid - Silent failures
if (!token) return false;
```

### 4. Set Appropriate Token Expiry

```typescript
// Good - Reasonable expiry
expiresIn: '7d'  // 1 week for user tokens
expiresIn: '1h'  // 1 hour for sensitive operations

// Avoid - Too long
expiresIn: '365d'  // 1 year is too long
```

### 5. Hash Sensitive Data

```typescript
// Good - Hash passwords and API keys
const hash = await bcrypt.hash(password, 10);

// Avoid - Storing plain text
await db.execute('INSERT INTO users VALUES (?, ?)', [email, password]);
```

## Security Checklist

- Use HTTPS in production
- Store secrets in environment variables
- Hash passwords with bcrypt (cost factor ≥ 10)
- Use secure random for tokens/keys
- Set appropriate token expiry
- Implement rate limiting on auth endpoints
- Log authentication events
- Validate input on all auth endpoints
- Use prepared statements (prevent SQL injection)
- Implement account lockout after failed attempts

## Next Steps

- [Tools Guide](./04-tools-guide.md)
- [Middleware Guide](./07-middleware-guide.md)
- [Testing Guide](./14-testing-guide.md)

---

**Tip**: Use multiple authentication methods (JWT, API Keys, OAuth) to support different use cases - JWT for users, API keys for services, OAuth for third-party integrations!
