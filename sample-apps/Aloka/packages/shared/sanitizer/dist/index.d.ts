export declare class Sanitizer {
    private static readonly rules;
    /**
     * Scrubs sensitive information from a given string.
     */
    static scrub(input: string): string;
    /**
     * Helper to scrub objects by converting them to string, scrubbing, and parsing back (if possible).
     * Note: Useful for deep objects, but might break if [REDACTED_SECRET] violates structure (e.g. inside numbers).
     * We primarily use it for strings.
     */
    static scrubObject<T>(obj: T): T | string;
}
