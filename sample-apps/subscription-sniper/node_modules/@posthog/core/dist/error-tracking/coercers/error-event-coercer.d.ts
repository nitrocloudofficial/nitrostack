import { CoercingContext, ErrorTrackingCoercer, ExceptionLike } from '../types';
interface ErrorEventLike {
    message: string;
    error?: unknown;
}
export declare class ErrorEventCoercer implements ErrorTrackingCoercer<ErrorEventLike> {
    constructor();
    match(err: unknown): err is ErrorEventLike;
    coerce(err: ErrorEventLike, ctx: CoercingContext): ExceptionLike;
}
export {};
//# sourceMappingURL=error-event-coercer.d.ts.map