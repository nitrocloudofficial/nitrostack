import { Redis as RedisConstructor } from 'ioredis';
import RedisModule from 'ioredis';
import { env } from './env.js';

const RedisClass = (RedisModule as any).default || RedisConstructor || RedisModule;

export const redis = new RedisClass(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

redis.on('connect', () => console.error('[Redis] Connected to Redis server'));
redis.on('error', (err: any) => console.error('[Redis] Connection warning/error:', err?.message || err));

export async function connectRedis() {
  try {
    await redis.connect();
  } catch (error) {
    console.error('[Redis] Operating in fallback mode (Redis disconnected)');
  }
}
