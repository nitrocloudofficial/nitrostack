# Testing Guide

## Overview

NitroStack v3.0 provides testing utilities to help you write unit and integration tests for your MCP servers.

## Setup

### Install Dependencies

```bash
npm install --save-dev jest @types/jest ts-jest
```

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
```

### Package.json Script

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

## Testing Module

### Import Testing Utilities

```typescript
import {
  TestingModule,
  createMockContext,
  createMockFn,
  spyOn
} from 'nitrostack/testing';
```

### TestingModule

Create a testing module to test your components in isolation:

```typescript
import { TestingModule } from 'nitrostack/testing';
import { ProductsModule } from '../products/products.module';
import { ProductService } from '../products/products.service';

describe('ProductsModule', () => {
  let module: TestingModule;
  let productService: ProductService;
  
  beforeEach(async () => {
    module = await TestingModule.create({
      imports: [ProductsModule],
      providers: [
        {
          provide: DatabaseService,
          useValue: mockDatabaseService  // Mock dependency
        }
      ]
    });
    
    productService = module.get(ProductService);
  });
  
  afterEach(async () => {
    await module.close();
  });
  
  it('should be defined', () => {
    expect(productService).toBeDefined();
  });
});
```

## Testing Tools

### Basic Tool Test

```typescript
import { createMockContext } from 'nitrostack/testing';
import { ProductsTools } from '../products/products.tools';
import { ProductService } from '../products/products.service';

describe('ProductsTools', () => {
  let tools: ProductsTools;
  let mockProductService: jest.Mocked<ProductService>;
  
  beforeEach(() => {
    mockProductService = {
      findById: jest.fn(),
      search: jest.fn()
    } as any;
    
    tools = new ProductsTools(mockProductService);
  });
  
  describe('getProduct', () => {
    it('should return product by ID', async () => {
      const mockProduct = {
        id: 'prod-1',
        name: 'Test Product',
        price: 99.99
      };
      
      mockProductService.findById.mockResolvedValue(mockProduct);
      
      const ctx = createMockContext();
      const result = await tools.getProduct({ product_id: 'prod-1' }, ctx);
      
      expect(result).toEqual(mockProduct);
      expect(mockProductService.findById).toHaveBeenCalledWith('prod-1');
    });
    
    it('should throw if product not found', async () => {
      mockProductService.findById.mockResolvedValue(null);
      
      const ctx = createMockContext();
      
      await expect(
        tools.getProduct({ product_id: 'invalid' }, ctx)
      ).rejects.toThrow('Product not found');
    });
  });
});
```

### Testing with Authentication

```typescript
describe('AuthenticatedTools', () => {
  it('should use authenticated user ID', async () => {
    const ctx = createMockContext({
      auth: {
        subject: 'user-123',
        token: 'fake-token'
      }
    });
    
    const result = await tools.getUserProfile({}, ctx);
    
    expect(result.id).toBe('user-123');
  });
});
```

### Testing Guards

```typescript
import { JWTGuard } from '../guards/jwt.guard';

describe('JWTGuard', () => {
  let guard: JWTGuard;
  let mockConfigService: any;
  
  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockReturnValue('test-secret')
    };
    guard = new JWTGuard(mockConfigService);
  });
  
  it('should allow valid token', async () => {
    const ctx = createMockContext({
      metadata: {
        authorization: 'Bearer valid-token'
      }
    });
    
    // Mock JWT verification
    jest.spyOn(jwt, 'verify').mockReturnValue({
      sub: 'user-123',
      email: 'test@example.com'
    });
    
    const result = await guard.canActivate(ctx);
    
    expect(result).toBe(true);
    expect(ctx.auth?.subject).toBe('user-123');
  });
  
  it('should reject missing token', async () => {
    const ctx = createMockContext();
    
    const result = await guard.canActivate(ctx);
    
    expect(result).toBe(false);
  });
  
  it('should reject invalid token', async () => {
    const ctx = createMockContext({
      metadata: {
        authorization: 'Bearer invalid-token'
      }
    });
    
    jest.spyOn(jwt, 'verify').mockImplementation(() => {
      throw new Error('Invalid token');
    });
    
    const result = await guard.canActivate(ctx);
    
    expect(result).toBe(false);
  });
});
```

## Testing Services

### Basic Service Test

```typescript
describe('ProductService', () => {
  let service: ProductService;
  let mockDb: jest.Mocked<DatabaseService>;
  
  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
      queryOne: jest.fn(),
      execute: jest.fn()
    } as any;
    
    service = new ProductService(mockDb);
  });
  
  describe('findById', () => {
    it('should return product', async () => {
      const mockProduct = { id: 'prod-1', name: 'Test' };
      mockDb.queryOne.mockResolvedValue(mockProduct);
      
      const result = await service.findById('prod-1');
      
      expect(result).toEqual(mockProduct);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        'SELECT * FROM products WHERE id = ?',
        ['prod-1']
      );
    });
  });
  
  describe('search', () => {
    it('should search products', async () => {
      const mockProducts = [
        { id: 'prod-1', name: 'Test 1' },
        { id: 'prod-2', name: 'Test 2' }
      ];
      mockDb.query.mockResolvedValue(mockProducts);
      
      const result = await service.search('test');
      
      expect(result).toEqual(mockProducts);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LIKE'),
        ['%test%']
      );
    });
  });
});
```

## Testing Middleware

```typescript
import { LoggingMiddleware } from '../middleware/logging.middleware';

