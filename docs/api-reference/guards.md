# Guards API Reference

## Overview

Guards control access to tools, resources, and prompts by determining whether a request should proceed. They implement authorization logic, verify authentication tokens, check permissions, and enforce access policies.

Guards execute before the handler and can deny access by returning `false` or throwing an exception.

## Table of Contents

- [Guard Interface](#guard-interface)
- [Creating Guards](#creating-guards)
- [Using Guards](#using-guards)
- [Common Patterns](#common-patterns)
- [Dependency Injection](#dependency-injection)
- [Best Practices](#best-practices)

## Guard Interface

```typescript
interface Guard {
  canActivate(context: ExecutionContext): Promise<boolean> | boolean;
}
```

**Parameters:**
- `context`: The execution context containing auth data, logger, and metadata

**Returns:**
- `true`: Allow the request to proceed
- `false`: Deny access (throws ForbiddenException)
- `throw Error`: Deny access with custom error

## Creating Guards

### Basic Guard

```typescript
import { Guard, ExecutionContext, Injectable } from '@nitrostack/core';

@Injectable({ deps: [] })
export class AuthGuard implements Guard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if user is authenticated
    if (!context.auth?.subject) {
      return false;  // Deny access
    }
    return true;  // Allow access
  }
}
```

### Role-Based Guard

```typescript
@Injectable({ deps: [] })
export class AdminGuard implements Guard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = context.auth?.roles as string[] | undefined;
    
    if (!roles || !roles.includes('admin')) {
      context.logger.warn('Admin access denied', {
        userId: context.auth?.subject,
        roles
      });
      return false;
    }
    
    return true;
  }
}
```

### Permission-Based Guard

```typescript
@Injectable({ deps: [] })
export class PermissionGuard implements Guard {
  constructor(private requiredPermission: string) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissions = context.auth?.permissions as string[] | undefined;
    return permissions?.includes(this.requiredPermission) ?? false;
  }
}

// Factory function for different permissions
export function RequirePermission(permission: string) {
  return class extends PermissionGuard {
    constructor() {
      super(permission);
    }
  };
}

// Usage
@UseGuards(RequirePermission('products:write'))
async createProduct(input: any, ctx: ExecutionContext) {
  // ...
}
```

### Clearance Level Guard

```typescript
type ClearanceLevel = 'public' | 'crew' | 'officer' | 'commander' | 'captain';

const CLEARANCE_HIERARCHY: Record<ClearanceLevel, number> = {
  public: 0,
  crew: 1,
  officer: 2,
  commander: 3,
  captain: 4
};

@Injectable({ deps: [] })
export class ClearanceGuard implements Guard {
  constructor(private requiredLevel: ClearanceLevel) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const userLevel = (context.auth?.clearance as ClearanceLevel) || 'public';
    const userRank = CLEARANCE_HIERARCHY[userLevel] ?? 0;
    const requiredRank = CLEARANCE_HIERARCHY[this.requiredLevel];

    if (userRank < requiredRank) {
      context.logger.warn('Clearance check failed', {
        userId: context.auth?.subject,
        userLevel,
        requiredLevel: this.requiredLevel
      });
      return false;
    }

    context.logger.info('Clearance check passed', {
      userLevel,
      requiredLevel: this.requiredLevel
    });
    return true;
  }
}

// Factory for specific clearance levels
export class OfficerClearanceGuard extends ClearanceGuard {
  constructor() { super('officer'); }
}

export class CommanderClearanceGuard extends ClearanceGuard {
  constructor() { super('commander'); }
}
```

## Using Guards

### On Individual Methods

```typescript
import { ToolDecorator as Tool, UseGuards } from '@nitrostack/core';
import { AuthGuard } from './guards/auth.guard.js';

export class UserTools {
  @Tool({ name: 'get_profile' })
  @UseGuards(AuthGuard)
  async getProfile(input: {}, ctx: ExecutionContext) {
    return this.userService.findById(ctx.auth!.subject);
  }
}
```

### Multiple Guards

Guards execute in order. All must pass for the request to proceed:

```typescript
@Tool({ name: 'delete_user' })
@UseGuards(AuthGuard, AdminGuard, RateLimitGuard)
async deleteUser(input: { userId: string }, ctx: ExecutionContext) {
  // Only authenticated admins within rate limit can access
  return this.userService.delete(input.userId);
}
```

### On Resources and Prompts

Guards work on all MCP primitives:

```typescript
@Resource({
  uri: 'admin://dashboard',
  name: 'Admin Dashboard'
})
@UseGuards(AdminGuard)
async getAdminDashboard(uri: string, ctx: ExecutionContext) {
  // Admin-only resource
}

@Prompt({
  name: 'confidential_analysis',
  title: 'Confidential Analysis',
  description: 'Analyze confidential data'
})
@UseGuards(OfficerClearanceGuard)
async getConfidentialPrompt(args: any, ctx: ExecutionContext) {
  // Officer-level prompt
}
```

## Common Patterns

### JWT Token Validation

```typescript
import jwt from 'jsonwebtoken';

@Injectable({ deps: [] })
export class JWTGuard implements Guard {
  private readonly secret = process.env.JWT_SECRET!;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const token = context.auth?.token;
    
    if (!token) {
      throw new Error('No authentication token provided');
    }

    try {
      const decoded = jwt.verify(token, this.secret) as jwt.JwtPayload;
      
      // Enrich context with decoded data
      if (context.auth) {
        context.auth.subject = decoded.sub;
        context.auth.roles = decoded.roles;
        context.auth.permissions = decoded.permissions;
      }
      
      return true;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }
}
```

### API Key Validation

```typescript
@Injectable({ deps: [] })
export class ApiKeyGuard implements Guard {
  private readonly validKeys = new Set(
    (process.env.API_KEYS || '').split(',').filter(Boolean)
  );

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const apiKey = context.auth?.token || context.metadata?.apiKey;
    
    if (!apiKey || !this.validKeys.has(apiKey as string)) {
      context.logger.warn('Invalid API key', {
        keyProvided: !!apiKey
      });
      return false;
    }
    
    return true;
  }
}
```

### Rate Limit Guard

```typescript
@Injectable({ deps: [] })
export class RateLimitGuard implements Guard {
  private requests = new Map<string, { count: number; resetAt: number }>();
  private readonly limit = 100;
  private readonly windowMs = 60000;  // 1 minute

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const key = context.auth?.subject || context.requestId || 'anonymous';
    const now = Date.now();
    
    let entry = this.requests.get(key);
    
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + this.windowMs };
    }
    
    entry.count++;
    this.requests.set(key, entry);
    
    if (entry.count > this.limit) {
      context.logger.warn('Rate limit exceeded', { key, count: entry.count });
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    
    return true;
  }
}
```

### Time-Based Access

```typescript
@Injectable({ deps: [] })
export class BusinessHoursGuard implements Guard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const now = new Date();
    const hour = now.getUTCHours();
    const day = now.getUTCDay();
    
    // Allow access Monday-Friday, 9am-5pm UTC
    const isWeekday = day >= 1 && day <= 5;
    const isBusinessHours = hour >= 9 && hour < 17;
    
    if (!isWeekday || !isBusinessHours) {
      context.logger.info('Access denied outside business hours');
      return false;
    }
    
    return true;
  }
}
```

### Conditional Guard

```typescript
@Injectable({ deps: [] })
export class MaintenanceModeGuard implements Guard {
  private readonly bypassRoles = ['admin', 'operator'];

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isMaintenanceMode = process.env.MAINTENANCE_MODE === 'true';
    
    if (!isMaintenanceMode) {
      return true;  // Not in maintenance mode
    }
    
    // Allow admins to bypass
    const roles = context.auth?.roles as string[] | undefined;
    const canBypass = roles?.some(role => this.bypassRoles.includes(role));
    
    if (!canBypass) {
      throw new Error('System is under maintenance. Please try again later.');
    }
    
    return true;
  }
}
```

## Dependency Injection

Guards can inject services:

```typescript
@Injectable({ deps: [UserService, ConfigService] })
export class SubscriptionGuard implements Guard {
  constructor(
    private userService: UserService,
    private configService: ConfigService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const userId = context.auth?.subject;
    if (!userId) return false;

    const user = await this.userService.findById(userId);
    if (!user) return false;

    const requiredPlan = this.configService.get('REQUIRED_PLAN', 'pro');
    
    if (user.subscriptionPlan !== requiredPlan && user.subscriptionPlan !== 'enterprise') {
      context.logger.info('Subscription check failed', {
        userId,
        userPlan: user.subscriptionPlan,
        requiredPlan
      });
      return false;
    }

    return true;
  }
}
```

## Best Practices

### 1. Fail Securely

Default to denying access:

```typescript
// Correct: Deny by default
async canActivate(context: ExecutionContext): Promise<boolean> {
  try {
    return await this.validateToken(context.auth?.token);
  } catch {
    return false;  // Deny on any error
  }
}

// Incorrect: Allow by default
async canActivate(context: ExecutionContext): Promise<boolean> {
  try {
    return await this.validateToken(context.auth?.token);
  } catch {
    return true;  // Security hole!
  }
}
```

### 2. Provide Meaningful Errors

```typescript
// Good: Descriptive error
async canActivate(context: ExecutionContext): Promise<boolean> {
  if (!context.auth?.token) {
    throw new Error('Authentication required. Please provide a valid token.');
  }
  if (!this.hasPermission(context)) {
    throw new Error('Insufficient permissions for this operation.');
  }
  return true;
}

// Avoid: Generic error
async canActivate(context: ExecutionContext): Promise<boolean> {
  return !!context.auth?.token && this.hasPermission(context);
}
```

### 3. Log Security Events

```typescript
async canActivate(context: ExecutionContext): Promise<boolean> {
  const userId = context.auth?.subject;
  
  if (!this.isAuthorized(context)) {
    context.logger.warn('Authorization failed', {
      userId,
      toolName: context.toolName,
      requestId: context.requestId,
      reason: 'insufficient_permissions'
    });
    return false;
  }
  
  context.logger.info('Authorization granted', { userId });
  return true;
}
```

### 4. Keep Guards Focused

```typescript
// Correct: Single responsibility
@UseGuards(
  AuthenticationGuard,  // Verify identity
  RoleGuard,           // Check roles
  RateLimitGuard       // Enforce limits
)

// Incorrect: Monolithic guard
@UseGuards(DoEverythingGuard)
```

### 5. Order Guards Appropriately

```typescript
// Recommended order
@UseGuards(
  MaintenanceModeGuard,  // 1. Check system availability
  AuthenticationGuard,   // 2. Verify identity
  AuthorizationGuard,    // 3. Check permissions
  RateLimitGuard        // 4. Enforce rate limits
)
```

### 6. Use Explicit Dependencies

For ESM compatibility, always declare dependencies:

```typescript
// Correct: Explicit deps
@Injectable({ deps: [UserService] })
export class OwnershipGuard implements Guard {
  constructor(private userService: UserService) {}
}

// Avoid: Implicit deps (may fail in ESM)
@Injectable()
export class OwnershipGuard implements Guard {
  constructor(private userService: UserService) {}
}
```

## Related Documentation

- [Tools Guide](../sdk/typescript/04-tools-guide.md) - Using guards with tools
- [Resources Guide](../sdk/typescript/05-resources-guide.md) - Protected resources
- [Middleware Guide](../sdk/typescript/07-middleware-guide.md) - Middleware pipeline
- [Authentication Overview](../sdk/typescript/09-authentication-overview.md) - Auth patterns
- [API Key Authentication](../sdk/typescript/10-api-key-authentication.md) - API key guards
- [OAuth Authentication](../sdk/typescript/11-oauth-authentication.md) - OAuth guards
