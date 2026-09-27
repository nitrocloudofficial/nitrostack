import type { JsonType, PostHogEventProperties } from '@posthog/core';
import type { V1Batch, V1Event } from './types';
/**
 * Coerce a value to a boolean the way the capture server does, or return
 * `undefined` if it cannot be coerced (the option is then omitted so the server
 * falls back to its default). Accepts native booleans, the strings
 * `"true"`/`"1"`/`"false"`/`"0"` (trimmed, case-insensitive), and any number
 * (nonzero -> true).
 */
export declare function coerceBool(value: JsonType): boolean | undefined;
/**
 * Accept only a native string, else return `undefined` (the option is then
 * omitted). The backend's `product_tour_id` is `Option<String>`, so numbers,
 * booleans, objects, and arrays are dropped rather than coerced — matching
 * posthog-go, posthog-rs, and posthog-python exactly.
 */
export declare function coerceString(value: JsonType): string | undefined;
/**
 * Transform one already-normalized queued message into a Capture V1 wire event.
 *
 * The input message is never mutated (events may be retried or handed to
 * callbacks): a fresh `properties` map is built. Sentinel properties are lifted
 * out of `properties` (deleting the copy) into the typed `options` object and
 * the top-level `session_id`/`window_id` fields; `$lib`/`$lib_version` are
 * stripped (the server injects them from `PostHog-Sdk-Info`); top-level
 * `$set`/`$set_once` are relocated into `properties`.
 */
export declare function buildV1Event(message: PostHogEventProperties): V1Event;
/** Build a Capture V1 batch envelope from already-normalized queued messages. */
export declare function buildV1Batch(messages: PostHogEventProperties[], { createdAt, historicalMigration }: {
    createdAt: string;
    historicalMigration?: boolean;
}): V1Batch;
//# sourceMappingURL=transform.d.ts.map