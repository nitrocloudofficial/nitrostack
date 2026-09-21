import { addUncaughtExceptionListener, addUnhandledRejectionListener } from "./autocapture.mjs";
import { BucketedRateLimiter, isObject, resolveExceptionRateLimiterConfig } from "@posthog/core";
const SHUTDOWN_TIMEOUT = 2000;
class ErrorTracking {
    constructor(client, options, _logger){
        this.client = client;
        this._exceptionAutocaptureEnabled = options.enableExceptionAutocapture || false;
        this._logger = _logger;
        this._rateLimiter = new BucketedRateLimiter({
            ...resolveExceptionRateLimiterConfig(options),
            refillInterval: 10000,
            _logger: this._logger
        });
        this.startAutocaptureIfEnabled();
    }
    static isPreviouslyCapturedError(x) {
        return isObject(x) && '__posthog_previously_captured_error' in x && true === x.__posthog_previously_captured_error;
    }
    static async buildEventMessage(builder, error, hint, distinctId, additionalProperties) {
        const properties = {
            ...additionalProperties
        };
        const exceptionProperties = builder.buildFromUnknown(error, hint);
        exceptionProperties.$exception_list = await builder.modifyFrames(exceptionProperties.$exception_list);
        return {
            event: '$exception',
            distinctId: distinctId,
            properties: {
                ...exceptionProperties,
                ...properties
            },
            _originatedFromCaptureException: true
        };
    }
    startAutocaptureIfEnabled() {
        if (this.isEnabled()) {
            addUncaughtExceptionListener(this.onException.bind(this), this.onFatalError.bind(this));
            addUnhandledRejectionListener(this.onException.bind(this));
        }
    }
    onException(exception, hint) {
        this.client.addPendingPromise((async ()=>{
            if (!ErrorTracking.isPreviouslyCapturedError(exception)) {
                const eventMessage = await ErrorTracking.buildEventMessage(this.client.getErrorPropertiesBuilder(), exception, hint);
                const exceptionProperties = eventMessage.properties;
                const exceptionType = exceptionProperties?.$exception_list[0]?.type ?? 'Exception';
                const isRateLimited = this._rateLimiter.consumeRateLimit(exceptionType);
                if (isRateLimited) return void this._logger.info('Skipping exception capture because of client rate limiting.', {
                    exception: exceptionType
                });
                return this.client._capturePreparedEvent(eventMessage, false);
            }
        })());
    }
    async onFatalError(exception) {
        console.error(exception);
        await this.client.shutdown(SHUTDOWN_TIMEOUT);
        globalThis.process.exit(1);
    }
    isEnabled() {
        return !this.client.isDisabled && this._exceptionAutocaptureEnabled;
    }
    shutdown() {
        this._rateLimiter.stop();
    }
}
export { ErrorTracking as default };
