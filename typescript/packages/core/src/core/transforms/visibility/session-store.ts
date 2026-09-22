/**
 * Per-session visibility state recording explicit tool reveals and hides.
 */
export interface SessionVisibilityState {
  sessionId: string;
  enabledTools: Set<string>;
  disabledTools: Set<string>;
  lastActive: number;
}

interface RevocationEntry {
  tools: Set<string>;
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
  /**
   * Called when a live revocation is dropped to stay under maxSessions.
   */
  logger?: { warn(message: string, meta?: unknown): void };
}

/**
 * Manages per-session dynamic visibility state for MCP tools with memory bounds,
 * TTL expiry, and LRU pruning.
 */
export class SessionVisibilityStore {
  private readonly sessions = new Map<string, SessionVisibilityState>();
  /**
   * Explicit revokes survive LRU eviction of the session record so disableTools
   * does not fail open while the entry is still inside its TTL. The same TTL
   * sweeps them; they are also capped at maxSessions.
   */
  private readonly revocations = new Map<string, RevocationEntry>();
  private readonly ttlMs: number;
  private readonly maxSessions: number;
  private readonly sweepTimer: NodeJS.Timeout;
  private logger?: { warn(message: string, meta?: unknown): void };

  constructor(options: SessionVisibilityStoreOptions = {}) {
    this.ttlMs = (options.ttlMinutes ?? 60) * 60 * 1000;
    this.maxSessions = options.maxSessions ?? 10000;
    this.logger = options.logger;
    const sweepIntervalMs = (options.sweepIntervalSeconds ?? 300) * 1000;

    // Periodic sweep with unref to avoid keeping Node.js event loop open
    this.sweepTimer = setInterval(() => this.cleanupExpired(), sweepIntervalMs);
    if (typeof this.sweepTimer.unref === 'function') {
      this.sweepTimer.unref();
    }
  }

  setLogger(logger: { warn(message: string, meta?: unknown): void }): void {
    this.logger = logger;
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
        disabledTools: new Set(this.liveRevocation(sessionId)?.tools ?? []),
        lastActive: Date.now(),
      };
      this.sessions.set(sessionId, state);
    } else {
      state.lastActive = Date.now();
      // Re-insert to maintain LRU access order
      this.sessions.delete(sessionId);
      this.sessions.set(sessionId, state);
    }
    this.touchRevocation(sessionId);
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
      this.touchRevocation(sessionId);
    }
    return state;
  }

  /**
   * Explicitly enables (reveals) tools for a given session.
   */
  enableTools(sessionId: string, toolNames: string[]): void {
    const session = this.getOrCreateSession(sessionId);
    const revoked = this.liveRevocation(sessionId);
    for (const name of toolNames) {
      session.enabledTools.add(name);
      session.disabledTools.delete(name);
      revoked?.tools.delete(name);
    }
    if (revoked && revoked.tools.size === 0) {
      this.revocations.delete(sessionId);
    } else if (revoked) {
      this.touchRevocation(sessionId);
    }
  }

  /**
   * Explicitly disables (hides) tools for a given session.
   */
  disableTools(sessionId: string, toolNames: string[]): void {
    const session = this.getOrCreateSession(sessionId);
    let revoked = this.liveRevocation(sessionId);
    if (!revoked) {
      this.makeRevocationRoom();
      revoked = { tools: new Set<string>(), lastActive: Date.now() };
    }
    for (const name of toolNames) {
      session.disabledTools.add(name);
      session.enabledTools.delete(name);
      revoked.tools.add(name);
    }
    revoked.lastActive = Date.now();
    this.revocations.delete(sessionId);
    this.revocations.set(sessionId, revoked);
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
    if (this.liveRevocation(sessionId)?.tools.has(toolName)) return true;
    return this.sessions.get(sessionId)?.disabledTools.has(toolName) ?? false;
  }

  /**
   * True when this session still has at least one unexpired revocation.
   * Used after the session record itself has been evicted.
   */
  hasRevocations(sessionId: string): boolean {
    const entry = this.liveRevocation(sessionId);
    return !!entry && entry.tools.size > 0;
  }

  /**
   * Clears visibility state for a session.
   */
  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.revocations.delete(sessionId);
  }

  /**
   * Total number of tracked sessions currently in memory.
   */
  get activeSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Sweeps and purges sessions and revocations that have exceeded the TTL limit.
   */
  cleanupExpired(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.lastActive > this.ttlMs) {
        this.sessions.delete(id);
      }
    }
    for (const [id, entry] of this.revocations.entries()) {
      if (now - entry.lastActive > this.ttlMs) {
        this.revocations.delete(id);
      }
    }
  }

  /**
   * Evicts the least-recently used session entry.
   * Revocations are left in place until their own TTL.
   */
  private evictOldest(): void {
    const oldestKey = this.sessions.keys().next().value;
    if (oldestKey) {
      this.sessions.delete(oldestKey);
    }
  }

  private liveRevocation(sessionId: string): RevocationEntry | undefined {
    const entry = this.revocations.get(sessionId);
    if (!entry) return undefined;
    if (Date.now() - entry.lastActive > this.ttlMs) {
      this.revocations.delete(sessionId);
      return undefined;
    }
    return entry;
  }

  private touchRevocation(sessionId: string): void {
    const entry = this.liveRevocation(sessionId);
    if (!entry) return;
    entry.lastActive = Date.now();
    this.revocations.delete(sessionId);
    this.revocations.set(sessionId, entry);
  }

  /**
   * Drops expired revocations first. If the map is still at the cap, drops the
   * oldest live entry so a new revoke can be recorded.
   */
  private makeRevocationRoom(): void {
    if (this.revocations.size < this.maxSessions) return;
    const now = Date.now();
    for (const [id, entry] of [...this.revocations]) {
      if (this.revocations.size < this.maxSessions) return;
      if (now - entry.lastActive > this.ttlMs) {
        this.revocations.delete(id);
      }
    }
    if (this.revocations.size < this.maxSessions) return;
    const oldest = this.revocations.keys().next().value;
    if (!oldest) return;
    this.revocations.delete(oldest);
    this.logger?.warn(
      `Session visibility revocation cap (${this.maxSessions}) exceeded; dropped oldest revocation`,
      { sessionId: oldest }
    );
  }

  /**
   * Cleans up timers and drops all session records.
   */
  destroy(): void {
    clearInterval(this.sweepTimer);
    this.sessions.clear();
    this.revocations.clear();
  }
}
