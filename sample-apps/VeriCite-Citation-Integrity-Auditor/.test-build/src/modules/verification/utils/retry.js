/**
 * VeriCite – Verification Engine
 * utils/retry.ts — Generic exponential back-off retry helper
 */
import { createLogger } from "./logger.js";
const logger = createLogger("retry");
function computeDelay(attempt, base, cap, jitter) {
    // Exponential: base * 2^attempt
    const exponential = Math.min(base * Math.pow(2, attempt), cap);
    // Jitter: ± jitter * exponential
    const jitterAmount = exponential * jitter * (Math.random() * 2 - 1);
    return Math.max(0, Math.round(exponential + jitterAmount));
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Executes `fn` with exponential back-off retry on failure.
 *
 * @param fn        Async function to execute.
 * @param options   RetryOptions to control retry behaviour.
 * @returns         Resolved value of `fn`.
 * @throws          Last error if all attempts are exhausted.
 */
export async function withRetry(fn, options = {}) {
    const { maxAttempts = 3, baseDelayMs = 300, maxDelayMs = 10_000, jitter = 0.2, isRetryable = () => true, } = options;
    let lastError;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            return await fn();
        }
        catch (err) {
            lastError = err;
            const isLastAttempt = attempt === maxAttempts - 1;
            if (isLastAttempt || !isRetryable(err, attempt)) {
                logger.warn(`Attempt ${attempt + 1}/${maxAttempts} failed — not retrying`, {
                    error: err instanceof Error ? err.message : String(err),
                });
                throw err;
            }
            const delay = computeDelay(attempt, baseDelayMs, maxDelayMs, jitter);
            logger.warn(`Attempt ${attempt + 1}/${maxAttempts} failed — retrying in ${delay}ms`, {
                error: err instanceof Error ? err.message : String(err),
            });
            await sleep(delay);
        }
    }
    // This line is unreachable but TypeScript needs it for exhaustive control-flow.
    throw lastError;
}
/**
 * Predicate factory: only retry on HTTP 429 (rate-limit) or 5xx errors from Axios.
 */
export function isAxiosRetryable(err) {
    // Check if it's an Axios-like error with a response status
    const anyErr = err;
    if (anyErr && typeof anyErr === "object" && "response" in anyErr) {
        const response = anyErr["response"];
        if (response?.status !== undefined) {
            const { status } = response;
            return status === 429 || (status >= 500 && status < 600);
        }
    }
    // Network errors (no response) are always retryable
    return true;
}
//# sourceMappingURL=retry.js.map