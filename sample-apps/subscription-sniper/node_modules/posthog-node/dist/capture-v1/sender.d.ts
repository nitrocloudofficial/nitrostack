import { type FetchLike, type PostHogEventProperties } from '@posthog/core';
export interface V1CaptureSenderConfig {
    host: string;
    apiKey: string;
    /** Canonical `$lib` identity, materialized by the server from `PostHog-Sdk-Info`. */
    libraryId: string;
    libraryVersion: string;
    /** Value for the `User-Agent` header, if the runtime allows setting it. */
    userAgent?: string;
    historicalMigration: boolean;
    /** When true, the body is gzip-compressed (falling back to uncompressed on failure). */
    compressionEnabled: boolean;
    requestTimeoutMs: number;
    /** Total attempts, including the first (1 initial + N retries). */
    maxAttempts: number;
    /** Base exponential backoff, doubled each retry and capped at `maxBackoffMs`. */
    initialRetryDelayMs: number;
    /** Single ceiling for both the backoff schedule and the `Retry-After` clamp. */
    maxBackoffMs?: number;
    isDebug?: boolean;
}
export interface V1CaptureSenderHooks {
    fetch: FetchLike;
    /** Surfaces partial/terminal delivery failures on the client error channel. */
    onError: (error: Error) => void;
    now?: () => number;
    sleep?: (ms: number) => Promise<void>;
    generateRequestId?: () => string;
    compress?: (payload: string, isDebug?: boolean) => Promise<Blob | null>;
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
export declare class V1CaptureSender {
    private readonly config;
    private readonly maxBackoffMs;
    private readonly fetchFn;
    private readonly onError;
    private readonly now;
    private readonly sleep;
    private readonly generateRequestId;
    private readonly compress;
    constructor(config: V1CaptureSenderConfig, hooks: V1CaptureSenderHooks);
    sendV1Batch(messages: PostHogEventProperties[]): Promise<void>;
    private sendOnce;
    private buildHeaders;
    /**
     * Partition the pending events against a 2xx result map: `drop` accumulates as
     * a terminal failure, `retry` is returned for the next attempt, and
     * `ok`/`warning`/unknown/absent are terminal successes.
     */
    private classify;
    private backoffDelay;
    /** Parse `Retry-After` (delta-seconds or HTTP-date). Non-positive/past values are ignored. */
    private parseRetryAfter;
    private parseResponse;
    private buildHttpError;
    private surfaceBatchFailure;
    private surfacePartialDrops;
    private cancelBody;
}
//# sourceMappingURL=sender.d.ts.map