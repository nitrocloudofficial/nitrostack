# Rate Limiting with Pluggable Storage (Redis)

The `@RateLimit` decorator protects tools from abuse by counting requests per time window.

By default, it uses in-memory storage, which is per-process. If you run multiple instances of your server (PM2 cluster, Kubernetes replicas, serverless, etc.), each instance counts requests independently. As a result, your effective limit can become approximately:

```text
limit × number of instances
```

This guide shows how to plug in Redis so that all instances share the same rate-limit counter.

## How storage pluggability works

`@RateLimit` accepts any implementation of the `RateLimitStorage` interface:

```ts
export interface RateLimitStorage {
  increment(key: string, windowMs: number): Promise<number> | number;
  reset(key: string): Promise<void> | void;
}
```

### `increment(key, windowMs)`

Records one request for the given key inside a window of `windowMs` milliseconds and returns the current request count for that window.

### `reset(key)`

Clears the counter for the given key, for example, after a successful action.

The decorator builds the final key for you using:

```text
ClassName:methodName:identity
```

Where `identity` is:

- The authenticated user's subject, when available
- The value returned by your custom `key(ctx)` function
- `anonymous` when no identity is available

## Redis implementation

Install a Redis client:

```bash
npm install ioredis
```

Create the storage class:

```ts
import Redis from 'ioredis';
import { RateLimitStorage } from '@nitrostack/core';

/**
 * Atomic INCR + expire-on-first-hit.
 *
 * A Lua script keeps the counter and its TTL atomic, which matters
 * when several server instances hit Redis at the same time.
 */
const INCREMENT_SCRIPT = `
local count = INCRBY(KEYS[1], 1)
if count == 1 then
  PEXPIRE(KEYS[1], ARGV[1])
end
return count
`;

export class RedisRateLimitStorage implements RateLimitStorage {
  constructor(
    private readonly redis: Redis,
    private readonly prefix = 'nitro:rl',
  ) {}

  async increment(key: string, windowMs: number): Promise<number> {
    const result = await this.redis.eval(
      INCREMENT_SCRIPT,
      1,
      `${this.prefix}:${key}`,
      windowMs,
    );

    return Number(result);
  }

  async reset(key: string): Promise<void> {
    await this.redis.del(`${this.prefix}:${key}`);
  }
}
```

## Usage

Create one Redis connection and one `RedisRateLimitStorage` instance:

```ts
import { Tool, RateLimit } from '@nitrostack/core';
import Redis from 'ioredis';
import { RedisRateLimitStorage } from './storage/redis-rate-limit.storage';

const redis = new Redis(process.env.REDIS_URL!);

const rateLimitStorage = new RedisRateLimitStorage(redis);

@Tool({
  name: 'send_email',
  description: 'Send an email',
})
@RateLimit({
  requests: 10,
  window: '1m',
  storage: rateLimitStorage,
})
async sendEmail(
  input: Record<string, unknown>,
  context: ExecutionContext,
) {
  // ...
}
```

Create one `RedisRateLimitStorage` instance and reuse it.

Reusing a single `ioredis` connection avoids unnecessary connection churn under load.

## Production notes

### Key namespacing

If multiple applications or environments share the same Redis instance, use a distinct prefix for each application or environment:

```ts
const rateLimitStorage = new RedisRateLimitStorage(
  redis,
  'myapp:prod:rl',
);
```

This prevents different applications from accidentally sharing the same rate-limit keys.

### Window semantics

This implementation uses a **fixed-window** algorithm.

The counter expires `windowMs` milliseconds after the first request in the window.

For example, with a limit of 10 requests per minute, a client can potentially make close to 20 requests when requests are split across two adjacent windows.

If stricter enforcement is required, a sliding-window implementation using Redis sorted sets (`ZADD` / `ZREMRANGEBYSCORE`) can be implemented using the same `RateLimitStorage` interface.

### Redis failure mode

Applications should explicitly decide what should happen when Redis is unavailable.

#### Fail-open

Requests are allowed when Redis is unavailable, while the error is logged.

This preserves application availability but temporarily disables rate limiting during the Redis outage.

For example:

```ts
async increment(key: string, windowMs: number): Promise<number> {
  try {
    const result = await this.redis.eval(
      INCREMENT_SCRIPT,
      1,
      `${this.prefix}:${key}`,
      windowMs,
    );

    return Number(result);
  } catch (error) {
    console.warn('Rate limit Redis error:', error);
    return 1;
  }
}
```

#### Fail-closed

Allow the Redis error to propagate.

Requests are rejected while Redis is unavailable, preserving the rate-limit guarantee at the cost of availability.

Choose the behavior based on the operation being protected.

## Verification

Run Redis locally:

```bash
docker run -p 6379:6379 redis:7
```

Start one instance:

```bash
REDIS_URL=redis://localhost:6379 npm run dev
```

Start a second instance using the same Redis:

```bash
REDIS_URL=redis://localhost:6379 PORT=3001 npm run dev
```

Requests sent through either instance now consume the same rate-limit quota.

For example, with:

```ts
@RateLimit({
  requests: 10,
  window: '1m',
  storage: rateLimitStorage,
})
```

the first instance might consume 6 requests and the second instance 4 requests. The shared Redis counter reaches 10, so the next request is rate limited regardless of which instance receives it.

## Known interface limitations

The current `RateLimitStorage` interface has a few limitations worth knowing:

- `increment()` returns the current count but does not return when the current window resets, so applications cannot directly implement `Retry-After` based on the storage interface alone.
- `resetRateLimit()` only resets the default in-memory storage and does not automatically reset a custom storage implementation.
- The interface does not define whether storage failures should be handled as fail-open or fail-closed. Applications using external storage should choose and document the desired behavior.

These limitations may be addressed separately as the rate-limiting API evolves.