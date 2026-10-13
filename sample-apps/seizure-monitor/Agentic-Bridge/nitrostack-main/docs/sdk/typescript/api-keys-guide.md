# API Keys Guide (Legacy Alias)

## Canonical Documentation

This page is a legacy alias kept for backward compatibility. The canonical guide is:

- [API Key Authentication](./10-api-key-authentication.md)

See also:

- [Authentication Overview](./09-authentication-overview.md)
- [Rate Limiting Guide](./rate-limiting-guide.md)

## Legacy Content

The remaining content below is retained temporarily for older bookmarks and links.

## Why API Keys?

API Keys are perfect for:
- **Service-to-service auth** - Backend systems communicating
- **Programmatic access** - Scripts and automation
- **Third-party integrations** - External services accessing your API
- **Mobile/desktop apps** - Client applications
- **Simpler than OAuth** - When you don't need user delegation

## Quick Start

### 1. Database Schema

```sql
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  scopes TEXT NOT NULL,
  active BOOLEAN DEFAULT 1,
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  last_used_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
```

### 2. Create API Keys Module

```typescript
// src/modules/api-keys/api-keys.module.ts
import { Module } from '@nitrostack/core';
import { ApiKeysTools } from './api-keys.tools.js';
import { ApiKeyService } from './api-key.service.js';
import { ApiKeyGuard } from './api-key.guard.js';

@Module({
  name: 'api-keys',
  description: 'API Key authentication',
  controllers: [ApiKeysTools],
  providers: [ApiKeyService, ApiKeyGuard],
  exports: [ApiKeyService, ApiKeyGuard]
})
export class ApiKeysModule {}
```

## API Key Service

### Complete Implementation

```typescript
// src/modules/api-keys/api-key.service.ts
import { Injectable } from '@nitrostack/core';
import { randomBytes, createHash } from 'crypto';

interface ApiKey {
  id: string;
  userId: string;
  name: string;
  keyHash: string;
  scopes: string[];
  active: boolean;
  createdAt: number;
  expiresAt?: number;
  lastUsedAt?: number;
}

interface CreateApiKeyInput {
  userId: string;
  name: string;
  scopes: string[];
  expiresIn?: number; // days
}

@Injectable()
export class ApiKeyService {
  constructor(private db: DatabaseService) {}
  
  /**
   * Generate a new API key
   * Returns the key only once - never stored in plain text
   */
  async create(input: CreateApiKeyInput): Promise<{ id: string; key: string }> {
    // Generate secure random key
    const key = this.generateKey();
    const keyHash = this.hashKey(key);
    
    // Calculate expiration
    const expiresAt = input.expiresIn
      ? Date.now() + (input.expiresIn * 24 * 60 * 60 * 1000)
      : null;
    
    // Store in database
    const id = randomBytes(16).toString('hex');
    await this.db.execute(
      `INSERT INTO api_keys (id, user_id, name, key_hash, scopes, active, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.userId,
        input.name,
        keyHash,
        JSON.stringify(input.scopes),
        1,
        Date.now(),
        expiresAt
      ]
    );
    
    // Return key (only time it's shown)
    return { id, key };
  }
  
  /**
   * Validate API key and return associated data
   */
  async validate(key: string): Promise<ApiKey | null> {
    const keyHash = this.hashKey(key);
    
    const result = await this.db.queryOne<any>(
      `SELECT * FROM api_keys WHERE key_hash = ? AND active = 1`,
      [keyHash]
    );
    
    if (!result) {
      return null;
    }
    
    // Check expiration
    if (result.expires_at && result.expires_at < Date.now()) {
      return null;
    }
    
    // Update last used timestamp
    await this.db.execute(
      `UPDATE api_keys SET last_used_at = ? WHERE id = ?`,
      [Date.now(), result.id]
    );
    
    return {
      id: result.id,
      userId: result.user_id,
      name: result.name,
      keyHash: result.key_hash,
      scopes: JSON.parse(result.scopes),
      active: result.active === 1,
      createdAt: result.created_at,
      expiresAt: result.expires_at,
      lastUsedAt: result.last_used_at
    };
  }
  
  /**
   * List API keys for a user (without revealing actual keys)
   */
  async listForUser(userId: string): Promise<Omit<ApiKey, 'keyHash'>[]> {
    const results = await this.db.query<any>(
      `SELECT id, user_id, name, scopes, active, created_at, expires_at, last_used_at
       FROM api_keys
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );
    
    return results.map(r => ({
      id: r.id,
      userId: r.user_id,
      name: r.name,
      scopes: JSON.parse(r.scopes),
      active: r.active === 1,
      createdAt: r.created_at,
      expiresAt: r.expires_at,
      lastUsedAt: r.last_used_at
    }));
  }
  
  /**
   * Revoke an API key
   */
  async revoke(id: string, userId: string): Promise<void> {
    await this.db.execute(
      `UPDATE api_keys SET active = 0 WHERE id = ? AND user_id = ?`,
      [id, userId]
    );
  }
  
  /**
   * Delete an API key permanently
   */
  async delete(id: string, userId: string): Promise<void> {
    await this.db.execute(
      `DELETE FROM api_keys WHERE id = ? AND user_id = ?`,
      [id, userId]
    );
  }
  
  /**
   * Update API key metadata
   */
  async update(
    id: string,
    userId: string,
    updates: { name?: string; scopes?: string[] }
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    
    if (updates.name) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    
    if (updates.scopes) {
      fields.push('scopes = ?');
      values.push(JSON.stringify(updates.scopes));
    }
    
    if (fields.length === 0) return;
    
    values.push(id, userId);
    
    await this.db.execute(
      `UPDATE api_keys SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );
  }
  
  /**
   * Generate secure random API key
   */
  private generateKey(): string {
    // Format: sk_live_abcdef123456... (similar to Stripe)
    const prefix = process.env.NODE_ENV === 'production' ? 'sk_live' : 'sk_test';
    const randomPart = randomBytes(32).toString('hex');
    return `${prefix}_${randomPart}`;
  }
  
  /**
   * Hash API key for secure storage
   */
  private hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }
}
```

## API Keys Tools

### Management Tools

```typescript
// src/modules/api-keys/api-keys.tools.ts
import { Tool, Widget, UseGuards, ExecutionContext } from '@nitrostack/core';
import { z } from 'zod';
import { JWTGuard } from '../auth/jwt.guard.js';

