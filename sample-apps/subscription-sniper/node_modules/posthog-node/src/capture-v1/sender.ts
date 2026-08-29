import {
  type FetchLike,
  type PostHogEventProperties,
  type PostHogFetchOptions,
  type PostHogFetchResponse,
  gzipCompress,
  safeJsonStringify,
  safeSetTimeout,
  uuidv7,
} from '@posthog/core'

import { CaptureV1Error, type V1DroppedEvent } from './errors'
import { buildV1Batch } from './transform'
import type { V1BatchResponse, V1Event } from './types'

const V1_ANALYTICS_PATH = '/i/v1/analytics/events'
const DEFAULT_MAX_BACKOFF_MS = 30_000

/** HTTP statuses the v1 backend wants retried. 429 is intentionally terminal in v1. */
const RETRYABLE_STATUSES = new Set([408, 500, 502, 503, 504])

export interface V1CaptureSenderConfig {
  host: string
  apiKey: string
  /** Canonical `$lib` identity, materialized by the server from `PostHog-Sdk-Info`. */
  libraryId: string
  libraryVersion: string
  /** Value for the `User-Agent` header, if the runtime allows setting it. */
  userAgent?: string
  historicalMigration: boolean
  /** When true, the body is gzip-compressed (falling back to uncompressed on failure). */
  compressionEnabled: boolean
  requestTimeoutMs: number
  /** Total attempts, including the first (1 initial + N retries). */
  maxAttempts: number
  /** Base exponential backoff, doubled each retry and capped at `maxBackoffMs`. */
  initialRetryDelayMs: number
  /** Single ceiling for both the backoff schedule and the `Retry-After` clamp. */
  maxBackoffMs?: number
  isDebug?: boolean
}

export interface V1CaptureSenderHooks {
  fetch: FetchLike
  /** Surfaces partial/terminal delivery failures on the client error channel. */
  onError: (error: Error) => void
  now?: () => number
  sleep?: (ms: number) => Promise<void>
  generateRequestId?: () => string
  compress?: (payload: string, isDebug?: boolean) => Promise<Blob | null>
}

/**
 * Sends already-normalized events to the Capture V1 endpoint
 * (`POST /i/v1/analytics/events`), owning the full attempt loop: per-event
 * partial retry, exponential backoff clamped against `Retry-After`, v1 status
 * classification, and surfacing drops / undelivered events on the error
 * channel. Used by both the batched and immediate send paths.
 *
 * Never throws for a handled outcome: after exhausting its own attempt budget it
 * reports the failure via `onError` and resolves, so the caller's queue treats
 * the batch as consumed (the internal budget replaces v0's queue-level retry).
 */
export class V1CaptureSender {
  private readonly config: V1CaptureSenderConfig
  private readonly maxBackoffMs: number
  private readonly fetchFn: FetchLike
  private readonly onError: (error: Error) => void
  private readonly now: () => number
  private readonly sleep: (ms: number) => Promise<void>
  private readonly generateRequestId: () => string
  private readonly compress: (payload: string, isDebug?: boolean) => Promise<Blob | null>

  constructor(config: V1CaptureSenderConfig, hooks: V1CaptureSenderHooks) {
    this.config = config
    this.maxBackoffMs = config.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS
    this.fetchFn = hooks.fetch
    this.onError = hooks.onError
    this.now = hooks.now ?? Date.now
    this.sleep = hooks.sleep ?? ((ms) => new Promise((resolve) => safeSetTimeout(resolve, ms)))
    this.generateRequestId = hooks.generateRequestId ?? uuidv7
    this.compress = hooks.compress ?? gzipCompress
  }

