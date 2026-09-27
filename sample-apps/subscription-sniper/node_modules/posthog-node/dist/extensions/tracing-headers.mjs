const TRACING_HEADER_MAX_LENGTH = 1000;
const TRACING_HEADER_CONTROL_CHARS_REGEX = /[\x00-\x1f\x7f-\x9f]/g;
const POSTHOG_TRACING_HEADERS = {
    sessionId: 'x-posthog-session-id',
    distinctId: 'x-posthog-distinct-id'
};
function addProperty(properties, key, value) {
    if (null != value && '' !== value) properties[key] = value;
}
function getFirstHeaderValue(value) {
    return Array.isArray(value) ? value[0] : value;
}
function sanitizeTracingHeaderValue(value) {
    if (Array.isArray(value)) {
        for (const item of value){
            const sanitized = sanitizeTracingHeaderValue(item);
            if (void 0 !== sanitized) return sanitized;
        }
        return;
    }
    if ('string' != typeof value) return;
    const sanitized = value.replace(TRACING_HEADER_CONTROL_CHARS_REGEX, '').trim();
    if (!sanitized) return;
    return sanitized.length > TRACING_HEADER_MAX_LENGTH ? sanitized.slice(0, TRACING_HEADER_MAX_LENGTH) : sanitized;
}
function getPostHogTracingHeaderValues(headers) {
    if (!headers) return {};
    const sessionId = sanitizeTracingHeaderValue(headers[POSTHOG_TRACING_HEADERS.sessionId]);
    const distinctId = sanitizeTracingHeaderValue(headers[POSTHOG_TRACING_HEADERS.distinctId]);
    return {
        ...void 0 !== sessionId ? {
            sessionId
        } : {},
        ...void 0 !== distinctId ? {
            distinctId
        } : {}
    };
}
export { POSTHOG_TRACING_HEADERS, addProperty, getFirstHeaderValue, getPostHogTracingHeaderValues, sanitizeTracingHeaderValue };
