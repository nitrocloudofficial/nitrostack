import { isBuiltin, isEvent, isPrimitive } from "../../utils/index.mjs";
class PromiseRejectionEventCoercer {
    match(err) {
        return isBuiltin(err, 'PromiseRejectionEvent') || this.isCustomEventWrappingRejection(err);
    }
    isCustomEventWrappingRejection(err) {
        if (!isEvent(err)) return false;
        try {
            const detail = err.detail;
            return null != detail && 'object' == typeof detail && 'reason' in detail;
        } catch  {
            return false;
        }
    }
    coerce(err, ctx) {
        const reason = this.getUnhandledRejectionReason(err);
        if (isPrimitive(reason)) return {
            type: 'UnhandledRejection',
            value: `Non-Error promise rejection captured with value: ${String(reason)}`,
            stack: ctx.syntheticException?.stack,
            synthetic: true
        };
        return ctx.apply(reason);
    }
    getUnhandledRejectionReason(error) {
        try {
            if ('reason' in error) return error.reason;
            if ('detail' in error && null != error.detail && 'object' == typeof error.detail && 'reason' in error.detail) return error.detail.reason;
        } catch  {}
        return error;
    }
}
export { PromiseRejectionEventCoercer };
