// Re-export OTLP/log types from @posthog/types so the rest of the logs module can
// pull everything from one place.
export type {
  LogSeverityLevel,
  OtlpSeverityText,
  OtlpSeverityEntry,
  LogAttributeValue,
  LogAttributes,
  CaptureLogOptions,
  OtlpAnyValue,
  OtlpKeyValue,
  OtlpLogRecord,
  OtlpLogsPayload,
  BeforeSendLogFn,
} from '@posthog/types'

/**
 * SDK-internal context the host SDK passes to `buildOtlpLogRecord` at capture
 * time. Each SDK populates the fields that apply to it: browser fills
 * `currentUrl`, mobile fills `screenName` / `appState`. Missing fields are
 * omitted from the OTLP record (no stray attributes).
 *
 * Internal to `@posthog/core` — customers don't see this in autocomplete.
 */
export interface LogSdkContext {
  distinctId?: string
  sessionId?: string
  /** Web-only — current window id */
  windowId?: string
  /** Web-only — ms epoch when the current session started */
  sessionStartTimestamp?: number
  /** Web-only — ms epoch of the most recent session activity */
  lastActivityTimestamp?: number
  /** Web-only — current page URL */
  currentUrl?: string
  /** Mobile-only — current screen / view name */
  screenName?: string
  /** Mobile-only — app foreground/background state at capture time */
  appState?: 'foreground' | 'background'
  activeFeatureFlags?: string[]
}

// The public capture-logger interface lives in @posthog/types as `Logger`. Core
// also exports a `Logger` (the SDK's internal warn/info/error logger). Alias the
// public one to avoid the name collision inside this package.
import type { Logger as CaptureLoggerType } from '@posthog/types'
export type CaptureLogger = CaptureLoggerType

import type {
  LogAttributeValue,
  CaptureLogOptions,
  OtlpLogRecord,
  OtlpLogsPayload,
  BeforeSendLogFn,
} from '@posthog/types'
import type { PostHogPersistedProperty } from '../types'
import type { SendLogsBatchOutcome } from '../posthog-core-stateless'

export interface BufferedLogEntry {
  record: OtlpLogRecord
}

/**
 * The minimal host surface `PostHogLogs` depends on. `PostHogCoreStateless`
 * satisfies it structurally (mobile/node); the browser supplies an adapter
 * backed by its own persistence and request layer.
 */
export interface LogsHost {
  readonly isDisabled: boolean
  readonly optedOut: boolean
  getPersistedProperty<T>(key: PostHogPersistedProperty): T | undefined
  setPersistedProperty<T>(key: PostHogPersistedProperty, value: T | null): void
  _sendLogsBatch(payload: OtlpLogsPayload): Promise<SendLogsBatchOutcome>
  getLibraryId(): string
  getLibraryVersion(): string
}

/**
 * Configuration for the logs feature on `new PostHog(key, { logs: ... })`.
 * All fields are optional; per-SDK defaults apply (mobile vs browser tune
 * differently for cellular cost vs tab-suspension behavior).
 */
export interface PostHogLogsConfig {
  /**
   * Service name attached to every record as the OTLP `service.name`
   * resource attribute. Used by the Logs UI for filtering / grouping.
   * Defaults to `'unknown_service'` when unset.
   */
  serviceName?: string

  /**
   * Service version attached as OTLP `service.version`. Useful for
   * correlating regressions to specific app releases.
   */
  serviceVersion?: string

  /**
   * Deployment environment attached as OTLP `deployment.environment`
   * (e.g. `'production'`, `'staging'`, `'dev'`).
   */
  environment?: string

  /**
   * Extra OTLP resource attributes attached to every record. Spread first;
   * SDK-controlled keys (`service.name`, `telemetry.sdk.*`, RN's `os.*`)
   * are layered on top so users cannot accidentally clobber them. Use the
   * dedicated `serviceName` / `environment` / `serviceVersion` fields to
   * override those keys.
   */
  resourceAttributes?: Record<string, LogAttributeValue>

  /**
   * How often the periodic background flush fires (ms). Records also flush
   * eagerly when the buffer fills, on AppState changes (RN), and on
   * `shutdown()`. Lower values trade battery/bandwidth for fresher data.
   * Default: 10000 (RN) / 3000 (browser).
   */
  flushIntervalMs?: number

  /**
   * Number of buffered records that triggers an immediate flush. Records also
   * flush on the periodic interval and on `shutdown()`. The queue can grow past
   * this while an async flush is in flight (e.g. during a synchronous burst); a
   * separate, larger memory backstop evicts the oldest only once the queue
   * exceeds the per-interval rate cap. Default: 100.
   */
  maxBufferSize?: number

  /**
   * Max records per outbound POST. Keeps each request under the server's
   * 2 MB cap. On a 413 response, the SDK halves this value, retries the
   * same records, then ramps back up by 1 per healthy send. A 413 on a
   * single-record batch drops the record (it's larger than the server can
   * accept regardless of batch size). Default: 50 (RN) / 100 (browser).
   */
  maxBatchRecordsPerPost?: number

  /**
   * Tumbling-window rate cap. Bounds how many records can be captured
   * within a sliding (technically tumbling) time window. Records exceeding
   * the cap are dropped synchronously at `captureLog()` (they never enter
   * the buffer or consume bandwidth). A single warn line is logged per
   * window when the cap is hit.
   *
   * Defaults are per-SDK; on RN the default is `{ maxLogs: 500, windowMs:
   * 10000 }` (≈50 logs/sec ceiling, tuned for cellular bandwidth).
   *
   * @example Allow brief bursts up to 1000/min
   * ```ts
   * logs: { rateCap: { maxLogs: 1000, windowMs: 60000 } }
   * ```
   *
   * @example Disable the cap entirely (unbounded)
   * ```ts
   * logs: { rateCap: { maxLogs: undefined } }
   * ```
   */
  rateCap?: {
    /**
     * Max records accepted per `windowMs` window. `undefined` = unbounded.
     */
    maxLogs?: number
    /**
     * Window length in ms. Tumbling, not sliding — the counter resets the
     * first time a capture fires after the window expires.
     */
    windowMs?: number
  }

  /**
   * Pre-send filter. See {@link BeforeSendLogFn} for shape and examples.
   * Configure as a single function or a chain.
   */
  beforeSend?: BeforeSendLogFn | BeforeSendLogFn[]
}

// Fields PostHogLogs needs resolved at runtime. The host SDK fills in its
// defaults and hands the resolved config to the PostHogLogs constructor.
// Flat names internally — public API uses `rateCap: { maxLogs, windowMs }`.
export interface ResolvedPostHogLogsConfig extends Omit<PostHogLogsConfig, 'rateCap'> {
  maxBufferSize: number
  // Eviction cap: the queue drops the oldest record once it exceeds this. Separate
  // from `maxBufferSize` (the flush trigger) so a burst is held, not evicted, while
  // the async flush drains. Defaults to `maxBufferSize` when unset.
  maxQueueSize?: number
  flushIntervalMs: number
  maxBatchRecordsPerPost: number
  rateCapWindowMs: number
  maxLogsPerInterval?: number
  backgroundFlushBudgetMs: number
  terminationFlushBudgetMs: number
}
