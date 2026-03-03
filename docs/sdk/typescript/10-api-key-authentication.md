# API Key Authentication

API Key authentication is the **simplest authentication method** in NitroStack. Perfect for service-to-service communication, internal tools, and rapid prototyping.

## When to Use API Keys

**Perfect For:**
- Internal tools and services
- Server-to-server communication
- Development and testing
- Simple authentication requirements
- Quick prototypes

**Not Ideal For:**
- User-facing applications (use OAuth/JWT instead)
- Fine-grained permissions (use scopes with OAuth)
- Temporary access (use short-lived JWTs)

---

## Quick Start

### 1. Install Template

```bash
npx @nitrostack/cli init my-api-key-server
# Select: typescript-starter
cd my-api-key-server
npm install
```

### 2. Configure Environment

Edit `.env`:
```bash
# Test API Keys (replace in production!)
API_KEY_1=sk_test_abc123xyz
API_KEY_2=sk_test_def456uvw
```

### 3. Start Server

```bash
npm run dev
```

### 4. Test in Studio

1. Open Studio at `http://localhost:3000`
2. Go to **Auth** → **API Keys** tab
3. Enter an API key: `sk_test_abc123xyz`
4. Click **"Set Key"**
5. Go to **Tools** tab
6. Execute a protected tool - it works!

---

## 📦 Built-in API Key Module

NitroStack provides **`ApiKeyModule`** - a complete, production-ready API key authentication system.

### Features

**Multiple Keys** - Support many API keys
**Environment Loading** - Auto-load from `API_KEY_*` env vars
**Hashing** - Optional SHA-256 hashing for storage
**Custom Validation** - Add your own validation logic
**Key Generation** - Built-in secure key generator
**Zero Dependencies** - Uses Node.js crypto

---

## Configuration

### Basic Setup

```typescript
// src/app.module.ts
import { Module, ApiKeyModule } from '@nitrostack/core';

@Module({
  name: 'app',
  imports: [
    // Load API keys from environment variables
    ApiKeyModule.forRoot({
      keysEnvPrefix: 'API_KEY',  // Loads API_KEY_1, API_KEY_2, etc.
    }),
  ],
})
export class AppModule {}
```

### Advanced Configuration

```typescript
ApiKeyModule.forRoot({
  // Load keys from environment variables matching this prefix
  keysEnvPrefix: 'API_KEY',
  
  // Or provide keys directly (not recommended for production)
  keys: ['sk_test_abc123', 'sk_prod_xyz789'],
  
  // Store keys as hashed values (recommended for production)
  hashed: true,
  
  // Custom header name (default: 'x-api-key')
  headerName: 'x-api-key',
  
  // Metadata field name (default: 'apiKey')
  metadataField: 'apiKey',
  
  // Custom validation logic
  customValidation: async (key) => {
    // Check against database, rate limits, etc.
    const isValid = await db.apiKeys.findOne({ key });
    return !!isValid;
  },
})
```

---

## 🛡️ Protecting Tools

### Basic Protection

```typescript
import { Tool, UseGuards, ApiKeyGuard } from '@nitrostack/core';

export class DemoTools {
  // Public tool - no authentication required
  @Tool({
    name: 'get_public_info',
    description: 'Get public information',
  })
  async getPublicInfo() {
    return { message: 'This is public!' };
  }

  // Protected tool - requires valid API key
  @Tool({
    name: 'get_protected_data',
    description: 'Get protected data',
  })
  @UseGuards(ApiKeyGuard)
  async getProtectedData() {
    return { message: 'This is protected!', secret: 'abc123' };
  }
}
```

### Access User Context

```typescript
@Tool({ name: 'check_api_key_status' })
@UseGuards(ApiKeyGuard)
async checkStatus(
  @ExecutionContext() context: ExecutionContext
) {
  // API key info is populated by ApiKeyGuard
  return {
    authenticated: true,
    subject: context.auth.subject,    // 'apikey_sk_test_abc...'
    scopes: context.auth.scopes,      // ['*'] (full access)
    keyPreview: context.auth.subject.substring(0, 20),
  };
}
```

---

## Security Best Practices

### 1. Generate Secure Keys

```typescript
import { ApiKeyModule } from '@nitrostack/core';

// Generate a new API key
const newKey = ApiKeyModule.generateKey('sk');  
// → sk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

**Key Format:** `{prefix}_{base64url_random_32_bytes}`

### 2. Use Environment Variables

**Never commit API keys to Git!**

```bash
# .env
API_KEY_1=sk_prod_abc123xyz
API_KEY_2=sk_prod_def456uvw

# .env.example (commit this)
API_KEY_1=sk_test_replace_me
API_KEY_2=sk_test_replace_me_too
```

### 3. Hash Keys in Database

```typescript
import { ApiKeyModule } from '@nitrostack/core';

// Hash a key before storing
const hashedKey = ApiKeyModule.hashKey('sk_prod_abc123xyz');
// → '5f4dcc3b5aa765d61d8327deb882cf99...'

// Store hashed value in database
await db.apiKeys.create({
  keyHash: hashedKey,
  userId: 'user123',
  createdAt: new Date(),
});