export class ApiKeysTools {
  constructor(private apiKeyService: ApiKeyService) {}
  
  @Tool({
    name: 'create_api_key',
    description: 'Create a new API key for programmatic access',
    inputSchema: z.object({
      name: z.string().describe('Descriptive name for the API key'),
      scopes: z.array(z.string()).describe('Permissions granted to this key'),
      expiresInDays: z.number().optional().describe('Days until expiration (optional)')
    }),
    examples: {
      request: {
        name: 'My Integration',
        scopes: ['read', 'write'],
        expiresInDays: 90
      },
      response: {
        id: 'key-abc123',
        key: 'sk_live_def456...',
        name: 'My Integration',
        scopes: ['read', 'write'],
        expiresAt: 1735689600000,
        warning: 'Save this key now - it will not be shown again'
      }
    }
  })
  @UseGuards(JWTGuard)  // User must be authenticated to create keys
  @Widget('api-key-created')
  async createApiKey(input: any, ctx: ExecutionContext) {
    const userId = ctx.auth?.subject;
    
    const { id, key } = await this.apiKeyService.create({
      userId,
      name: input.name,
      scopes: input.scopes,
      expiresIn: input.expiresInDays
    });
    
    ctx.logger.info('API key created', { keyId: id, userId });
    
    return {
      id,
      key, // Only returned once!
      name: input.name,
      scopes: input.scopes,
      expiresAt: input.expiresInDays
        ? Date.now() + (input.expiresInDays * 24 * 60 * 60 * 1000)
        : null,
      warning: 'Save this key now - it will not be shown again'
    };
  }
  