describe('LoggingMiddleware', () => {
  let middleware: LoggingMiddleware;
  let ctx: any;
  let next: jest.Mock;
  
  beforeEach(() => {
    middleware = new LoggingMiddleware();
    ctx = createMockContext();
    next = jest.fn().mockResolvedValue('result');
  });
  
  it('should log before and after execution', async () => {
    const logSpy = jest.spyOn(ctx.logger, 'info');
    
    const result = await middleware.use(ctx, next);
    
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Before'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('After'));
    expect(next).toHaveBeenCalled();
    expect(result).toBe('result');
  });
  
  it('should log errors', async () => {
    const error = new Error('Test error');
    next.mockRejectedValue(error);
    
    const errorSpy = jest.spyOn(ctx.logger, 'error');
    
    await expect(middleware.use(ctx, next)).rejects.toThrow(error);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Error'));
  });
});
```

## Testing Interceptors

```typescript
import { TransformInterceptor } from '../interceptors/transform.interceptor';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor;
  let ctx: any;
  let next: jest.Mock;
  
  beforeEach(() => {
    interceptor = new TransformInterceptor();
    ctx = createMockContext();
    next = jest.fn();
  });
  
  it('should wrap result in success response', async () => {
    next.mockResolvedValue({ id: 1, name: 'Test' });
    
    const result = await interceptor.intercept(ctx, next);
    
    expect(result).toEqual({
      success: true,
      data: { id: 1, name: 'Test' },
      metadata: expect.any(Object)
    });
  });
  
  it('should include timestamp', async () => {
    next.mockResolvedValue({ data: 'test' });
    
    const result = await interceptor.intercept(ctx, next);
    
    expect(result.metadata.timestamp).toBeDefined();
  });
});
```

## Integration Tests

### Testing Full Module

```typescript
describe('ProductsModule Integration', () => {
  let module: TestingModule;
  let tools: ProductsTools;
  let db: DatabaseService;
  
  beforeEach(async () => {
    // Use real database (in-memory SQLite)
    const testDb = new DatabaseService(':memory:');
    await testDb.migrate();
    
    module = await TestingModule.create({
      imports: [ProductsModule],
      providers: [
        { provide: DatabaseService, useValue: testDb }
      ]
    });
    
    tools = module.get(ProductsTools);
    db = module.get(DatabaseService);
    
    // Seed test data
    await db.execute(
      'INSERT INTO products (id, name, price) VALUES (?, ?, ?)',
      ['prod-1', 'Test Product', 99.99]
    );
  });
  
  afterEach(async () => {
    await module.close();
  });
  
  it('should fetch product from database', async () => {
    const ctx = createMockContext();
    const result = await tools.getProduct({ product_id: 'prod-1' }, ctx);
    
    expect(result).toMatchObject({
      id: 'prod-1',
      name: 'Test Product',
      price: 99.99
    });
  });
  
  it('should search products', async () => {
    const ctx = createMockContext();
    const result = await tools.searchProducts({ query: 'Test' }, ctx);
    
    expect(result.products).toHaveLength(1);
    expect(result.products[0].name).toBe('Test Product');
  });
});
```

## Mock Utilities

### createMockContext

```typescript
const ctx = createMockContext({
  auth: {
    subject: 'user-123',
    token: 'fake-token',
    role: 'admin'
  },
  metadata: {
    custom: 'value'
  }
});
```

### createMockFn

```typescript
const mockFn = createMockFn<(input: any) => Promise<any>>();

mockFn.mockResolvedValue({ success: true });
mockFn.mockRejectedValue(new Error('Failed'));
```

### spyOn

```typescript
const spy = spyOn(service, 'methodName');

spy.mockReturnValue('mocked value');
spy.mockImplementation((arg) => `modified ${arg}`);

