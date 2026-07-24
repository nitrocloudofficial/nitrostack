class CaptureV1Error extends Error {
    constructor({ requestId, drops, retryExhausted, cause }){
        super(CaptureV1Error.buildMessage(requestId, drops, retryExhausted, cause)), this.name = 'CaptureV1Error';
        this.requestId = requestId;
        this.drops = drops;
        this.retryExhausted = retryExhausted;
        this.cause = cause;
    }
    static buildMessage(requestId, drops, retryExhausted, cause) {
        let message = `Capture V1 batch ${requestId} did not fully deliver: ${drops.length} dropped, ${retryExhausted.length} undelivered`;
        if (cause instanceof Error) message += ` (${cause.message})`;
        return message;
    }
}
export { CaptureV1Error };