  @Tool({
    name: 'list_api_keys',
    description: 'List all API keys for the authenticated user',
    inputSchema: z.object({}),
    examples: {
      response: {
        keys: [
          {
            id: 'key-abc123',
            name: 'My Integration',
            scopes: ['read', 'write'],
            active: true,
            createdAt: 1704067200000,
            expiresAt: 1735689600000,
            lastUsedAt: 1704153600000
          }
        ]
      }
    }
  })
  @UseGuards(JWTGuard)
  @Widget('api-keys-list')
  async listApiKeys(input: any, ctx: ExecutionContext) {
    const userId = ctx.auth?.subject;
    const keys = await this.apiKeyService.listForUser(userId);
    
    return { keys };
  }
  
  @Tool({
    name: 'revoke_api_key',
    description: 'Revoke an API key (can be reactivated)',
    inputSchema: z.object({
      keyId: z.string().describe('ID of the API key to revoke')
    })
  })
  @UseGuards(JWTGuard)
  async revokeApiKey(input: any, ctx: ExecutionContext) {
    const userId = ctx.auth?.subject;
    
    await this.apiKeyService.revoke(input.keyId, userId);
    
    ctx.logger.info('API key revoked', { keyId: input.keyId, userId });
    
    return {
      success: true,
      message: 'API key revoked successfully'
    };
  }
  
  @Tool({
    name: 'delete_api_key',
    description: 'Permanently delete an API key',
    inputSchema: z.object({
      keyId: z.string().describe('ID of the API key to delete')
    })
  })
  @UseGuards(JWTGuard)
  async deleteApiKey(input: any, ctx: ExecutionContext) {
    const userId = ctx.auth?.subject;
    
    await this.apiKeyService.delete(input.keyId, userId);
    
    ctx.logger.info('API key deleted', { keyId: input.keyId, userId });
    
    return {
      success: true,
      message: 'API key deleted permanently'
    };
  }
}
```

## API Key Guard

### Protect Tools with API Keys

```typescript
// src/modules/api-keys/api-key.guard.ts
import { Guard, ExecutionContext, Injectable } from '@nitrostack/core';

@Injectable()
export class ApiKeyGuard implements Guard {
  constructor(private apiKeyService: ApiKeyService) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const apiKey = this.extractApiKey(context);
    
    if (!apiKey) {
      context.logger.warn('No API key provided');
      return false;
    }
    
    // Validate API key
    const keyData = await this.apiKeyService.validate(apiKey);
    
    if (!keyData) {
      context.logger.warn('Invalid or expired API key');
      return false;
    }
    
    // Attach key info to context
    context.auth = {
      subject: keyData.userId,
      keyId: keyData.id,
      keyName: keyData.name,
      scopes: keyData.scopes,
      token: apiKey
    };
    
    context.logger.info('API key authentication successful', {
      keyId: keyData.id,
      userId: keyData.userId
    });
    
    return true;
  }
  
  private extractApiKey(context: ExecutionContext): string | null {
    // Check X-API-Key header (recommended)
    if (context.metadata?.['x-api-key']) {
      return context.metadata['x-api-key'];
    }
    
    // Check Authorization header with Bearer
    const authHeader = context.metadata?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    // Check api_key in metadata
    if (context.metadata?.api_key) {
      return context.metadata.api_key;
    }
    
    return null;
  }
}
```

### Using API Key Guard

```typescript
import { Tool, UseGuards } from '@nitrostack/core';
import { ApiKeyGuard } from '../api-keys/api-key.guard.js';

export class DataTools {
  @Tool({ name: 'get_data' })
  @UseGuards(ApiKeyGuard)  // ← Requires API key
  async getData(input: any, ctx: ExecutionContext) {
    const userId = ctx.auth?.subject;
    const scopes = ctx.auth?.scopes;
    
    // Check scopes
    if (!scopes?.includes('read')) {
      throw new Error('Insufficient permissions');
    }
    
    return await this.dataService.getForUser(userId);
  }
}
```

## Scope-Based Authorization

### Define Scopes

```typescript
export const API_SCOPES = {
  // Read permissions
  'read': 'Read data',
  'read:products': 'Read products',
  'read:orders': 'Read orders',
  
  // Write permissions
  'write': 'Write data',
  'write:products': 'Create/update products',
  'write:orders': 'Create/update orders',
  
  // Admin permissions
  'admin': 'Full administrative access',
  'admin:users': 'Manage users'
} as const;

