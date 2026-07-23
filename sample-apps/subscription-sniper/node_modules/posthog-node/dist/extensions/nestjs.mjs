import { throwError } from "rxjs";
import { catchError } from "rxjs/operators";
import error_tracking from "./error-tracking/index.mjs";
import { addProperty, getFirstHeaderValue, getPostHogTracingHeaderValues } from "./tracing-headers.mjs";
import { normalizeRequestCurrentUrl, normalizeRequestPath } from "./url-utils.mjs";
function getClientIp(headers, request) {
    const forwarded = getFirstHeaderValue(headers['x-forwarded-for']);
    if (forwarded) {
        const ip = forwarded.split(',')[0].trim();
        if (ip) return ip;
    }
    return request?.socket?.remoteAddress;
}
function getExceptionStatus(exception) {
    if (exception && 'object' == typeof exception && 'getStatus' in exception && 'function' == typeof exception.getStatus) {
        const status = exception.getStatus();
        return 'number' == typeof status ? status : void 0;
    }
}
class PostHogInterceptor {
    constructor(posthog, options){
        this.posthog = posthog;
        const capture = options?.captureExceptions;
        this.captureExceptions = !!capture;
        this.minStatusToCapture = ('object' == typeof capture ? capture.minStatusToCapture : void 0) ?? 500;
    }
    intercept(context, next) {
        const httpHost = context.switchToHttp();
        const request = httpHost.getRequest();
        const response = httpHost.getResponse();
        const headers = request?.headers ?? {};
        const { sessionId, distinctId } = getPostHogTracingHeaderValues(headers);
        const properties = {};
        const disableCaptureUrlHashes = true === this.posthog.options.disable_capture_url_hashes;
        addProperty(properties, '$current_url', normalizeRequestCurrentUrl(request?.url, disableCaptureUrlHashes));
        addProperty(properties, '$request_method', request?.method);
        addProperty(properties, '$request_path', normalizeRequestPath(request?.path ?? request?.url, disableCaptureUrlHashes));
        addProperty(properties, '$user_agent', getFirstHeaderValue(headers['user-agent']));
        addProperty(properties, '$ip', getClientIp(headers, request));
        const contextData = {
            ...void 0 !== sessionId ? {
                sessionId
            } : {},
            ...void 0 !== distinctId ? {
                distinctId
            } : {},
            properties
        };
        this.posthog.enterContext(contextData);
        let source = next.handle();
        if (this.captureExceptions) source = source.pipe(catchError((exception)=>{
            if (error_tracking.isPreviouslyCapturedError(exception)) return throwError(()=>exception);
            const status = getExceptionStatus(exception);
            if (void 0 !== status && status < this.minStatusToCapture) return throwError(()=>exception);
            const responseStatus = status ?? response?.statusCode;
            const additionalProperties = void 0 !== responseStatus ? {
                $response_status_code: responseStatus
            } : void 0;
            this.posthog.captureException(exception, distinctId, additionalProperties);
            return throwError(()=>exception);
        }));
        return source;
    }
}
export { PostHogInterceptor };
