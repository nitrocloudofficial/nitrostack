/**
 * Minimal contract the tracing-headers patch needs from a PostHog client:
 * something that can report the current distinct and session ids.
 */
export interface TracingHeadersClient {
    getDistinctId(): string;
    getSessionId(): string;
}
/**
 * Patches `globalThis.fetch` to inject `X-POSTHOG-DISTINCT-ID` and
 * `X-POSTHOG-SESSION-ID` headers on requests whose hostname matches `hostnames`.
 *
 * Used by SDKs that run in environments with a WHATWG `fetch` (posthog-react-native,
 * posthog-web) to link outgoing requests to the PostHog session — e.g. to link LLM
 * traces captured by a backend to a frontend session replay.
 *
 * The wrapped fetch is tagged with a non-enumerable marker so that calling this
 * again (on HMR, tests, or a second PostHog instance) unwraps the previous patch
 * before rewrapping — preventing patches from stacking. Returns a function that
 * restores the original fetch when called.
 */
export declare const patchFetchForTracingHeaders: (client: TracingHeadersClient, hostnames: string[]) => (() => void);
//# sourceMappingURL=tracing-headers.d.ts.map