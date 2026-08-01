---
name: nitrostack-auth-security
description: Best practices for implementing JWT, API Keys, OAuth 2.1, and RBAC in a NitroStack application.
---

## When to Use
Use this skill when configuring security modules, implementing user authentication, restricting tool access via guards, or handling sensitive tokens.

---

## 1. JSON Web Tokens (JWT)
To secure tools with JWT authentication:

### Register `JWTModule`:
```typescript
import { JWTModule, Module, McpApp } from '@nitrostack/core';

@McpApp({
  server: { name: 'my-server', version: '1.0.0' }
})
@Module({
  imports: [
    JWTModule.forRoot({
      secret: process.env.JWT_SECRET!,
      expiresIn: '7d',
    }),
  ]
})
export class AppModule {}
```

### Write a `JWTGuard`:
```typescript
import { Guard, ExecutionContext, Injectable, ConfigService } from '@nitrostack/core';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JWTGuard implements Guard {
  constructor(private config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const token = this.extractToken(context);
    if (!token) return false;

    try {
      const secret = this.config.get('JWT_SECRET');
      const payload = jwt.verify(token, secret) as any;
      context.auth = {
        subject: payload.sub,
        role: payload.role,
        token,
      };
      return true;
    } catch {
      return false;
    }
  }

  private extractToken(context: ExecutionContext): string | null {
    const auth = context.metadata?.authorization;
    if (auth?.startsWith('Bearer ')) {
      return auth.substring(7);
    }
    return null;
  }
}
```

---

## 2. API Key Authentication
Use `ApiKeyModule` for service-to-service validation.

### Register `ApiKeyModule`:
```typescript
import { ApiKeyModule, Module } from '@nitrostack/core';

@Module({
  imports: [
    ApiKeyModule.forRoot({
      keysEnvPrefix: 'API_KEY', // Reads API_KEY_1, API_KEY_2, etc.
      headerName: 'x-api-key',
      hashed: false,
    }),
  ]
})
export class AppModule {}
```

### API Key Guard:
```typescript
import { Guard, ExecutionContext, ApiKeyModule } from '@nitrostack/core';

export class ApiKeyGuard implements Guard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const apiKey = context.metadata?.['x-api-key'] || context.metadata?.apiKey;
    if (!apiKey) return false;

    const isValid = await ApiKeyModule.validate(apiKey as string);
    if (isValid) {
      context.auth = {
        subject: `apikey_${(apiKey as string).substring(0, 10)}`,
        scopes: ['*'],
      };
      return true;
    }
    return false;
  }
}
```

---

## 3. Role-Based Access Control (RBAC)
Chain guards sequentially to implement user-role authorization.

```typescript
import { Injectable, Guard, ExecutionContext, UseGuards, Tool, z } from '@nitrostack/core';
import { JWTGuard } from './jwt.guard.js';

@Injectable()
export class AdminGuard implements Guard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Requires JWTGuard to have populated context.auth first
    return context.auth?.role === 'admin';
  }
}

// Applying chained guards to a tool
export class SystemTools {
  @Tool({
    name: 'reset_database',
    description: 'Dangerous action: wipes database. Admin only.',
    inputSchema: z.object({}),
  })
  @UseGuards(JWTGuard, AdminGuard) // Chain auth first, then role check
  async resetDatabase() {
    return { success: true };
  }
}
```
