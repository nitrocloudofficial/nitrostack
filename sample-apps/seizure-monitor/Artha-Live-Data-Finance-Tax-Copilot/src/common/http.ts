/**
 * Tiny keyless HTTP helper used by the funds and bank modules.
 * Node 22 ships a global `fetch`, so no extra dependency is required.
 */

export class HttpError extends Error {
    constructor(
        public readonly status: number,
        message: string,
    ) {
        super(message);
        this.name = 'HttpError';
    }
}

const DEFAULT_TIMEOUT_MS = Number(process.env.HTTP_TIMEOUT_MS ?? 10000);

/**
 * GET a URL and parse the JSON body. Throws {@link HttpError} on non-2xx
 * responses (the `status` field lets callers special-case 404 etc.).
 */
export async function httpGetJson<T>(
    url: string,
    opts: { timeoutMs?: number } = {},
): Promise<T> {
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: { accept: 'application/json' },
        });

        if (!res.ok) {
            throw new HttpError(
                res.status,
                `GET ${url} failed with ${res.status} ${res.statusText}`,
            );
        }

        return (await res.json()) as T;
    } catch (err) {
        if (err instanceof HttpError) throw err;
        if (err instanceof Error && err.name === 'AbortError') {
            throw new HttpError(408, `GET ${url} timed out after ${timeoutMs}ms`);
        }
        throw new HttpError(0, `GET ${url} failed: ${(err as Error).message}`);
    } finally {
        clearTimeout(timer);
    }
}
