// ============================================================================
// Project Aegis — Circuit Breaker
// Monitors downstream connection health and trips to immediately return
// clean 503 exceptions when failure rates breach the configured threshold
// within a sliding time window.
//
// State machine: CLOSED → OPEN → HALF_OPEN → CLOSED (or back to OPEN)
// ============================================================================

/**
 * The three states of the circuit breaker state machine.
 */
export enum CircuitState {
  /** Normal operation — all requests flow through. */
  CLOSED = 'CLOSED',
  /** Circuit tripped — requests are immediately rejected with 503. */
  OPEN = 'OPEN',
  /** Probing — a single request is allowed through to test recovery. */
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Custom error thrown when the circuit breaker is OPEN and requests are rejected.
 */
export class CircuitOpenError extends Error {
  public readonly statusCode = 503;
  public readonly retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super(`Service Unavailable — circuit breaker is OPEN. Retry after ${retryAfterMs}ms.`);
    this.name = 'CircuitOpenError';
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Configuration options for the circuit breaker.
 */
export interface CircuitBreakerOptions {
  /** Failure rate threshold (0.0 – 1.0) to trip the breaker. Default: 0.5 (50%). */
  failureThreshold?: number;
  /** Sliding window duration in milliseconds. Default: 10,000 (10s). */
  windowMs?: number;
  /** Cooldown period in OPEN state before transitioning to HALF_OPEN. Default: 15,000 (15s). */
  cooldownMs?: number;
  /** Minimum number of requests in the window before threshold evaluation. Default: 5. */
  minimumRequests?: number;
}

/**
 * An individual outcome record within the sliding window.
 */
interface OutcomeRecord {
  readonly timestamp: number;
  readonly success: boolean;
}

/**
 * Metrics snapshot for the circuit breaker's operational state.
 */
export interface CircuitBreakerMetrics {
  /** Current state of the circuit. */
  state: CircuitState;
  /** Total successful requests. */
  successCount: number;
  /** Total failed requests. */
  failureCount: number;
  /** Total requests rejected while OPEN. */
  rejectedCount: number;
  /** Current failure rate in the active window (0.0 – 1.0). */
  currentFailureRate: number;
  /** Milliseconds until the circuit transitions from OPEN to HALF_OPEN (0 if not OPEN). */
  timeToHalfOpenMs: number;
}

/**
 * CircuitBreaker monitors downstream service health using a sliding time window.
 * When the failure rate exceeds the configured threshold, the circuit trips to OPEN,
 * immediately rejecting all requests with a `CircuitOpenError` (503).
 *
 * After a cooldown period, the circuit transitions to HALF_OPEN and allows a single
 * probe request. If the probe succeeds, the circuit closes. If it fails, the circuit
 * re-opens for another cooldown cycle.
 *
 * @example
 * ```typescript
 * const breaker = new CircuitBreaker({
 *   failureThreshold: 0.5,
 *   windowMs: 10_000,
 *   cooldownMs: 15_000,
 * });
 *
 * try {
 *   const result = await breaker.execute(() => callKYCService(payload));
 * } catch (err) {
 *   if (err instanceof CircuitOpenError) {
 *     // Return 503 to caller, suggest retry after err.retryAfterMs
 *   }
 * }
 * ```
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private readonly outcomes: OutcomeRecord[] = [];
  private openedAt: number | null = null;
  private halfOpenInProgress = false;

  // Configuration
  private readonly failureThreshold: number;
  private readonly windowMs: number;
  private readonly cooldownMs: number;
  private readonly minimumRequests: number;

  // Metrics
  private _successCount = 0;
  private _failureCount = 0;
  private _rejectedCount = 0;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 0.5;
    this.windowMs = options.windowMs ?? 10_000;
    this.cooldownMs = options.cooldownMs ?? 15_000;
    this.minimumRequests = options.minimumRequests ?? 5;
  }

  /**
   * Execute a function through the circuit breaker.
   *
   * - CLOSED: request flows through normally; outcomes are recorded.
   * - OPEN: request is immediately rejected with CircuitOpenError.
   * - HALF_OPEN: a single probe request is allowed through.
   *
   * @param fn - The downstream operation to protect
   * @returns The result of `fn`
   * @throws CircuitOpenError if the circuit is OPEN
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Prune stale outcomes outside the sliding window
    this.pruneOutcomes();

    switch (this.state) {
      case CircuitState.OPEN:
        return this.handleOpenState(fn);

      case CircuitState.HALF_OPEN:
        return this.handleHalfOpenState(fn);

      case CircuitState.CLOSED:
      default:
        return this.handleClosedState(fn);
    }
  }

  /**
   * Returns the current state of the circuit.
   */
  getState(): CircuitState {
    // Check for automatic OPEN → HALF_OPEN transition
    if (this.state === CircuitState.OPEN && this.openedAt !== null) {
      const elapsed = Date.now() - this.openedAt;
      if (elapsed >= this.cooldownMs) {
        this.state = CircuitState.HALF_OPEN;
        this.halfOpenInProgress = false;
      }
    }
    return this.state;
  }

