# Dependency Injection Guide

## Overview

NitroStack implements a dependency injection (DI) container that manages class instantiation and dependency resolution. This approach promotes loose coupling, improves testability, and enables modular application architecture.

## Table of Contents

- [Core Concepts](#core-concepts)
- [Injectable Decorator](#injectable-decorator)
- [Constructor Injection](#constructor-injection)
- [Module Providers](#module-providers)
- [Service Lifecycle](#service-lifecycle)
- [Advanced Patterns](#advanced-patterns)
- [Testing with DI](#testing-with-di)
- [Best Practices](#best-practices)

## Core Concepts

Dependency injection in NitroStack follows three principles:

1. **Inversion of Control**: Classes declare dependencies rather than creating them
2. **Dependency Resolution**: The container resolves and injects dependencies automatically
3. **Singleton Scope**: Services are instantiated once and shared across the application

## Injectable Decorator

The `@Injectable()` decorator marks a class for dependency injection:

```typescript
import { Injectable } from '@nitrostack/core';

@Injectable()
export class UserService {
  constructor(
    private db: DatabaseService,
    private cache: CacheService
  ) {}

  async findById(id: string): Promise<User | null> {
    // Check cache first
    const cached = await this.cache.get(`user:${id}`);
    if (cached) return cached;

    // Query database
    const user = await this.db.query('SELECT * FROM users WHERE id = $1', [id]);

    // Cache result
    if (user) {
      await this.cache.set(`user:${id}`, user, 300);
    }

    return user;
  }

  async create(data: CreateUserDto): Promise<User> {
    const user = await this.db.query(
      'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING *',
      [data.email, data.name]
    );
    return user;
  }
}
```

## Constructor Injection

Dependencies are injected through constructor parameters. The DI container analyzes parameter types and resolves them automatically:

```typescript
import { Injectable, ToolDecorator as Tool, ExecutionContext } from '@nitrostack/core';

@Injectable()
export class EmailService {
  constructor(private config: ConfigService) {}

  async send(to: string, subject: string, body: string): Promise<void> {
    const apiKey = this.config.get('EMAIL_API_KEY');
    // Send email implementation
  }
}

@Injectable()
export class NotificationService {
  constructor(
    private emailService: EmailService,
    private smsService: SmsService,
    private pushService: PushNotificationService
  ) {}

  async notifyUser(userId: string, message: string, channels: string[]): Promise<void> {
    const tasks = channels.map(channel => {
      switch (channel) {
        case 'email': return this.emailService.send(userId, 'Notification', message);
        case 'sms': return this.smsService.send(userId, message);
        case 'push': return this.pushService.send(userId, message);
        default: throw new Error(`Unknown channel: ${channel}`);
      }
    });

    await Promise.all(tasks);
  }
}

export class NotificationTools {
  constructor(private notificationService: NotificationService) {}

  @Tool({
    name: 'send_notification',
    description: 'Send a notification to a user through specified channels'
  })
  async sendNotification(
    input: { userId: string; message: string; channels: string[] },
    ctx: ExecutionContext
  ) {
    await this.notificationService.notifyUser(
      input.userId,
      input.message,
      input.channels
    );
    return { success: true };
  }
}
```

## Module Providers

Providers are registered in module definitions:

```typescript
import { Module } from '@nitrostack/core';

@Module({
  name: 'users',
  controllers: [UserTools, UserResources],
  providers: [
    UserService,
    UserRepository,
    EmailService,
    ValidationService
  ],
  exports: [UserService]  // Make available to importing modules
})
export class UsersModule {}
```

### Provider Registration

```typescript
// Standard provider (class reference)
providers: [UserService]

// The container will:
// 1. Analyze UserService constructor
// 2. Resolve all constructor parameters
// 3. Create a singleton instance
// 4. Inject into dependent classes
```

### Exporting Providers

Export providers to make them available to other modules:

```typescript
@Module({
  name: 'database',
  providers: [DatabaseService, ConnectionPool, QueryBuilder],
  exports: [DatabaseService]  // Only DatabaseService is public
})
export class DatabaseModule {}

@Module({
  name: 'users',
  imports: [DatabaseModule],  // Import to use DatabaseService
  providers: [UserService],
  controllers: [UserTools]
})
export class UsersModule {}
```

### Global Modules

Global modules make providers available everywhere without explicit imports:

```typescript
@Module({
  name: 'core',
  providers: [Logger, ConfigService, CacheService],
  exports: [Logger, ConfigService, CacheService],
  global: true  // Available to all modules
})
export class CoreModule {}
```

## Service Lifecycle

### Singleton Scope (Default)

By default, all services are singletons. One instance is created and shared:

```typescript
@Injectable()
export class DatabaseConnectionPool {
  private connections: Connection[] = [];

  constructor() {
    // Called once at application startup
    this.initializePool();
  }

  private initializePool(): void {
    // Create connection pool
  }

  async getConnection(): Promise<Connection> {
    // Return available connection
  }
}
```

### Initialization Order

Services are initialized in dependency order:

```typescript
// 1. ConfigService (no dependencies)
@Injectable()
export class ConfigService {
  constructor() {
    // Initialized first
  }
}

// 2. DatabaseService (depends on ConfigService)
@Injectable()
export class DatabaseService {
  constructor(private config: ConfigService) {
    // Initialized second
  }
}

// 3. UserService (depends on DatabaseService)
@Injectable()
export class UserService {
  constructor(private db: DatabaseService) {
    // Initialized third
  }
}
```

## Advanced Patterns

### Service Interfaces

Define interfaces for better abstraction:

```typescript
// interfaces/storage.interface.ts
export interface StorageService {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
}

// services/redis-storage.service.ts
@Injectable()
export class RedisStorageService implements StorageService {
  constructor(private redis: RedisClient) {}

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redis.setex(key, ttl, value);
    } else {
      await this.redis.set(key, value);
    }
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
```

### Factory Patterns

Create services with complex initialization:

```typescript
@Injectable()
export class DatabaseServiceFactory {
  constructor(private config: ConfigService) {}

  createConnection(database: string): DatabaseConnection {
    const baseConfig = {
      host: this.config.get('DB_HOST'),
      port: this.config.get('DB_PORT'),
      user: this.config.get('DB_USER'),
      password: this.config.get('DB_PASSWORD')
    };

    return new DatabaseConnection({
      ...baseConfig,
      database
    });
  }
}

@Injectable()
export class MultiTenantDatabaseService {
  private connections = new Map<string, DatabaseConnection>();

  constructor(private factory: DatabaseServiceFactory) {}

  getConnection(tenantId: string): DatabaseConnection {
    if (!this.connections.has(tenantId)) {
      const connection = this.factory.createConnection(`tenant_${tenantId}`);
      this.connections.set(tenantId, connection);
    }
    return this.connections.get(tenantId)!;
  }
}
```

### Composite Services

Combine multiple services into a facade:

```typescript
@Injectable()
export class OrderFacadeService {
  constructor(
    private orderService: OrderService,
    private inventoryService: InventoryService,
    private paymentService: PaymentService,
    private notificationService: NotificationService,
    private auditService: AuditService
  ) {}

  async processOrder(order: CreateOrderDto, userId: string): Promise<Order> {
    // Start transaction
    const orderRecord = await this.orderService.create(order, userId);

    try {
      // Reserve inventory
      await this.inventoryService.reserve(order.items);

      // Process payment
      await this.paymentService.charge(userId, orderRecord.total);

      // Finalize order
      await this.orderService.confirm(orderRecord.id);

      // Send confirmation
      await this.notificationService.sendOrderConfirmation(userId, orderRecord);

      // Audit log
      await this.auditService.log('order.created', { orderId: orderRecord.id, userId });

      return orderRecord;
    } catch (error) {
      // Rollback on failure
      await this.orderService.cancel(orderRecord.id);
      await this.inventoryService.release(order.items);
      throw error;
    }
  }
}
```

## Testing with DI

### Mock Injection

Create mock implementations for testing:

```typescript
// tests/mocks/user.service.mock.ts
export class MockUserService {
  private users = new Map<string, User>();

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async create(data: CreateUserDto): Promise<User> {
    const user = {
      id: `usr_${Date.now()}`,
      ...data,
      createdAt: new Date()
    };
    this.users.set(user.id, user);
    return user;
  }

  // Helper for test setup
  seedUser(user: User): void {
    this.users.set(user.id, user);
  }

  clear(): void {
    this.users.clear();
  }
}
```

### Test Setup

```typescript
// tests/user.tools.test.ts
import { createTestingModule } from '@nitrostack/core/testing';
import { UserTools } from '../src/user.tools.js';
import { MockUserService } from './mocks/user.service.mock.js';

describe('UserTools', () => {
  let tools: UserTools;
  let mockUserService: MockUserService;

  beforeEach(async () => {
    mockUserService = new MockUserService();

    const module = await createTestingModule({
      controllers: [UserTools],
      providers: [
        { provide: UserService, useValue: mockUserService }
      ]
    });

    tools = module.get(UserTools);
  });

  afterEach(() => {
    mockUserService.clear();
  });

  describe('get_user', () => {
    it('should return user when found', async () => {
      const testUser = {
        id: 'usr_123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date()
      };
      mockUserService.seedUser(testUser);

      const result = await tools.getUser({ userId: 'usr_123' }, mockContext);

      expect(result).toEqual(testUser);
    });

    it('should throw error when user not found', async () => {
      await expect(
        tools.getUser({ userId: 'nonexistent' }, mockContext)
      ).rejects.toThrow('User not found');
    });
  });
});
```

## Best Practices

### 1. Single Responsibility

Each service should have one clear purpose:

```typescript
// Recommended: Focused services
@Injectable()
export class UserValidationService {
  validateEmail(email: string): boolean { /* ... */ }
  validatePassword(password: string): ValidationResult { /* ... */ }
}

@Injectable()
export class UserAuthenticationService {
  async authenticate(email: string, password: string): Promise<AuthResult> { /* ... */ }
}

@Injectable()
export class UserProfileService {
  async getProfile(userId: string): Promise<UserProfile> { /* ... */ }
  async updateProfile(userId: string, data: UpdateProfileDto): Promise<UserProfile> { /* ... */ }
}

// Avoid: God service
@Injectable()
export class UserService {
  validateEmail() { /* ... */ }
  validatePassword() { /* ... */ }
  authenticate() { /* ... */ }
  getProfile() { /* ... */ }
  updateProfile() { /* ... */ }
  sendEmail() { /* ... */ }
  generateReport() { /* ... */ }
  // Too many responsibilities
}
```

### 2. Avoid Direct Instantiation

Let the DI container manage instances:

```typescript
// Recommended: Inject dependencies
@Injectable()
export class OrderService {
  constructor(private paymentService: PaymentService) {}

  async createOrder(data: OrderDto): Promise<Order> {
    await this.paymentService.charge(data.amount);
  }
}

// Avoid: Direct instantiation
@Injectable()
export class OrderService {
  private paymentService = new PaymentService();  // Bad!

  async createOrder(data: OrderDto): Promise<Order> {
    await this.paymentService.charge(data.amount);
  }
}
```

### 3. Program to Interfaces

Define clear contracts for services:

```typescript
// Recommended: Interface-based design
export interface PaymentProcessor {
  charge(amount: number, currency: string): Promise<PaymentResult>;
  refund(transactionId: string, amount: number): Promise<RefundResult>;
}

@Injectable()
export class StripePaymentService implements PaymentProcessor {
  async charge(amount: number, currency: string): Promise<PaymentResult> { /* ... */ }
  async refund(transactionId: string, amount: number): Promise<RefundResult> { /* ... */ }
}

// Easy to swap implementations
@Injectable()
export class PayPalPaymentService implements PaymentProcessor {
  async charge(amount: number, currency: string): Promise<PaymentResult> { /* ... */ }
  async refund(transactionId: string, amount: number): Promise<RefundResult> { /* ... */ }
}
```

### 4. Keep Services Stateless

Avoid mutable state in services:

```typescript
// Recommended: Stateless service
@Injectable()
export class PricingService {
  constructor(private config: ConfigService) {}

  calculatePrice(basePrice: number, quantity: number): number {
    const taxRate = this.config.get('TAX_RATE');
    return basePrice * quantity * (1 + taxRate);
  }
}

// Avoid: Stateful service
@Injectable()
export class PricingService {
  private lastCalculation: number = 0;  // Mutable state
  private cache: Map<string, number> = new Map();  // Be careful with caches

  calculatePrice(basePrice: number): number {
    this.lastCalculation = basePrice * 1.1;  // Side effect
    return this.lastCalculation;
  }
}
```

### 5. Explicit Dependencies

Declare all dependencies in the constructor:

```typescript
// Recommended: Explicit dependencies
@Injectable()
export class ReportService {
  constructor(
    private db: DatabaseService,
    private cache: CacheService,
    private logger: Logger
  ) {}
}

// Avoid: Hidden dependencies
@Injectable()
export class ReportService {
  generateReport(): Report {
    const db = getDatabaseInstance();  // Hidden dependency
    const data = db.query('...');
  }
}
```

## Related Documentation

- [Server Concepts](./03-server-concepts.md) - Module architecture
- [Testing Guide](./14-testing-guide.md) - Testing with mocks
- [Best Practices](./17-best-practices.md) - Architecture guidelines
