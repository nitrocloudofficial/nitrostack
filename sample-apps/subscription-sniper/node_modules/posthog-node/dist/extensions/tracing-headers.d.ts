import type { IncomingHttpHeaders } from 'node:http';
type HeaderValue = IncomingHttpHeaders[string];
export declare const POSTHOG_TRACING_HEADERS: {
    readonly sessionId: "x-posthog-session-id";
    readonly distinctId: "x-posthog-distinct-id";
};
export interface PostHogTracingHeaderValues {
    sessionId?: string;
    distinctId?: string;
}
export declare function addProperty(properties: Record<string, any>, key: string, value: unknown): void;
export declare function getFirstHeaderValue(value: HeaderValue): string | undefined;
export declare function sanitizeTracingHeaderValue(value: HeaderValue): string | undefined;
export declare function getPostHogTracingHeaderValues(headers?: IncomingHttpHeaders): PostHogTracingHeaderValues;
export {};
//# sourceMappingURL=tracing-headers.d.ts.map