  /**
   * Force the circuit to a specific state (for testing/manual override).
   */
  forceState(newState: CircuitState): void {
    this.state = newState;
    if (newState === CircuitState.OPEN) {
      this.openedAt = Date.now();
    } else {
      this.openedAt = null;
    }
    this.halfOpenInProgress = false;
  }

  /**
   * Returns current operational metrics.
   */
  getMetrics(): CircuitBreakerMetrics {
    this.pruneOutcomes();
    const currentState = this.getState();

    let timeToHalfOpenMs = 0;
    if (currentState === CircuitState.OPEN && this.openedAt !== null) {
      const elapsed = Date.now() - this.openedAt;
      timeToHalfOpenMs = Math.max(0, this.cooldownMs - elapsed);
    }

    return {
      state: currentState,
      successCount: this._successCount,
      failureCount: this._failureCount,
      rejectedCount: this._rejectedCount,
      currentFailureRate: this.calculateFailureRate(),
      timeToHalfOpenMs,
    };
  }

  /**
   * Reset the circuit breaker to its initial state and clear all metrics.
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.outcomes.length = 0;
    this.openedAt = null;
    this.halfOpenInProgress = false;
    this._successCount = 0;
    this._failureCount = 0;
    this._rejectedCount = 0;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // State Handlers
  // ──────────────────────────────────────────────────────────────────────────

  private async handleClosedState<T>(fn: () => Promise<T>): Promise<T> {
    try {
      const result = await fn();
      this.recordOutcome(true);
      return result;
    } catch (error) {
      this.recordOutcome(false);
      this.evaluateThreshold();
      throw error;
    }
  }

  private async handleOpenState<T>(fn: () => Promise<T>): Promise<T> {
    // Check if cooldown has elapsed → transition to HALF_OPEN
    if (this.openedAt !== null) {
      const elapsed = Date.now() - this.openedAt;
      if (elapsed >= this.cooldownMs) {
        this.state = CircuitState.HALF_OPEN;
        this.halfOpenInProgress = false;
        return this.handleHalfOpenState(fn);
      }

      // Still in cooldown — reject immediately
      this._rejectedCount++;
      throw new CircuitOpenError(this.cooldownMs - elapsed);
    }

    this._rejectedCount++;
    throw new CircuitOpenError(this.cooldownMs);
  }

  private async handleHalfOpenState<T>(fn: () => Promise<T>): Promise<T> {
    // Only allow one probe request through at a time
    if (this.halfOpenInProgress) {
      this._rejectedCount++;
      throw new CircuitOpenError(1000);
    }

    this.halfOpenInProgress = true;

    try {
      const result = await fn();
      // Probe succeeded → close the circuit
      this.state = CircuitState.CLOSED;
      this.openedAt = null;
      this.halfOpenInProgress = false;
      this.outcomes.length = 0; // Reset window on recovery
      this.recordOutcome(true);
      return result;
    } catch (error) {
      // Probe failed → re-open the circuit
      this.state = CircuitState.OPEN;
      this.openedAt = Date.now();
      this.halfOpenInProgress = false;
      this.recordOutcome(false);
      throw error;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Internal Utilities
  // ──────────────────────────────────────────────────────────────────────────

  private recordOutcome(success: boolean): void {
    this.outcomes.push({ timestamp: Date.now(), success });
    if (success) {
      this._successCount++;
    } else {
      this._failureCount++;
    }
  }

  private pruneOutcomes(): void {
    const cutoff = Date.now() - this.windowMs;
    while (this.outcomes.length > 0 && this.outcomes[0].timestamp < cutoff) {
      this.outcomes.shift();
    }
  }

  private calculateFailureRate(): number {
    if (this.outcomes.length === 0) return 0;
    const failures = this.outcomes.filter((o) => !o.success).length;
    return failures / this.outcomes.length;
  }

  private evaluateThreshold(): void {
    if (this.outcomes.length < this.minimumRequests) return;

    const failureRate = this.calculateFailureRate();
    if (failureRate >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.openedAt = Date.now();
    }
  }
}