  async sendV1Batch(messages: PostHogEventProperties[]): Promise<void> {
    if (messages.length === 0) {
      return
    }

    const requestId = this.generateRequestId()
    // created_at is generated once and stays stable across every retry.
    const createdAt = new Date(this.now()).toISOString()
    const { batch } = buildV1Batch(messages, {
      createdAt,
      historicalMigration: this.config.historicalMigration,
    })

    const url = `${this.config.host}${V1_ANALYTICS_PATH}`
    const drops: V1DroppedEvent[] = []
    let pending = batch

    // Guard against a misconfigured budget (e.g. fetchRetryCount: -1): always make
    // at least one attempt so a bad config surfaces a delivery error instead of
    // silently dropping the batch without ever sending or calling onError.
    const maxAttempts = Math.max(1, this.config.maxAttempts)
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const isLastAttempt = attempt === maxAttempts
      const payload = safeJsonStringify({
        created_at: createdAt,
        ...(this.config.historicalMigration ? { historical_migration: true } : {}),
        batch: pending,
      })

      let response: PostHogFetchResponse
      try {
        response = await this.sendOnce(url, payload, attempt, requestId)
      } catch (transportError) {
        // Connection/timeout with no HTTP response: retry until the budget runs out.
        if (isLastAttempt) {
          return this.surfaceBatchFailure(requestId, drops, pending, transportError)
        }
        await this.sleep(this.backoffDelay(attempt))
        continue
      }

      const { status } = response
      if (status < 200 || status >= 300) {
        if (!isLastAttempt && RETRYABLE_STATUSES.has(status)) {
          const retryAfterMs = this.parseRetryAfter(response)
          await this.cancelBody(response)
          await this.sleep(this.backoffDelay(attempt, retryAfterMs))
          continue
        }
        const httpError = await this.buildHttpError(response, status)
        return this.surfaceBatchFailure(requestId, drops, pending, httpError)
      }

      let parsed: V1BatchResponse
      try {
        parsed = await this.parseResponse(response)
      } catch {
        // A 2xx we cannot parse is terminal — re-sending against a broken success would loop forever.
        return this.surfaceBatchFailure(
          requestId,
          drops,
          pending,
          new Error(`Capture V1 returned an unparseable ${status} response body`)
        )
      }

      const retryable = this.classify(pending, parsed, drops)
      if (retryable.length === 0) {
        return this.surfacePartialDrops(requestId, drops)
      }
      if (isLastAttempt) {
        this.onError(new CaptureV1Error({ requestId, drops, retryExhausted: retryable.map((event) => event.uuid) }))
        return
      }
      pending = retryable
      // A 200 partial-retry body can also carry Retry-After (e.g. rate-limited
      // retry events); honor it as a minimum the same way as on a retryable status.
      const retryAfterMs = this.parseRetryAfter(response)
      await this.sleep(this.backoffDelay(attempt, retryAfterMs))
    }
  }

  private async sendOnce(
    url: string,
    payload: string,
    attempt: number,
    requestId: string
  ): Promise<PostHogFetchResponse> {
    const headers = this.buildHeaders(attempt, requestId)
    let body: string | Blob = payload
    if (this.config.compressionEnabled) {
      const compressed = await this.compress(payload, this.config.isDebug)
      if (compressed !== null) {
        body = compressed
        headers['Content-Encoding'] = 'gzip'
      }
      // A codec that fails to compress falls back to sending uncompressed.
    }

    const controller = new AbortController()
    const timer = safeSetTimeout(() => controller.abort(), this.config.requestTimeoutMs)
    try {
      return await this.fetchFn(url, { method: 'POST', headers, body, signal: controller.signal })
    } finally {
      clearTimeout(timer)
    }
  }

  private buildHeaders(attempt: number, requestId: string): PostHogFetchOptions['headers'] {
    const sdkInfo = `${this.config.libraryId}/${this.config.libraryVersion}`
    const headers: { [key: string]: string } = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.config.apiKey}`,
      'PostHog-Sdk-Info': sdkInfo,
      'PostHog-Attempt': String(attempt),
      'PostHog-Request-Id': requestId,
      // Regenerated per attempt — a per-attempt wall-clock stamp, unlike Request-Id / created_at.
      'PostHog-Request-Timestamp': new Date(this.now()).toISOString(),
    }
    if (this.config.userAgent) {
      headers['User-Agent'] = this.config.userAgent
    }
    return headers
  }

  /**
   * Partition the pending events against a 2xx result map: `drop` accumulates as
   * a terminal failure, `retry` is returned for the next attempt, and
   * `ok`/`warning`/unknown/absent are terminal successes.
   */
  private classify(pending: V1Event[], parsed: V1BatchResponse, drops: V1DroppedEvent[]): V1Event[] {
    const results = parsed.results ?? {}
    const retryable: V1Event[] = []
    for (const event of pending) {
      const result = results[event.uuid]
      if (!result) {
        continue
      }
      if (result.result === 'drop') {
        drops.push({ uuid: event.uuid, details: result.details ?? undefined })
      } else if (result.result === 'retry') {
        retryable.push(event)
      }
      // ok / warning / unknown codes are terminal successes.
    }
    return retryable
  }

  private backoffDelay(attempt: number, retryAfterMs?: number): number {
    const exponential = Math.min(this.config.initialRetryDelayMs * 2 ** (attempt - 1), this.maxBackoffMs)
    if (retryAfterMs === undefined) {
      return exponential
    }
    // Retry-After is a minimum (never lets us retry earlier than our own backoff) and is clamped to the ceiling.
    return Math.max(exponential, Math.min(retryAfterMs, this.maxBackoffMs))
  }

  /** Parse `Retry-After` (delta-seconds or HTTP-date). Non-positive/past values are ignored. */
  private parseRetryAfter(response: PostHogFetchResponse): number | undefined {
    const raw = response.headers?.get('Retry-After')
    if (!raw) {
      return undefined
    }
    const trimmed = raw.trim()
    if (/^\d+$/.test(trimmed)) {
      const seconds = parseInt(trimmed, 10)
      return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : undefined
    }
    const dateMs = Date.parse(trimmed)
    if (Number.isNaN(dateMs)) {
      return undefined
    }
    const delta = dateMs - this.now()
    return delta > 0 ? delta : undefined
  }

  private async parseResponse(response: PostHogFetchResponse): Promise<V1BatchResponse> {
    const text = await response.text()
    const parsed = JSON.parse(text)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('unexpected response shape')
    }
    const results = (parsed as { results?: unknown }).results
    if (results !== undefined && (typeof results !== 'object' || results === null || Array.isArray(results))) {
      throw new Error('unexpected results shape')
    }
    return { results: (results as V1BatchResponse['results']) ?? {} }
  }

  private async buildHttpError(response: PostHogFetchResponse, status: number): Promise<Error> {
    let bodyText = ''
    try {
      bodyText = (await response.text()).slice(0, 512)
    } catch {
      // best-effort; a missing body should not mask the status
    }
    const suffix = bodyText ? `: ${bodyText}` : ''
    return new Error(`Capture V1 request failed with HTTP ${status}${suffix}`)
  }

  private surfaceBatchFailure(requestId: string, drops: V1DroppedEvent[], pending: V1Event[], cause: unknown): void {
    this.onError(new CaptureV1Error({ requestId, drops, retryExhausted: pending.map((event) => event.uuid), cause }))
  }

  private surfacePartialDrops(requestId: string, drops: V1DroppedEvent[]): void {
    if (drops.length > 0) {
      this.onError(new CaptureV1Error({ requestId, drops, retryExhausted: [] }))
    }
  }

  private async cancelBody(response: PostHogFetchResponse): Promise<void> {
    await response.body?.cancel()?.catch(() => {})
  }
}
