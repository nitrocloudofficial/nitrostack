/**
 * Hints from sources outside the User-Agent string. These let us identify Brave
 * on desktop / Android — Chromium-based with no UA marker, but it exposes
 * `navigator.brave`. (Brave on iOS is detected via its `Brave/X` UA marker —
 * WebKit doesn't expose `navigator.brave` — so no hint is needed there.)
 */
export interface BrowserDetectionHints {
    brave?: boolean;
}
/**
 * Opt-in tweaks to UA-string detection. These change how existing traffic is
 * attributed, so the host SDK gates them (behind its `2026-05-30` config
 * defaults) rather than enabling them unconditionally — turning one on
 * reattributes browsers that were previously reported as something else.
 */
export interface BrowserDetectionOptions {
    detectGoogleSearchApp?: boolean;
}
/**
 * This function detects which browser is running this script.
 * The order of the checks are important since many user agents
 * include keywords used in later checks.
 *
 * `hints` is an optional bag of out-of-band signals (`navigator.brave`) used to
 * detect browsers that intentionally do not identify themselves in the UA
 * string. When omitted, only UA-string detection runs — preserving the previous
 * behaviour.
 *
 * `options` toggles opt-in UA-detection tweaks (see `BrowserDetectionOptions`).
 */
export declare const detectBrowser: (user_agent: string, vendor: string | undefined, hints?: BrowserDetectionHints, options?: BrowserDetectionOptions) => string;
/**
 * This function detects which browser version is running this script,
 * parsing major and minor version (e.g., 42.1). User agent strings from:
 * http://www.useragentstring.com/pages/useragentstring.php
 *
 * `navigator.vendor` is passed in and used to help with detecting certain browsers
 * NB `navigator.vendor` is deprecated and not present in every browser
 */
export declare const detectBrowserVersion: (userAgent: string, vendor: string | undefined, hints?: BrowserDetectionHints, options?: BrowserDetectionOptions) => number | null;
export declare const detectOS: (user_agent: string) => [string, string];
export declare const detectDevice: (user_agent: string) => string;
export declare const detectDeviceType: (user_agent: string, options?: {
    userAgentDataPlatform?: string;
    maxTouchPoints?: number;
    screenWidth?: number;
    screenHeight?: number;
    devicePixelRatio?: number;
}) => string;
//# sourceMappingURL=user-agent-utils.d.ts.map