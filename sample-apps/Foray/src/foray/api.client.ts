/**
 * FORAY — thin HTTP client onto the Python backend.
 *
 * DELIBERATE DESIGN NOTE, defend this in Q&A:
 *
 *   The MCP tools hold NO business logic. They are a permission-scoped
 *   surface over the Python core. Clustering, the k-anonymity gate, mastery
 *   EMA and efficacy counting all stay in /core/ where they are
 *   deterministic and testable. Putting logic here would fork the truth.
 *
 * No SQLite driver on purpose: a native module build (better-sqlite3) on
 * Windows at 3am is exactly the dependency that breaks on install, and
 * foray_plan.md §13 rules those out. Node 18+ has global fetch, so this
 * file adds ZERO dependencies.
 */

const BASE = process.env.FORAY_API_URL ?? 'http://127.0.0.1:8000';

async function request<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<T> {
  const url = `${BASE}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (cause) {
    // The single most likely failure at 3am: the Python API is not running.
    // Say so in words, do not surface a bare ECONNREFUSED.
    throw new Error(
      `Foray API unreachable at ${BASE}. Is the Python backend running? ` +
        `(uvicorn api.main:app --reload)`,
      { cause },
    );
  }
  if (!res.ok) {
    throw new Error(`Foray API ${method} ${path} → ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export const api = {
  get:  <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
};

/**
 * Write an AccessLog row. Called by the Warden on EVERY denial.
 *
 * Never throws: a logging failure must not convert a DENY into an error the
 * caller could mistake for a transient fault. The denial stands regardless.
 */
export async function writeAccessLog(row: {
  actor_role: string;
  attempted: string;
  decision: 'ALLOWED' | 'DENIED';
  rule: string;
  req_id: string;
  ts: string;
}): Promise<void> {
  try {
    await api.post('/internal/access-log', row);
  } catch {
    /* swallowed on purpose — see above */
  }
}
