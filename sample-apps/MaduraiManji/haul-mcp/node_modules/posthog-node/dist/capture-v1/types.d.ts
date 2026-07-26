import type { PostHogEventProperties } from '@posthog/core';
/**
 * Typed `options` object on a Capture V1 event. Legacy `$`-prefixed sentinel
 * properties are lifted here (renamed + strictly typed) by the transform.
 * Always serialized as an object (`{}` when empty), never `null`.
 */
export interface V1EventOptions {
    cookieless_mode?: boolean;
    disable_skew_correction?: boolean;
    process_person_profile?: boolean;
    product_tour_id?: string;
}
/**
 * A single event in a Capture V1 batch (`POST /i/v1/analytics/events`).
 * `session_id`/`window_id` are promoted from the `$session_id`/`$window_id`
 * sentinels; there is no top-level `api_key`.
 */
export interface V1Event {
    event: string;
    uuid: string;
    distinct_id: string;
    timestamp: string;
    session_id?: string;
    window_id?: string;
    options: V1EventOptions;
    properties: PostHogEventProperties;
}
/**
 * The Capture V1 batch envelope. Unlike v0 there is no `api_key` (Bearer auth)
 * and no `sent_at`. `historical_migration` is omitted when false.
 */
export interface V1Batch {
    created_at: string;
    historical_migration?: boolean;
    batch: V1Event[];
}
/**
 * Per-event result codes in a v1 2xx response body. Unknown strings are
 * tolerated as terminal success for forward compatibility.
 */
export type V1ResultCode = 'ok' | 'warning' | 'drop' | 'retry';
export interface V1EventResult {
    result: V1ResultCode | string;
    details?: string | null;
}
/** Shape of a v1 2xx response body: a per-uuid map of results. */
export interface V1BatchResponse {
    results: Record<string, V1EventResult>;
}
//# sourceMappingURL=types.d.ts.map