// Configure module to use hashed keys
ApiKeyModule.forRoot({
  hashed: true,
  customValidation: async (key) => {
    const hashedKey = ApiKeyModule.hashKey(key);
    const exists = await db.apiKeys.findOne({ keyHash: hashedKey });
    return !!exists;
  },
});
```

### 4. Rotate Keys Regularly

```typescript
// Implement key rotation
class ApiKeyService {
  async rotateKey(oldKey: string): Promise<string> {
    // Generate new key
    const newKey = ApiKeyModule.generateKey('sk');
    
    // Store new key
    await db.apiKeys.create({ key: newKey });
    
    // Revoke old key
    await db.apiKeys.delete({ key: oldKey });
    
    return newKey;
  }
}
```

### 5. Add Rate Limiting

```typescript
import { RateLimit } from '@nitrostack/core';

@Tool({ name: 'expensive_operation' })
@UseGuards(ApiKeyGuard)
@RateLimit({ windowMs: 60000, maxRequests: 10 })  // 10 req/min
async expensiveOperation() {
  // Rate limited per API key
}
```

---

## 🔄 Multi-Auth Patterns

Combine API keys with JWT tokens for flexible authentication.

### Either/Or Authentication

Tool accepts **either** a valid JWT **or** a valid API key:

```typescript
import { MultiAuthGuard } from '@nitrostack/core';

@Tool({ name: 'flexible_access' })
@UseGuards(MultiAuthGuard)  // Accepts JWT OR API Key
async flexibleAccess() {
  return { message: 'Authenticated with either method!' };
}
```

### Both Required

Tool requires **both** JWT **and** API key (extra security):

```typescript
import { DualAuthGuard } from '@nitrostack/core';

@Tool({ name: 'critical_operation' })
@UseGuards(DualAuthGuard)  // Requires BOTH JWT AND API Key
async criticalOperation() {
  return { message: 'Double authenticated!' };
}
```

---

## 📡 How Keys Are Sent

### From Studio

Studio automatically includes the API key in **two places**:

1. **Header**: `X-API-Key: sk_test_abc123xyz`
2. **Metadata**: `_meta.apiKey: sk_test_abc123xyz`

### From Claude/Clients

**Method 1: Header** (Recommended)
```typescript
// Client sends
headers: {
  'X-API-Key': 'sk_test_abc123xyz'
}
```

**Method 2: Metadata Field**
```json
{
  "method": "tools/call",
  "params": {
    "name": "protected_tool",
    "arguments": {
      "_meta": {
        "apiKey": "sk_test_abc123xyz"
      }
    }
  }
}
```

### Custom Header Name

```typescript
ApiKeyModule.forRoot({
  headerName: 'Authorization',  // Use Bearer token format
})

// Client sends:
headers: {
  'Authorization': 'Bearer sk_test_abc123xyz'
}
```

---

## 🧪 Testing

### In Studio

1. **Set API Key:**
   - Go to Auth → API Keys tab
   - Enter key: `sk_test_abc123xyz`
   - Click "Set Key"

2. **Test Tools:**
   - Go to Tools tab
   - Execute protected tool
   - Key is automatically included!

### Programmatic Testing

```typescript
// test/api-key.test.ts
import { createTestClient } from 'nitrostack/testing';

describe('API Key Authentication', () => {
  it('should protect tools with API key', async () => {
    const client = await createTestClient(AppModule);
    
    // Without API key - should fail
    await expect(
      client.callTool('protected_tool', {})
    ).rejects.toThrow('API key required');
    
    // With API key - should succeed
    const result = await client.callTool('protected_tool', {
      _meta: { apiKey: 'sk_test_abc123xyz' }
    });
    
    expect(result.success).toBe(true);
  });
});
```

---

## Production Deployment

### 1. Generate Production Keys

```bash
# Generate secure production keys
node -e "console.log(require('@nitrostack/core').ApiKeyModule.generateKey('sk'))"
```

### 2. Set Environment Variables

```bash
# In production environment (Heroku, AWS, etc.)
export API_KEY_PROD_1=sk_prod_...
export API_KEY_PROD_2=sk_prod_...
```

### 3. Use Secrets Manager

```typescript
// Load keys from AWS Secrets Manager, etc.
import { SecretsManager } from 'aws-sdk';

const secrets = new SecretsManager();
const apiKeys = await secrets.getSecretValue({
  SecretId: 'mcp-api-keys'
}).promise();

ApiKeyModule.forRoot({
  keys: JSON.parse(apiKeys.SecretString),
});
```

---

## Common Patterns

### Per-User API Keys

```typescript
// Each user has their own API key
ApiKeyModule.forRoot({
  customValidation: async (key) => {
    const user = await db.users.findOne({ apiKey: key });
    if (!user) return false;
    
    // Store user info in context
    context.user = user;
    return true;
  },
});
```

### Scoped API Keys

```typescript
// Different keys for different permissions
ApiKeyModule.forRoot({
  customValidation: async (key) => {
    const keyData = await db.apiKeys.findOne({ key });
    if (!keyData) return false;
    
    // Attach scopes to context
    context.auth.scopes = keyData.scopes;  // ['read', 'write']
    return true;
  },
});

// Check scopes in tools
@Tool({ name: 'write_data' })
@UseGuards(ApiKeyGuard)
async writeData(@ExecutionContext() context: ExecutionContext) {
  if (!context.auth.scopes.includes('write')) {
    throw new Error('Insufficient permissions');
  }
  // ... write data
}
```

---

## 📚 Learn More

- [Starter Template](../../templates/01-starter-template.md)
- [Multi-Auth Patterns](./09-authentication-overview.md#multi-auth-patterns)
- [Guards Reference](../../api-reference/guards.md)
- [ExecutionContext Reference](../../api-reference/execution-context.md)

---

**Next:** Learn about [OAuth 2.1 Authentication →](./11-oauth-authentication.md)

