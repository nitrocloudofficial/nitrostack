import error_tracking from "./error-tracking/index.mjs";
import { addProperty, getFirstHeaderValue, getPostHogTracingHeaderValues } from "./tracing-headers.mjs";
import { normalizeRequestCurrentUrl, normalizeRequestPath } from "./url-utils.mjs";
function getClientIp(req) {
    const forwarded = getFirstHeaderValue(req.headers['x-forwarded-for']);
    if (forwarded) {
        const ip = forwarded.split(',')[0].trim();
        if (ip) return ip;
    }
    return req.socket?.remoteAddress;
}
function buildRequestContextData(posthog, req) {
    const { sessionId, distinctId } = getPostHogTracingHeaderValues(req.headers);
    const properties = {};
    const disableCaptureUrlHashes = true === posthog.options.disable_capture_url_hashes;
    addProperty(properties, '$current_url', normalizeRequestCurrentUrl(req.originalUrl || req.url, disableCaptureUrlHashes));
    addProperty(properties, '$request_method', req.method);
    addProperty(properties, '$request_path', normalizeRequestPath(req.path, disableCaptureUrlHashes));
    addProperty(properties, '$user_agent', getFirstHeaderValue(req.headers['user-agent']));
    addProperty(properties, '$ip', getClientIp(req));
    return {
        ...void 0 !== sessionId ? {
            sessionId
        } : {},
        ...void 0 !== distinctId ? {
            distinctId
        } : {},
        properties
    };
}
function setupExpressRequestContext(_posthog, app) {
    app.use(posthogRequestContext(_posthog));
}
function posthogRequestContext(posthog) {
    return (req, _res, next)=>{
        posthog.withContext(buildRequestContextData(posthog, req), ()=>next());
    };
}
function setupExpressErrorHandler(_posthog, app) {
    app.use(posthogErrorHandler(_posthog));
}
function posthogErrorHandler(posthog) {
    return (error, req, res, next)=>{
        if (error_tracking.isPreviouslyCapturedError(error)) return void next(error);
        const contextData = buildRequestContextData(posthog, req);
        const syntheticException = new Error('Synthetic exception');
        const hint = {
            mechanism: {
                type: 'middleware',
                handled: false
            },
            syntheticException
        };
        const additionalProperties = {
            ...void 0 !== contextData.sessionId ? {
                $session_id: contextData.sessionId
            } : {},
            ...contextData.properties || {},
            $response_status_code: res.statusCode
        };
        posthog.addPendingPromise(error_tracking.buildEventMessage(posthog.getErrorPropertiesBuilder(), error, hint, contextData.distinctId, additionalProperties).then((msg)=>posthog._capturePreparedEvent(msg, false)));
        next(error);
    };
}
export { setupExpressErrorHandler, setupExpressRequestContext };
