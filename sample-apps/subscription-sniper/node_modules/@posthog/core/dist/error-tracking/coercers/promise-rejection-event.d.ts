import { CoercingContext, ErrorTrackingCoercer, ExceptionLike } from '../types';
interface PromiseRejectionEventLike {
    reason: unknown;
}
interface EventWithDetailReason {
    detail: {
        reason: unknown;
    };
}
type RejectionLike = PromiseRejectionEventLike | EventWithDetailReason;
export declare class PromiseRejectionEventCoercer implements ErrorTrackingCoercer<RejectionLike> {
    match(err: unknown): err is RejectionLike;
    private isCustomEventWrappingRejection;
    coerce(err: RejectionLike, ctx: CoercingContext): ExceptionLike | undefined;
    private getUnhandledRejectionReason;
}
export {};
//# sourceMappingURL=promise-rejection-event.d.ts.map