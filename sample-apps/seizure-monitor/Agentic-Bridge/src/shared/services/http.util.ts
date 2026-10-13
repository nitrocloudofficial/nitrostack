/**
 * The one outbound-HTTP primitive the live integrations share.
 *
 * Every enterprise call in this server (Jira, Slack) is a JSON request that can
 * fail in four distinguishable ways, and an LLM reading a tool result needs to
 * know which one happened: a timeout means "retry"; a 401 means "your token is
 * wrong"; a 404 means "your board/channel id is wrong"; a Slack `ok:false`
 * means "the API accepted the request and refused it". Collapsing those into a
 * thrown Error loses the distinction, so this returns a discriminated result
 * and leaves the decision to the caller — the same shape LlmService already
 * uses for provider failures.
 *
 * Native `fetch` and `AbortSignal.timeout` only. No SDK, no retry policy, no
 * agent pooling: the calls are one-shot reads on the request path of a tool.
 */

export type HttpFailureKind = 'timeout' | 'network' | 'http' | 'parse' | 'api';

export interface HttpFailure {
  kind: HttpFailureKind;
  /** HTTP status, when the response arrived at all. */
  status?: number;
  message: string;
  /** First part of the response body, redacted. Diagnostic only. */
  body?: string;
}

export type HttpResult<T> = { ok: true; data: T; status: number } | { ok: false; failure: HttpFailure };

/** Default ceiling for any single outbound call. Shared with the pipeline effects. */
export const HTTP_TIMEOUT_MS = Number(process.env.BRIDGE_HTTP_TIMEOUT_MS ?? 20_000);

/** How much of an error body survives into a tool response. */
const BODY_EXCERPT_CHARS = 400;

/**
 * Anything that looks like a credential is scrubbed before it can reach a tool
 * response, a log line or the knowledge base. Jira and Slack both echo request
 * context in their error bodies, and Slack tokens are structurally obvious.
 */
const SECRET_PATTERNS: RegExp[] = [
  /xox[baprs]-[A-Za-z0-9-]{8,}/g, // Slack bot/user/app tokens
  /gh[pousr]_[A-Za-z0-9]{16,}/g, // GitHub tokens
  /\bBearer\s+[A-Za-z0-9._~+/-]{12,}=*/gi,
  /\bBasic\s+[A-Za-z0-9+/]{12,}=*/gi,
  /\b[A-Za-z0-9._%+-]+:[^@\s/]{6,}@/g, // credentials embedded in a URL
];

export function redact(text: string): string {
  return SECRET_PATTERNS.reduce((acc, pattern) => acc.replace(pattern, '[redacted]'), text);
}

export interface FetchJsonOptions {
  timeoutMs?: number;
  /** Prefixed to every failure message so the caller knows which API spoke. */
  label?: string;
}

/**
 * GET/POST JSON with a hard deadline.
 *
 * Never throws: a DNS failure, a socket reset, an abort and a 500 all come back
 * as `{ ok: false }`. Callers render the failure with `describeHttpFailure`.
 */
export async function fetchJson<T = unknown>(
  url: string,
  init: RequestInit = {},
  options: FetchJsonOptions = {}
): Promise<HttpResult<T>> {
  const timeoutMs = options.timeoutMs ?? HTTP_TIMEOUT_MS;
  const label = options.label ?? 'HTTP';

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { Accept: 'application/json', ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    // AbortSignal.timeout rejects with a TimeoutError DOMException; undici
    // wraps connection problems in a TypeError with a `cause`.
    const name = (error as { name?: string }).name;
    if (name === 'TimeoutError' || name === 'AbortError') {
      return {
        ok: false,
        failure: {
          kind: 'timeout',
          message: `${label} did not respond within ${timeoutMs}ms`,
        },
      };
    }
    const cause = (error as { cause?: { code?: string; message?: string } }).cause;
    const detail = cause?.code ?? cause?.message ?? (error instanceof Error ? error.message : String(error));
    return {
      ok: false,
      failure: { kind: 'network', message: `${label} unreachable: ${redact(String(detail))}` },
    };
  }

  const raw = await response.text().catch(() => '');

  if (!response.ok) {
    return {
      ok: false,
      failure: {
        kind: 'http',
        status: response.status,
        message: `${label} returned ${response.status} ${response.statusText}`,
        body: excerpt(raw),
      },
    };
  }

  if (!raw.trim()) return { ok: true, data: undefined as T, status: response.status };

  try {
    return { ok: true, data: JSON.parse(raw) as T, status: response.status };
  } catch {
    return {
      ok: false,
      failure: {
        kind: 'parse',
        status: response.status,
        message: `${label} returned a ${response.status} that was not JSON`,
        body: excerpt(raw),
      },
    };
  }
}

/** Basic-auth header value for `email:token` style credentials. */
export function basicAuth(user: string, secret: string): string {
  return `Basic ${Buffer.from(`${user}:${secret}`).toString('base64')}`;
}

/**
 * Turn a failure into the sentence a tool puts in front of an LLM. Status codes
 * get an actionable gloss because "401" alone does not tell the model which of
 * the three Jira variables is wrong.
 */
export function describeHttpFailure(failure: HttpFailure): string {
  const base = failure.message;
  switch (failure.status) {
    case 401:
      return `${base} — the credential was rejected. Check the email/token pair.`;
    case 403:
      return `${base} — authenticated, but not permitted. The token is missing a scope or the account lacks access.`;
    case 404:
      return `${base} — the resource does not exist. Check the board id / channel id / host.`;
    case 429:
      return `${base} — rate limited. Wait and retry.`;
    default:
      return failure.body ? `${base}: ${failure.body}` : base;
  }
}

function excerpt(raw: string): string | undefined {
  const trimmed = redact(raw.replace(/\s+/g, ' ').trim());
  if (!trimmed) return undefined;
  return trimmed.length > BODY_EXCERPT_CHARS ? `${trimmed.slice(0, BODY_EXCERPT_CHARS)}…` : trimmed;
}
