import type { JsonType } from '../types';
export declare function includes(str: string, needle: string): boolean;
export declare function includes<T>(arr: T[], needle: T): boolean;
export declare const trim: (str: string) => string;
export declare const stripLeadingDollar: (s: string) => string;
export declare function isDistinctIdStringLike(value: string): boolean;
export declare function safeJsonStringify(value: unknown): string;
/**
 * Creates a hash string from distinct_id and person properties.
 * Used to detect if person properties have changed to avoid duplicate $set events.
 * Uses sorted keys to ensure consistent ordering regardless of object construction order.
 */
export declare function getPersonPropertiesHash(distinct_id: string, userPropertiesToSet?: {
    [key: string]: JsonType;
}, userPropertiesToSetOnce?: {
    [key: string]: JsonType;
}): string;
//# sourceMappingURL=string-utils.d.ts.map