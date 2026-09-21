/** A single event the server explicitly rejected (`drop`). */
export interface V1DroppedEvent {
    uuid: string;
    details?: string;
}
export interface CaptureV1ErrorParams {
    requestId: string;
    /** Events the server rejected outright (billing/validation). */
    drops: V1DroppedEvent[];
    /** UUIDs of events still pending `retry` after the attempt budget was exhausted, or lost to a batch-level failure. */
    retryExhausted: string[];
    /** The underlying transport/HTTP/parse failure, when the whole batch failed. */
    cause?: unknown;
}
/**
 * Surfaced on the client error channel whenever a Capture V1 batch did not
 * fully deliver: some events were `drop`ped, some `retry` events outlived the
 * attempt budget, or the batch hit a terminal transport/HTTP/parse failure.
 *
 * A 2xx with drops is still a partial failure and is reported here — a
 * successful HTTP status does not mean every event was accepted.
 */
export declare class CaptureV1Error extends Error {
    name: string;
    readonly requestId: string;
    readonly drops: V1DroppedEvent[];
    readonly retryExhausted: string[];
    cause?: unknown;
    constructor({ requestId, drops, retryExhausted, cause }: CaptureV1ErrorParams);
    private static buildMessage;
}
//# sourceMappingURL=errors.d.ts.map