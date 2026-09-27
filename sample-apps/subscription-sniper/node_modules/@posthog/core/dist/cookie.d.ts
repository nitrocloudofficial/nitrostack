/**
 * Minimal cookie-reading interface compatible with Next.js `cookies()`,
 * `request.cookies`, and plain objects.
 */
export interface CookieStore {
    get(name: string): {
        value: string;
    } | undefined;
}
/**
 * Adapts a raw `Cookie` header string into a {@link CookieStore}.
 */
export declare function cookieStoreFromHeader(cookieHeader: string): CookieStore;
export interface PostHogCookieState {
    distinctId: string;
    isIdentified: boolean;
    sessionId?: string;
    deviceId?: string;
}
/**
 * Returns the PostHog cookie name for the given API key.
 *
 * PostHog-js stores state in a cookie named `ph_<sanitized_token>_posthog`.
 * The token is sanitized by replacing `+` with `PL`, `/` with `SL`, `=` with `EQ`.
 *
 * @param apiKey - The PostHog project API key
 * @returns The cookie name string
 */
export declare function getPostHogCookieName(apiKey: string): string;
/**
 * Serializes an anonymous ID into the JSON format posthog-js expects.
 *
 * When `distinct_id === $device_id`, posthog-js treats the user as anonymous.
 *
 * @param anonymousId - The anonymous distinct ID to serialize
 * @returns JSON string suitable for the PostHog cookie value
 */
export declare function serializePostHogCookie(anonymousId: string): string;
/**
 * Reads and parses the PostHog cookie from a cookie store.
 *
 * Compatible with Next.js `cookies()`, `request.cookies`, and any object
 * with a `get(name)` method that returns `{ value: string } | undefined`.
 */
export declare function readPostHogCookie(cookies: CookieStore, apiKey: string): PostHogCookieState | null;
/**
 * Converts cookie state into PostHog properties (e.g. `$session_id`, `$device_id`).
 */
export declare function cookieStateToProperties(state: PostHogCookieState | null): Record<string, string> | undefined;
/**
 * Parses a PostHog cookie value and extracts identity information.
 *
 * The cookie value is a JSON object containing `distinct_id` and `$user_state`.
 * A user is considered identified if `$user_state` is `'identified'`.
 *
 * @param cookieValue - The raw cookie string value
 * @returns Parsed identity state, or null if the cookie is missing/invalid
 */
export declare function parsePostHogCookie(cookieValue: string): PostHogCookieState | null;
export interface ConsentCookieConfig {
    consent_persistence_name?: string | null;
    opt_out_capturing_cookie_prefix?: string | null;
}
export declare function getConsentCookieName(apiKey: string, config?: ConsentCookieConfig): string;
export interface ConsentConfig extends ConsentCookieConfig {
    opt_out_capturing_by_default?: boolean;
}
export declare function isOptedOut(cookies: CookieStore, apiKey: string, config?: ConsentConfig): boolean;
//# sourceMappingURL=cookie.d.ts.map