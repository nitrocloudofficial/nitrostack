import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SessionVisibilityStore } from '../session-store.js';

describe('SessionVisibilityStore (NITRO-104-M1)', () => {
  let store: SessionVisibilityStore;

  beforeEach(() => {
    store = new SessionVisibilityStore({ ttlMinutes: 1, maxSessions: 3, sweepIntervalSeconds: 10 });
  });

  afterEach(() => {
    store.destroy();
  });

  it('should isolate enabled and disabled tools across distinct sessions', () => {
    store.enableTools('sess-1', ['tool_a', 'tool_b']);
    store.enableTools('sess-2', ['tool_c']);
    store.disableTools('sess-2', ['tool_a']);

    expect(store.hasEnabled('sess-1', 'tool_a')).toBe(true);
    expect(store.hasEnabled('sess-1', 'tool_b')).toBe(true);
    expect(store.hasEnabled('sess-1', 'tool_c')).toBe(false);

    expect(store.hasEnabled('sess-2', 'tool_a')).toBe(false);
    expect(store.hasDisabled('sess-2', 'tool_a')).toBe(true);
    expect(store.hasEnabled('sess-2', 'tool_c')).toBe(true);
  });

  it('should toggle tool state cleanly between enabled and disabled', () => {
    store.enableTools('sess-1', ['admin_tool']);
    expect(store.hasEnabled('sess-1', 'admin_tool')).toBe(true);

    store.disableTools('sess-1', ['admin_tool']);
    expect(store.hasEnabled('sess-1', 'admin_tool')).toBe(false);
    expect(store.hasDisabled('sess-1', 'admin_tool')).toBe(true);
  });

  it('should evict oldest session when exceeding maxSessions cap', () => {
    store.getOrCreateSession('sess-1');
    store.getOrCreateSession('sess-2');
    store.getOrCreateSession('sess-3');
    expect(store.activeSessionCount).toBe(3);

    // Adding 4th should evict sess-1
    store.getOrCreateSession('sess-4');
    expect(store.activeSessionCount).toBe(3);
    expect(store.getSession('sess-1')).toBeUndefined();
    expect(store.getSession('sess-4')).toBeDefined();
  });

  it('should maintain LRU order upon session access so recently accessed sessions are preserved', () => {
    store.getOrCreateSession('sess-1');
    store.getOrCreateSession('sess-2');
    store.getOrCreateSession('sess-3');

    // Touch sess-1 so it becomes most recently used
    store.getSession('sess-1');

    // Adding 4th should now evict sess-2 (oldest) instead of sess-1
    store.getOrCreateSession('sess-4');
    expect(store.getSession('sess-2')).toBeUndefined();
    expect(store.getSession('sess-1')).toBeDefined();
    expect(store.getSession('sess-3')).toBeDefined();
    expect(store.getSession('sess-4')).toBeDefined();
  });

  it('should garbage collect sessions after TTL expiry', () => {
    jest.useFakeTimers();
    store.getOrCreateSession('sess-expire');
    expect(store.activeSessionCount).toBe(1);

    // Fast-forward 65 seconds
    jest.advanceTimersByTime(65 * 1000);
    store.cleanupExpired();
    expect(store.activeSessionCount).toBe(0);
    jest.useRealTimers();
  });

  it('keeps explicit revokes after the session record expires', () => {
    jest.useFakeTimers();
    store.disableTools('sess-expire', ['process_refund']);
    expect(store.hasDisabled('sess-expire', 'process_refund')).toBe(true);

    jest.advanceTimersByTime(65 * 1000);
    store.cleanupExpired();

    expect(store.getSession('sess-expire')).toBeUndefined();
    expect(store.hasDisabled('sess-expire', 'process_refund')).toBe(true);
    jest.useRealTimers();
  });

  it('should explicitly clear session state when clearSession is invoked', () => {
    store.enableTools('sess-temp', ['tool_temp']);
    store.disableTools('sess-temp', ['tool_revoked']);
    expect(store.hasEnabled('sess-temp', 'tool_temp')).toBe(true);

    store.clearSession('sess-temp');
    expect(store.getSession('sess-temp')).toBeUndefined();
    expect(store.hasEnabled('sess-temp', 'tool_temp')).toBe(false);
    expect(store.hasDisabled('sess-temp', 'tool_revoked')).toBe(false);
  });
});
