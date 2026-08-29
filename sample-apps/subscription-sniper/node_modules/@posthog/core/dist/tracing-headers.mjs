import { isFunction } from "./utils/type-utils.mjs";
const DISTINCT_ID_HEADER = 'X-POSTHOG-DISTINCT-ID';
const SESSION_ID_HEADER = 'X-POSTHOG-SESSION-ID';
const PATCH_MARKER = '__posthog_tracing_headers_patched__';
const parseHostname = (url)=>{
    try {
        return new URL(url).hostname;
    } catch  {
        return;
    }
};
const shouldAddHeaders = (url, hostnames)=>{
    const hostname = parseHostname(url);
    if (!hostname) return false;
    return hostnames.includes(hostname);
};
const patchFetchForTracingHeaders = (client, hostnames)=>{
    const globalAny = globalThis;
    const currentFetch = globalAny.fetch;
    if (!isFunction(currentFetch)) return ()=>{};
    const originalFetch = currentFetch[PATCH_MARKER]?.original ?? currentFetch;
    const wrappedFetch = async function(input, init) {
        try {
            const urlString = 'string' == typeof input ? input : input instanceof URL ? input.toString() : input instanceof Request ? input.url : void 0;
            if (urlString && shouldAddHeaders(urlString, hostnames)) {
                const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : void 0));
                const distinctId = client.getDistinctId();
                const sessionId = client.getSessionId();
                if (distinctId) headers.set(DISTINCT_ID_HEADER, distinctId);
                if (sessionId) headers.set(SESSION_ID_HEADER, sessionId);
                const initWithHeaders = {
                    ...init ?? {},
                    headers
                };
                return originalFetch.call(globalAny, input, initWithHeaders);
            }
        } catch  {}
        return originalFetch.call(globalAny, input, init);
    };
    Object.defineProperty(wrappedFetch, PATCH_MARKER, {
        value: {
            original: originalFetch
        },
        enumerable: false
    });
    globalAny.fetch = wrappedFetch;
    return ()=>{
        if (globalAny.fetch === wrappedFetch) globalAny.fetch = originalFetch;
    };
};
export { patchFetchForTracingHeaders };