export type ApiScope = keyof typeof API_SCOPES;
```

### Scope Guard

```typescript
export function RequireScopes(...requiredScopes: string[]) {
  @Injectable()
  class ScopeGuard implements Guard {
    async canActivate(context: ExecutionContext): Promise<boolean> {
      const userScopes = context.auth?.scopes || [];
      
      // Check if user has all required scopes
      const hasAllScopes = requiredScopes.every(scope =>
        userScopes.includes(scope)
      );
      
      if (!hasAllScopes) {
        context.logger.warn('Insufficient scopes', {
          required: requiredScopes,
          has: userScopes
        });
        return false;
      }
      
      return true;
    }
  }
  
  return ScopeGuard;
}

// Usage
@Tool({ name: 'delete_product' })
@UseGuards(ApiKeyGuard, RequireScopes('write:products', 'admin'))
async deleteProduct(input: any, ctx: ExecutionContext) {
  // Requires API key with both scopes
}
```

## Best Practices

### 1. Use Prefixes

```typescript
// Good - Environment-aware prefixes
const prefix = process.env.NODE_ENV === 'production' ? 'sk_live' : 'sk_test';
const key = `${prefix}_${randomBytes(32).toString('hex')}`;

// Avoid - No distinction
const key = randomBytes(32).toString('hex');
```

### 2. Hash Keys

```typescript
// Good - Store hashed
const keyHash = createHash('sha256').update(key).digest('hex');
await db.execute('INSERT INTO api_keys ... VALUES (?)', [keyHash]);

// Avoid - Store plain text
await db.execute('INSERT INTO api_keys ... VALUES (?)', [key]);
```

### 3. Set Expiration

```typescript
// Good - Keys expire
await apiKeyService.create({
  userId,
  name: 'Integration',
  scopes: ['read'],
  expiresIn: 90  // 90 days
});

// Avoid - Never expires
await apiKeyService.create({
  userId,
  name: 'Integration',
  scopes: ['read']
  // No expiration
});
```

### 4. Use Minimal Scopes

```typescript
// Good - Minimal permissions
scopes: ['read:products']

// Avoid - Too broad
scopes: ['admin']
```

### 5. Rate Limit API Keys

```typescript
@Tool({ name: 'api_endpoint' })
@UseGuards(ApiKeyGuard)
@RateLimit({
  requests: 1000,
  window: '1h',
  key: (ctx) => ctx.auth?.keyId || 'unknown'
})
async apiEndpoint(input: any) {
  // Rate limited per API key
}
```

## Security Checklist

- Store only hashed keys in database
- Return key only once on creation
- Use HTTPS in production
- Set expiration dates
- Implement scope-based permissions
- Rate limit per API key
- Log all key usage
- Provide revocation mechanism
- Monitor for suspicious activity
- Rotate keys periodically

## Usage Examples

### Creating a Key

```bash
curl -X POST https://api.example.com/tools/create_api_key \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Integration",
    "scopes": ["read", "write"],
    "expiresInDays": 90
  }'

# Response:
{
  "key": "sk_live_abc123def456...",
  "warning": "Save this key now - it will not be shown again"
}
```

### Using a Key

```bash
curl https://api.example.com/tools/get_data \
  -H "X-API-Key: sk_live_abc123def456..."

# Or with Bearer token:
curl https://api.example.com/tools/get_data \
  -H "Authorization: Bearer sk_live_abc123def456..."
```

## Troubleshooting

### Key Not Working

1. Check if key is active
2. Verify expiration date
3. Ensure correct scopes
4. Check rate limits

### Permission Denied

1. Verify scopes match required permissions
2. Check if key is revoked
3. Ensure guard order is correct

## Next Steps

- [OAuth 2.1 Authentication](./11-oauth-authentication.md)
- [Authentication Overview](./09-authentication-overview.md)
- [Rate Limiting Guide](./rate-limiting-guide.md)

---

**Tip**: Use separate API keys for each integration and set appropriate scopes for the principle of least privilege!

