/**
 * Shared fetch helper. Every external call (openFDA, RxNorm) goes through
 * this so the 10-second timeout / AbortController / try-catch behavior is
 * defined exactly once instead of duplicated per tool.
 *
 * Never throws for network/HTTP problems — callers get a discriminated
 * result and decide what "not found" or "upstream error" means for them.
 * This is what lets every tool return a structured {found:false} instead of
 * an unhandled exception.
 */

export type FetchResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; reason: "timeout" | "network" | "http_error" | "parse_error"; status?: number; message: string };

const DEFAULT_TIMEOUT_MS = 10_000;

export async function fetchJsonWithTimeout<T = unknown>(
  url: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<FetchResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });

    if (!res.ok) {
      // openFDA returns 404 for "no matches" — that is a normal, expected
      // outcome for this domain, not a server failure, so callers treat
      // http_error + status 404 as "no data" rather than surfacing an error.
      return {
        ok: false,
        reason: "http_error",
        status: res.status,
        message: `Upstream responded with HTTP ${res.status}`,
      };
    }

    try {
      const data = (await res.json()) as T;
      return { ok: true, status: res.status, data };
    } catch {
      return { ok: false, reason: "parse_error", message: "Response body was not valid JSON" };
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, reason: "timeout", message: `Request timed out after ${timeoutMs}ms` };
    }
    return {
      ok: false,
      reason: "network",
      message: err instanceof Error ? err.message : "Unknown network error",
    };
  } finally {
    clearTimeout(timer);
  }
}

/** URL-encode a drug/condition name and wrap it in quotes for an exact-phrase openFDA search clause. */
export function quotedSearchTerm(term: string): string {
  return encodeURIComponent(`"${term}"`);
}

export function rawSearchTerm(term: string): string {
  return encodeURIComponent(term);
}
