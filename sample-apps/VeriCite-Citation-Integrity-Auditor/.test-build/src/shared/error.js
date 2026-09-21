/**
 * ============================================================
 * VeriCite - Custom Error Classes
 * ============================================================
 */
export class VeriCiteError extends Error {
    /**
     * Whether retrying the failed operation could plausibly succeed.
     * Subclasses override this; the retry helper reads it via
     * `isRetryable()` instead of pattern-matching on error messages.
     */
    retryable = false;
    constructor(message) {
        super(message);
        this.name = "VeriCiteError";
    }
}
/* ------------------------------------------------------------
 * PDF / Extraction Errors
 * ---------------------------------------------------------- */
export class DocumentParsingError extends VeriCiteError {
    constructor(message = "Failed to parse uploaded document.") {
        super(message);
        this.name = "DocumentParsingError";
    }
}
export class ClaimExtractionError extends VeriCiteError {
    constructor(message = "Unable to extract claims from document.") {
        super(message);
        this.name = "ClaimExtractionError";
    }
}
export class CitationExtractionError extends VeriCiteError {
    constructor(message = "Unable to extract citations.") {
        super(message);
        this.name = "CitationExtractionError";
    }
}
/* ------------------------------------------------------------
 * Verification Errors
 * ---------------------------------------------------------- */
export class CitationNotFoundError extends VeriCiteError {
    constructor(message = "Citation could not be located.") {
        super(message);
        this.name = "CitationNotFoundError";
    }
}
export class VerificationFailedError extends VeriCiteError {
    constructor(message = "Citation verification failed.") {
        super(message);
        this.name = "VerificationFailedError";
    }
}
export class ProviderTimeoutError extends VeriCiteError {
    retryable = true;
    constructor(provider, timeoutMs) {
        super(timeoutMs === undefined
            ? `${provider} request timed out.`
            : `${provider} request timed out after ${timeoutMs}ms.`);
        this.name = "ProviderTimeoutError";
    }
}
export class ProviderUnavailableError extends VeriCiteError {
    retryable = true;
    constructor(provider, detail) {
        super(detail === undefined
            ? `${provider} is currently unavailable.`
            : `${provider} is currently unavailable: ${detail}`);
        this.name = "ProviderUnavailableError";
    }
}
/** Provider answered, but the payload could not be understood. */
export class ProviderResponseError extends VeriCiteError {
    retryable = false;
    constructor(provider, detail) {
        super(`${provider} returned an unusable response: ${detail}`);
        this.name = "ProviderResponseError";
    }
}
/** Caller-supplied input failed validation. Never retryable. */
export class InvalidInputError extends VeriCiteError {
    retryable = false;
    constructor(message = "Input failed validation.") {
        super(message);
        this.name = "InvalidInputError";
    }
}
/* ------------------------------------------------------------
 * LLM Errors
 * ---------------------------------------------------------- */
export class LLMResponseError extends VeriCiteError {
    constructor(message = "LLM returned an invalid response.") {
        super(message);
        this.name = "LLMResponseError";
    }
}
/* ------------------------------------------------------------
 * Audit Errors
 * ---------------------------------------------------------- */
export class AuditFailedError extends VeriCiteError {
    constructor(message = "Audit execution failed.") {
        super(message);
        this.name = "AuditFailedError";
    }
}
export class InvalidDocumentError extends VeriCiteError {
    constructor(message = "Uploaded document is invalid.") {
        super(message);
        this.name = "InvalidDocumentError";
    }
}
/* ------------------------------------------------------------
 * Retry policy
 * ---------------------------------------------------------- */
/**
 * Decide whether a failed operation is worth retrying.
 *
 * Replaces the previous `msg.startsWith('Invalid') || msg === ''`
 * string-sniffing gate, which silently treated any error with an
 * empty message as permanent and retried genuinely permanent
 * validation errors whose text happened not to start with "Invalid".
 *
 * Unknown (non-VeriCite) errors are treated as retryable, because
 * the common unknown case is a transient network fault.
 */
export function isRetryable(error) {
    if (error instanceof VeriCiteError) {
        return error.retryable;
    }
    // Node/undici surfaces transport faults as plain Errors with a
    // `code` property. Treat well-known permanent codes as final.
    if (error instanceof Error) {
        const code = error.code;
        if (code === "ERR_INVALID_URL" || code === "ABORT_ERR") {
            return false;
        }
        return true;
    }
    return false;
}
/** Normalise any thrown value into a serialisable shape for reports. */
export function describeError(error) {
    if (error instanceof Error) {
        return { name: error.name, message: error.message };
    }
    return { name: "UnknownError", message: String(error) };
}
//# sourceMappingURL=error.js.map