expect(spy).toHaveBeenCalledWith('arg');
expect(spy).toHaveBeenCalledTimes(1);
```

## Test Coverage

### Run Coverage

```bash
npm run test:coverage
```

### Coverage Goals

Aim for:
- **Statements**: > 80%
- **Branches**: > 70%
- **Functions**: > 80%
- **Lines**: > 80%

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/**/index.ts'
  ],
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

## Best Practices

### 1. Test Business Logic

```typescript
// Good - Test logic
it('should calculate discount correctly', () => {
  const result = service.calculateDiscount(100, 0.2);
  expect(result).toBe(80);
});

// Avoid - Testing implementation details
it('should call calculatePrice', () => {
  service.calculateDiscount(100, 0.2);
  expect(mockCalculatePrice).toHaveBeenCalled();
});
```

### 2. Use Descriptive Test Names

```typescript
// Good
it('should throw error when product ID is invalid', () => {});
it('should return null when user is not found', () => {});

// Avoid
it('test1', () => {});
it('should work', () => {});
```

### 3. Arrange-Act-Assert Pattern

```typescript
// Good
it('should update user name', async () => {
  // Arrange
  const userId = 'user-1';
  const newName = 'John Doe';
  
  // Act
  const result = await service.updateUser(userId, { name: newName });
  
  // Assert
  expect(result.name).toBe(newName);
});
```

### 4. Mock External Dependencies

```typescript
// Good - Mock external API
jest.mock('axios');
axios.get.mockResolvedValue({ data: { weather: 'sunny' } });

// Avoid - Real API calls in tests
const weather = await axios.get('https://api.weather.com');
```

### 5. Test Edge Cases

```typescript
describe('calculateTotal', () => {
  it('should handle empty cart', () => {
    expect(service.calculateTotal([])).toBe(0);
  });
  
  it('should handle negative quantities', () => {
    expect(() => service.calculateTotal([{ qty: -1 }]))
      .toThrow('Invalid quantity');
  });
  
  it('should handle very large numbers', () => {
    const result = service.calculateTotal([
      { price: Number.MAX_SAFE_INTEGER, qty: 1 }
    ]);
    expect(result).toBe(Number.MAX_SAFE_INTEGER);
  });
});
```

## Example Test Suite

```typescript
// products.service.spec.ts
import { ProductService } from './products.service';
import { DatabaseService } from '../database/database.service';

describe('ProductService', () => {
  let service: ProductService;
  let mockDb: jest.Mocked<DatabaseService>;
  
  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
      queryOne: jest.fn(),
      execute: jest.fn()
    } as any;
    
    service = new ProductService(mockDb);
  });
  
  describe('findById', () => {
    it('should return product when found', async () => {
      const mockProduct = { id: 'prod-1', name: 'Test', price: 99.99 };
      mockDb.queryOne.mockResolvedValue(mockProduct);
      
      const result = await service.findById('prod-1');
      
      expect(result).toEqual(mockProduct);
    });
    
    it('should return null when not found', async () => {
      mockDb.queryOne.mockResolvedValue(null);
      
      const result = await service.findById('invalid');
      
      expect(result).toBeNull();
    });
    
    it('should throw on database error', async () => {
      mockDb.queryOne.mockRejectedValue(new Error('DB Error'));
      
      await expect(service.findById('prod-1')).rejects.toThrow('DB Error');
    });
  });
  
  describe('search', () => {
    it('should return matching products', async () => {
      const mockProducts = [
        { id: 'prod-1', name: 'Test 1' },
        { id: 'prod-2', name: 'Test 2' }
      ];
      mockDb.query.mockResolvedValue(mockProducts);
      
      const result = await service.search('test');
      
      expect(result).toHaveLength(2);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        ['%test%']
      );
    });
    
    it('should return empty array when no matches', async () => {
      mockDb.query.mockResolvedValue([]);
      
      const result = await service.search('nonexistent');
      
      expect(result).toEqual([]);
    });
  });
  
  describe('create', () => {
    it('should create new product', async () => {
      mockDb.execute.mockResolvedValue({ lastInsertRowid: 1 });
      
      const input = { name: 'New Product', price: 49.99 };
      const result = await service.create(input);
      
      expect(result.id).toBeDefined();
      expect(result.name).toBe('New Product');
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT'),
        expect.arrayContaining([input.name, input.price])
      );
    });
  });
});
```

## Next Steps

- [Tools Guide](./04-tools-guide.md)
- [Dependency Injection](./12-dependency-injection.md)
- [Best Practices](./17-best-practices.md)

---

**Tip**: Write tests as you develop, not after. Test-driven development (TDD) leads to better design and fewer bugs!
