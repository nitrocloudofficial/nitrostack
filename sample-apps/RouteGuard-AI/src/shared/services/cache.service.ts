import { Injectable, ConfigService } from '@nitrostack/core';

/**
 * Cache Service
 * Abstracts Redis operations (mock implementation for now)
 * In production, replace with actual redis client
 */

@Injectable({ deps: [ConfigService] })
export class CacheService {
  private cache: Map<string, { value: unknown; expiresAt: number }> = new Map();
  private redisUrl: string;

  constructor(private config: ConfigService) {
    this.redisUrl = this.config.get('REDIS_URL') || 'redis://localhost:6379';
  }

  /**
   * Set a value in cache with optional TTL (seconds)
   */
  async set(key: string, value: unknown, ttlSeconds = 3600): Promise<void> {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Get a value from cache
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Delete a key from cache
   */
  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get all keys matching a pattern
   */
  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return Array.from(this.cache.keys()).filter((key) => {
      const entry = this.cache.get(key);
      if (!entry || Date.now() > entry.expiresAt) {
        this.cache.delete(key);
        return false;
      }
      return regex.test(key);
    });
  }

  /**
   * Cache threat feed (1 hour TTL)
   */
  async cacheThreatFeed(threats: unknown[]): Promise<void> {
    await this.set('threat:feed', threats, 3600);
  }

  /**
   * Get cached threat feed
   */
  async getCachedThreatFeed(): Promise<unknown[] | null> {
    return this.get('threat:feed');
  }

  /**
   * Cache carrier rates (2 hour TTL)
   */
  async cacheCarrierRates(rates: unknown[]): Promise<void> {
    await this.set('carrier:rates', rates, 7200);
  }

  /**
   * Get cached carrier rates
   */
  async getCachedCarrierRates(): Promise<unknown[] | null> {
    return this.get('carrier:rates');
  }

  /**
   * Cache shipment data (30 min TTL)
   */
  async cacheShipment(shipmentId: string, shipment: unknown): Promise<void> {
    await this.set(`shipment:${shipmentId}`, shipment, 1800);
  }

  /**
   * Get cached shipment
   */
  async getCachedShipment(shipmentId: string): Promise<unknown | null> {
    return this.get(`shipment:${shipmentId}`);
  }

  /**
   * Cache impact analysis (1 hour TTL)
   */
  async cacheImpact(threatId: string, shipmentId: string, impact: unknown): Promise<void> {
    await this.set(`impact:${threatId}:${shipmentId}`, impact, 3600);
  }

  /**
   * Get cached impact
   */
  async getCachedImpact(threatId: string, shipmentId: string): Promise<unknown | null> {
    return this.get(`impact:${threatId}:${shipmentId}`);
  }

  /**
   * Invalidate all threat-related caches
   */
  async invalidateThreats(): Promise<void> {
    const keys = await this.keys('threat:*');
    for (const key of keys) {
      await this.delete(key);
    }
  }

  /**
   * Invalidate all shipment-related caches
   */
  async invalidateShipments(): Promise<void> {
    const keys = await this.keys('shipment:*');
    for (const key of keys) {
      await this.delete(key);
    }
  }

  /**
   * Invalidate all impact-related caches
   */
  async invalidateImpacts(): Promise<void> {
    const keys = await this.keys('impact:*');
    for (const key of keys) {
      await this.delete(key);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    size: number;
    keys: string[];
  }> {
    // Clean up expired entries
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }

    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}
