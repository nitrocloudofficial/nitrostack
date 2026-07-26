export class Sanitizer {
    static rules = [
        // Bearer Tokens
        /Bearer\s+[A-Za-z0-9\-\._~\+\/]+=*/g,
        // AWS Keys (AKIA, ASIA, etc.)
        /(?<![A-Z0-9])[A-Z0-9]{20}(?![A-Z0-9])/g,
        // AWS Secret Access Keys (approx 40 chars)
        /(?<![A-Za-z0-9/+=])[A-Za-z0-9/+=]{40}(?![A-Za-z0-9/+=])/g,
        // JWTs (header.payload.signature)
        /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
        // Generic passwords in URLs (e.g., postgres://user:password@host)
        /(?<=:\/\/[^:]+:)[^@]+(?=@)/g
    ];
    /**
     * Scrubs sensitive information from a given string.
     */
    static scrub(input) {
        if (!input)
            return input;
        let sanitized = input;
        for (const rule of this.rules) {
            sanitized = sanitized.replace(rule, '[REDACTED_SECRET]');
        }
        return sanitized;
    }
    /**
     * Helper to scrub objects by converting them to string, scrubbing, and parsing back (if possible).
     * Note: Useful for deep objects, but might break if [REDACTED_SECRET] violates structure (e.g. inside numbers).
     * We primarily use it for strings.
     */
    static scrubObject(obj) {
        if (typeof obj === 'string') {
            return this.scrub(obj);
        }
        try {
            const str = JSON.stringify(obj);
            const scrubbedStr = this.scrub(str);
            return JSON.parse(scrubbedStr);
        }
        catch {
            // Fallback if parsing fails or circular ref
            return this.scrub(String(obj));
        }
    }
}
