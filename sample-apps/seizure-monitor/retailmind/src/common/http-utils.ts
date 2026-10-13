const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 400;

/**
 * True for failures that are worth retrying: network blips, timeouts,
 * upstream rate limiting, and 5xx. Client errors (400/401/403) are
 * deterministic — retrying them just wastes time and quota.
 */
function isRetryable(err: unknown): boolean {
  if (!(err instanceof HttpError)) return true; // network/abort errors
  if (err.status === 429) return true;
  return err.status >= 500;
}

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * GET JSON with a timeout and bounded retries on transient failures.
 *
 * A single analyze() run makes ~10 upstream calls, and the planner fails the
 * whole analysis if any one of them rejects — so without retries a brief
 * network blip on any single call kills an otherwise good run. Retrying
 * transient failures makes that far less likely, without ever inventing data.
 */
export async function fetchJsonWithRetry<T>(
  url: string,
  context: string,
  timeoutMs: number,
  maxAttempts: number = MAX_ATTEMPTS
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fetchJsonOnce<T>(url, context, timeoutMs);
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === maxAttempts) break;
      await delay(BASE_BACKOFF_MS * attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function fetchJsonOnce<T>(url: string, context: string, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`${context} request timed out after ${timeoutMs}ms.`);
    }
    throw new Error(
      `${context} request failed: ${err instanceof Error ? err.message : String(err)}`
    );
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 401 || response.status === 403) {
    throw new HttpError(
      `${context} rejected (HTTP ${response.status}) — check that GEOAPIFY_API_KEY is valid.`,
      response.status
    );
  }

  if (response.status === 429) {
    throw new HttpError(
      `${context} rate limit exceeded (HTTP 429). Please wait and try again.`,
      429
    );
  }

  if (!response.ok) {
    throw new HttpError(
      `${context} failed with HTTP ${response.status} ${response.statusText}.`,
      response.status
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new Error(`${context} returned a response that could not be parsed as JSON.`);
  }
}
