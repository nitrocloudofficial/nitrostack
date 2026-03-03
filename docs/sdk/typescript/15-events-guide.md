# Events Guide

## Overview

The event system in NitroStack enables decoupled communication between components. Events allow you to emit signals when actions occur and handle them asynchronously without tight coupling between producers and consumers.

## Table of Contents

- [Emitting Events](#emitting-events)
- [Listening to Events](#listening-to-events)
- [Event Patterns](#event-patterns)
- [Event Data Design](#event-data-design)
- [Best Practices](#best-practices)

## Emitting Events

### From Tool Handlers

```typescript
import { ToolDecorator as Tool, ExecutionContext } from '@nitrostack/core';

export class OrderTools {
  @Tool({ name: 'create_order' })
  async createOrder(input: CreateOrderInput, ctx: ExecutionContext) {
    const order = await this.orderService.create(input);

    // Emit event for async processing
    ctx.emit('order.created', {
      orderId: order.id,
      userId: ctx.auth?.subject,
      total: order.total,
      itemCount: order.items.length,
      timestamp: new Date().toISOString()
    });

    return order;
  }

  @Tool({ name: 'cancel_order' })
  async cancelOrder(input: { orderId: string; reason: string }, ctx: ExecutionContext) {
    const order = await this.orderService.cancel(input.orderId, input.reason);

    ctx.emit('order.cancelled', {
      orderId: order.id,
      userId: ctx.auth?.subject,
      reason: input.reason,
      refundAmount: order.total,
      timestamp: new Date().toISOString()
    });

    return order;
  }
}
```

### From Services

```typescript
import { Injectable, emitEvent } from '@nitrostack/core';

@Injectable()
export class PaymentService {
  async processPayment(orderId: string, amount: number, userId: string): Promise<Payment> {
    const payment = await this.executePayment(orderId, amount);

    // Emit event using the global function
    emitEvent('payment.processed', {
      paymentId: payment.id,
      orderId,
      amount,
      userId,
      status: payment.status,
      timestamp: new Date().toISOString()
    });

    return payment;
  }

  async refundPayment(paymentId: string, reason: string): Promise<Refund> {
    const refund = await this.executeRefund(paymentId);

    emitEvent('payment.refunded', {
      refundId: refund.id,
      paymentId,
      amount: refund.amount,
      reason,
      timestamp: new Date().toISOString()
    });

    return refund;
  }
}
```

## Listening to Events

### Using @OnEvent Decorator

```typescript
import { Injectable, OnEvent } from '@nitrostack/core';

@Injectable()
export class NotificationService {
  constructor(
    private emailService: EmailService,
    private pushService: PushService
  ) {}

  @OnEvent('order.created')
  async handleOrderCreated(data: OrderCreatedEvent): Promise<void> {
    console.log(`Order created: ${data.orderId}`);

    // Send confirmation email
    await this.emailService.sendOrderConfirmation(data.userId, {
      orderId: data.orderId,
      total: data.total,
      itemCount: data.itemCount
    });
  }

  @OnEvent('order.cancelled')
  async handleOrderCancelled(data: OrderCancelledEvent): Promise<void> {
    console.log(`Order cancelled: ${data.orderId}`);

    // Send cancellation notification
    await this.emailService.sendOrderCancellation(data.userId, {
      orderId: data.orderId,
      reason: data.reason,
      refundAmount: data.refundAmount
    });
  }

  @OnEvent('payment.processed')
  async handlePaymentProcessed(data: PaymentProcessedEvent): Promise<void> {
    console.log(`Payment processed: ${data.paymentId}`);

    // Send receipt
    await this.emailService.sendPaymentReceipt(data.userId, {
      paymentId: data.paymentId,
      amount: data.amount
    });
  }
}
```

### Multiple Handlers for Same Event

```typescript
@Injectable()
export class AnalyticsService {
  @OnEvent('order.created')
  async trackOrderCreation(data: OrderCreatedEvent): Promise<void> {
    await this.analyticsClient.track('order_created', {
      orderId: data.orderId,
      value: data.total
    });
  }
}

@Injectable()
export class InventoryService {
  @OnEvent('order.created')
  async reserveInventory(data: OrderCreatedEvent): Promise<void> {
    // Reserve inventory for the order
    await this.reserveItems(data.orderId);
  }
}

@Injectable()
export class AuditService {
  @OnEvent('order.created')
  async auditOrderCreation(data: OrderCreatedEvent): Promise<void> {
    await this.auditLog.record({
      action: 'order.created',
      entityId: data.orderId,
      userId: data.userId,
      timestamp: data.timestamp
    });
  }
}
```

## Event Patterns

### Naming Convention

Use dot notation with resource and action:

```typescript
// Pattern: resource.action
'user.created'
'user.updated'
'user.deleted'

'order.created'
'order.confirmed'
'order.shipped'
'order.delivered'
'order.cancelled'

'payment.initiated'
'payment.processed'
'payment.failed'
'payment.refunded'

'inventory.reserved'
'inventory.released'
'inventory.depleted'
```

### Event Lifecycle

```typescript
// Entity lifecycle events
@OnEvent('order.created')      // New order placed
@OnEvent('order.confirmed')    // Order confirmed by merchant
@OnEvent('order.processing')   // Order being prepared
@OnEvent('order.shipped')      // Order shipped
@OnEvent('order.delivered')    // Order delivered
@OnEvent('order.completed')    // Order finalized
@OnEvent('order.cancelled')    // Order cancelled

// Each handler can trigger subsequent events
@Injectable()
export class OrderLifecycleService {
  @OnEvent('order.shipped')
  async handleShipped(data: OrderShippedEvent): Promise<void> {
    // Update tracking
    await this.trackingService.initiate(data.orderId, data.trackingNumber);

    // Estimate delivery
    const estimatedDelivery = await this.calculateDelivery(data);

    // Emit follow-up event
    emitEvent('order.delivery_scheduled', {
      orderId: data.orderId,
      estimatedDelivery
    });
  }
}
```

### Error Events

```typescript
@Injectable()
export class ErrorHandlingService {
  @OnEvent('payment.failed')
  async handlePaymentFailure(data: PaymentFailedEvent): Promise<void> {
    console.log(`Payment failed for order: ${data.orderId}`);

    // Notify customer
    await this.notificationService.sendPaymentFailure(data.userId, {
      orderId: data.orderId,
      reason: data.failureReason
    });

    // Update order status
    await this.orderService.markPaymentFailed(data.orderId);

    // Log for analysis
    await this.analyticsService.trackPaymentFailure(data);
  }
}
```

## Event Data Design

### Event Interface Definitions

```typescript
// events/order.events.ts
export interface OrderCreatedEvent {
  orderId: string;
  userId: string;
  total: number;
  itemCount: number;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  timestamp: string;
}

export interface OrderCancelledEvent {
  orderId: string;
  userId: string;
  reason: string;
  refundAmount: number;
  timestamp: string;
}

export interface OrderShippedEvent {
  orderId: string;
  userId: string;
  trackingNumber: string;
  carrier: string;
  estimatedDelivery: string;
  timestamp: string;
}

// events/payment.events.ts
export interface PaymentProcessedEvent {
  paymentId: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  method: 'card' | 'bank' | 'wallet';
  status: 'completed' | 'pending';
  timestamp: string;
}

export interface PaymentFailedEvent {
  paymentId: string;
  orderId: string;
  userId: string;
  amount: number;
  failureReason: string;
  retryable: boolean;
  timestamp: string;
}
```

### Include Essential Context

```typescript
// Include enough context for handlers to process without additional queries
ctx.emit('user.registered', {
  // Identity
  userId: user.id,

  // Key attributes
  email: user.email,
  name: user.name,
  plan: user.plan,

  // Source tracking
  referralCode: input.referralCode,
  registrationSource: input.source,

  // Metadata
  timestamp: new Date().toISOString(),
  requestId: ctx.requestId
});
```

## Best Practices

### 1. Keep Handlers Async-Safe

Handlers should not block the main flow:

```typescript
// Recommended: Async handlers that don't throw to caller
@OnEvent('order.created')
async handleOrderCreated(data: OrderCreatedEvent): Promise<void> {
  try {
    await this.processOrder(data);
  } catch (error) {
    // Log and handle errors within the handler
    this.logger.error('Failed to process order event', {
      orderId: data.orderId,
      error
    });
    // Don't re-throw - event emission should not fail
  }
}
```

### 2. Use Typed Event Data

```typescript
// Recommended: Type-safe events
@OnEvent('order.created')
async handleOrderCreated(data: OrderCreatedEvent): Promise<void> {
  // data.orderId is typed as string
  // data.total is typed as number
}

// Avoid: Untyped events
@OnEvent('order.created')
async handleOrderCreated(data: any): Promise<void> {
  // No type safety
}
```

### 3. Include Timestamps

```typescript
// Recommended: Always include timestamp
ctx.emit('payment.processed', {
  paymentId: payment.id,
  amount: payment.amount,
  timestamp: new Date().toISOString()  // ISO 8601 format
});
```

### 4. Handle Errors in Handlers

```typescript
@OnEvent('order.shipped')
async handleShipped(data: OrderShippedEvent): Promise<void> {
  try {
    await this.notifyCustomer(data);
  } catch (error) {
    // Log error but don't propagate
    this.logger.error('Failed to notify customer', { orderId: data.orderId, error });

    // Optionally emit failure event for retry
    emitEvent('notification.failed', {
      type: 'order_shipped',
      orderId: data.orderId,
      error: error.message
    });
  }
}
```

### 5. Document Event Contracts

```typescript
/**
 * Emitted when a new order is successfully created.
 *
 * @event order.created
 * @property {string} orderId - Unique order identifier
 * @property {string} userId - Customer who placed the order
 * @property {number} total - Order total in cents
 * @property {number} itemCount - Number of items in the order
 * @property {string} timestamp - ISO 8601 timestamp
 *
 * @example
 * {
 *   orderId: 'ord_abc123',
 *   userId: 'usr_xyz789',
 *   total: 5999,
 *   itemCount: 3,
 *   timestamp: '2024-01-15T10:30:00Z'
 * }
 */
ctx.emit('order.created', data);
```

### 6. Use Events for Decoupling

```typescript
// Recommended: Loose coupling via events
@Tool({ name: 'create_order' })
async createOrder(input: CreateOrderInput, ctx: ExecutionContext) {
  const order = await this.orderService.create(input);

  // Let other services react to the event
  ctx.emit('order.created', { orderId: order.id, ... });

  return order;  // Handler returns immediately
}

// Avoid: Tight coupling
@Tool({ name: 'create_order' })
async createOrder(input: CreateOrderInput, ctx: ExecutionContext) {
  const order = await this.orderService.create(input);

  // Directly calling other services
  await this.emailService.sendConfirmation(order);
  await this.analyticsService.track(order);
  await this.inventoryService.reserve(order);
  await this.auditService.log(order);

  return order;  // All must complete before response
}
```

## Related Documentation

- [Middleware Guide](./07-middleware-guide.md) - Request pipeline
- [Dependency Injection](./12-dependency-injection.md) - Service injection
- [Best Practices](./17-best-practices.md) - Architecture patterns
