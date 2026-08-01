/**
 * Media query utilities for responsive and accessible widget design
 */

function matchMediaQuery(query: string): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(query).matches;
}

function createMediaQueryFn(query: string) {
    return () => matchMediaQuery(query);
}

/**
 * Check if user prefers reduced motion
 * Use this to disable animations for accessibility
 * 
 * @example
 * const shouldAnimate = !prefersReducedMotion();
 */
export const prefersReducedMotion = createMediaQueryFn(
    '(prefers-reduced-motion: reduce)'
);

/**
 * Check if device is primarily touch-based
 * 
 * @example
 * const isTouchDevice = isPrimarilyTouchDevice();
 */
export const isPrimarilyTouchDevice = createMediaQueryFn('(pointer: coarse)');

/**
 * Check if hover is available
 * Use this to conditionally show hover states
 * 
 * @example
 * const canHover = isHoverAvailable();
 */
export const isHoverAvailable = createMediaQueryFn('(hover: hover)');

/**
 * Check if user prefers dark color scheme
 * 
 * @example
 * const prefersDark = prefersDarkColorScheme();
 */
export const prefersDarkColorScheme = createMediaQueryFn(
    '(prefers-color-scheme: dark)'
);
