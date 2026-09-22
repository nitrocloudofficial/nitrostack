/**
 * Per-session visibility state recording explicit tool reveals and hides.
 */
export interface SessionVisibilityState {
  sessionId: string;
  enabledTools: Set<string>;
  disabledTools: Set<string>;
  lastActive: number;
}

export interface SessionVisibilityStoreOptions {
  /**
   * Time-to-live for inactive sessions in minutes (default: 60).
   */
  ttlMinutes?: number;
  /**
   * Maximum concurrent sessions held in memory before oldest inactive is evicted (default: 10,000).
   */
  maxSessions?: number;
  /**
   * Background sweep interval in seconds (default: 300).
   */
  sweepIntervalSeconds?: number;
}

/**
 * Manages per-session dynamic visibility state for MCP tools with memory bounds,
 * TTL expiry, and LRU pruning.
 */
export class SessionVisibilityStore {
  private readonly sessions = new Map<string, SessionVisibilityState>();
  private readonly ttlMs: number;
  private readonly maxSessions: number;
  private readonly sweepTimer: NodeJS.Timeout;

  constructor(options: SessionVisibilityStoreOptions = {}) {
    this.ttlMs = (options.ttlMinutes ?? 60) * 60 * 1000;
    this.maxSessions = options.maxSessions ?? 10000;
    const sweepIntervalMs = (options.sweepIntervalSeconds ?? 300) * 1000;

    // Periodic sweep with unref to avoid keeping Node.js event loop open
    this.sweepTimer = setInterval(() => this.cleanupExpired(), sweepIntervalMs);
    if (typeof this.sweepTimer.unref === 'function') {
      this.sweepTimer.unref();
    }
  }

  /**
   * Retrieves active session state or initializes a new entry.
   * Updates lastActive timestamp and maintains Map insertion order for LRU.
   */
  getOrCreateSession(sessionId: string): SessionVisibilityState {
    let state = this.sessions.get(sessionId);
    if (!state) {
      if (this.sessions.size >= this.maxSessions) {
        this.evictOldest();
      }
      state = {
        sessionId,
        enabledTools: new Set<string>(),
        disabledTools: new Set<string>(),
        lastActive: Date.now(),
      };
      this.sessions.set(sessionId, state);
    } else {
      state.lastActive = Date.now();
      // Re-insert to maintain LRU access order
      this.sessions.delete(sessionId);
      this.sessions.set(sessionId, state);
    }
    return state;
  }

  /**
   * Retrieves active session state without creating one if absent.
   * Updates lastActive timestamp and LRU order if found.
   */
  getSession(sessionId: string): SessionVisibilityState | undefined {
    const state = this.sessions.get(sessionId);
    if (state) {
      state.lastActive = Date.now();
      this.sessions.delete(sessionId);
      this.sessions.set(sessionId, state);
    }
    return state;
  }

  /**
   * Explicitly enables (reveals) tools for a given session.
   */
  enableTools(sessionId: string, toolNames: string[]): void {
    const session = this.getOrCreateSession(sessionId);
    for (const name of toolNames) {
      session.enabledTools.add(name);
      session.disabledTools.delete(name);
    }
  }

  /**
   * Explicitly disables (hides) tools for a given session.
   */
  disableTools(sessionId: string, toolNames: string[]): void {
    const session = this.getOrCreateSession(sessionId);
    for (const name of toolNames) {
      session.disabledTools.add(name);
      session.enabledTools.delete(name);
    }
  }

  /**
   * Returns whether a tool is explicitly enabled for a session.
   */
  hasEnabled(sessionId: string, toolName: string): boolean {
    return this.sessions.get(sessionId)?.enabledTools.has(toolName) ?? false;
  }

  /**
   * Returns whether a tool is explicitly disabled for a session.
   */
  hasDisabled(sessionId: string, toolName: string): boolean {
    return this.sessions.get(sessionId)?.disabledTools.has(toolName) ?? false;
  }

  /**
   * Clears visibility state for a session.
   */
  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Total number of tracked sessions currently in memory.
   */
  get activeSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Sweeps and purges sessions that have exceeded the TTL limit.
   */
  cleanupExpired(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.lastActive > this.ttlMs) {
        this.sessions.delete(id);
      }
    }
  }

  /**
   * Evicts the least-recently used session entry.
   */
  private evictOldest(): void {
    const oldestKey = this.sessions.keys().next().value;
    if (oldestKey) {
      this.sessions.delete(oldestKey);
    }
  }

  /**
   * Cleans up timers and drops all session records.
   */
  destroy(): void {
    clearInterval(this.sweepTimer);
    this.sessions.clear();
  }
}
