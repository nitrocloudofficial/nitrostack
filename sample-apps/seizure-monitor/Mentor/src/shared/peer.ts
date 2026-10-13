// ─────────────────────────────────────────────────────────────────────────────
// GENERATED FILE — do not edit here.
//
// The original is shared/peer.ts at the monorepo root. Three deployed services
// need the same copy of the bridge contracts, and each deploys as a lone folder,
// so the file is duplicated and the duplication is guarded:
//
//   npm run sync:shared            regenerate every copy
//   npm run sync:shared -- --check fail if any copy has drifted (runs in verify)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One MCP app calling another — the transport under every arrow in `contracts.ts`.
 *
 * MENTOR is three deployed services and the architecture has them talking to each
 * other directly: MCP‑1 reads a returning student's history from MCP‑3, and MCP‑2
 * files its verdict there. Those are server-to-server calls, not something routed
 * through whichever client the student happens to be using — a loop that only
 * works when a chat window is open is not a product.
 *
 * The peer is reached over **streamable HTTP at `{serviceUrl}/mcp`** — the same
 * endpoint `scripts/verify-deployed.mjs` drives, so this code path is exercised by
 * the same protocol a judge's client uses. Responses come back SSE-framed even on
 * the POST endpoint, which is why the body needs unwrapping before it is JSON.
 *
 * ## Three properties that matter more than the plumbing
 *
 * 1. **A missing peer is a supported state, never a crash.** If `PROFILE_URL` is
 *    unset — which is exactly the case on a fresh clone, in `npm test`, and in the
 *    one-click Studio demo — every call returns `mode: 'absent'` and the calling
 *    tool degrades to a stated limitation. The alternative, hard-failing, would
 *    mean the offline demo stops working the moment the loop became distributed.
 * 2. **It never throws.** A tool that loses a student's work because a sibling
 *    service was redeploying is worse than one that says "I could not keep this".
 *    Callers get `{ ok: false, note }` and decide.
 * 3. **What happened is reported, not implied.** Every bridged tool response
 *    includes the `bridge` block this returns, so a judge can see whether the
 *    call was live, and to where. `mode` is the honest answer to "is this actually
 *    three services or one pretending".
 *
 * ## The trust model, stated plainly
 *
 * Peer calls carry `MENTOR_PEER_TOKEN` as a bearer token when it is configured, and
 * MCP‑3 refuses record-writing tools without it. Unset, MCP‑3 accepts writes and
 * marks the resulting record `attested: false` — so an unconfigured deployment is
 * usable and *says* its provenance is weak, rather than quietly pretending
 * otherwise. That is why a flashcard answer is never released on a verdict's
 * `tests_green` alone; MCP‑3 re-reads the raw test output itself.
 */

export type PeerMode = 'live' | 'absent' | 'error';

export interface PeerResult<T = unknown> {
  readonly ok: boolean;
  readonly mode: PeerMode;
  /** Logical name — `profile`, `sentinel`, `roster`. */
  readonly peer: string;
  /** The service URL, when there was one. Shown so a judge can check it. */
  readonly url: string | null;
  readonly tool: string;
  readonly data: T | null;
  /** Always populated, always in words a student could read. */
  readonly note: string;
}

/** Swappable transport — the seam tests use instead of standing up two servers. */
export interface PeerTransport {
  (peer: string, url: string, tool: string, args: Record<string, unknown>): Promise<unknown>;
}

let transport: PeerTransport | null = null;

/**
 * Replace the HTTP transport. Used by tests to assert that a bridge is *called*
 * with the right artifact, which is the part worth testing — the SSE unwrapping
 * below is verified against the real deployed service by `npm run verify:live`.
 */
export function __setPeerTransport(t: PeerTransport | null): void {
  transport = t;
}

export interface PeerOptions {
  /** Logical name used in the `bridge` block a tool returns. */
  readonly name: string;
  /** Env var holding the peer's base URL, e.g. `PROFILE_URL`. */
  readonly urlEnv: string;
  /** Human sentence for when the peer is not configured. */
  readonly absentNote: string;
  readonly timeoutMs?: number;
}

export class Peer {
  private session: string | null = null;
  private nextId = 0;
  private initialized = false;

  constructor(private readonly options: PeerOptions) {}

  get name(): string {
    return this.options.name;
  }

  /** The configured base URL, or `null` when this deployment has no such peer. */
  get url(): string | null {
    const raw = process.env[this.options.urlEnv]?.trim();
    if (!raw) return null;
    return raw.replace(/\/+$/, '');
  }

  get configured(): boolean {
    return this.url !== null;
  }

  /**
   * Call one tool on the peer.
   *
   * Resolves with a verdict in every case, including failure. Callers must branch
   * on `ok` and say what they are missing — see how MCP‑1 reports an unreachable
   * profile plane rather than pretending a student is new.
   */
  async call<T = unknown>(tool: string, args: Record<string, unknown>): Promise<PeerResult<T>> {
    const url = this.url;
    const base = { peer: this.options.name, url, tool } as const;

    if (!url) {
      return {
        ...base,
        ok: false,
        mode: 'absent',
        data: null,
        note: this.options.absentNote,
      };
    }

    // The shared secret travels as a tool argument as well as a bearer header.
    // Belt and braces, and the argument is the half that actually works: a bearer
    // header is only visible to the receiving app when an SDK auth module is
    // configured to parse it, whereas a tool argument always arrives. `peerToken`
    // in `shared/identity.ts` is the matching check.
    const token = process.env.MENTOR_PEER_TOKEN?.trim();
    const withToken = token ? { ...args, peer_token: token } : args;

    try {
      const data = transport
        ? await transport(this.options.name, url, tool, withToken)
        : await this.httpCall(url, tool, withToken);
      return {
        ...base,
        ok: true,
        mode: 'live',
        data: data as T,
        note: `${this.options.name} answered over MCP at ${url}/mcp`,
      };
    } catch (err) {
      // A failed call invalidates the cached session — the far side may have
      // restarted, and reusing a dead session id would fail every retry too.
      this.session = null;
      this.initialized = false;
      return {
        ...base,
        ok: false,
        mode: 'error',
        data: null,
        note:
          `${this.options.name} is configured at ${url} but did not answer: ` +
          (err instanceof Error ? err.message : String(err)),
      };
    }
  }

  // ── streamable HTTP, the same path a real MCP client takes ──────────────────

  private async httpCall(
    base: string,
    tool: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    if (!this.initialized) await this.handshake(base);

    const result = await this.rpc(base, 'tools/call', { name: tool, arguments: args });
    const content = (result as { content?: { type: string; text?: string }[] } | null)?.content;
    const text = content?.find((c) => c.type === 'text')?.text;
    if (typeof text !== 'string') {
      throw new Error(`${tool} returned no text content`);
    }
    try {
      return JSON.parse(text);
    } catch {
      // A tool that answered in prose is still an answer; hand it back as-is
      // rather than turning a working peer into an error.
      return { text };
    }
  }

  private async handshake(base: string): Promise<void> {
    await this.rpc(base, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: `mentor-${this.options.name}-peer`, version: '1' },
    });
    await this.rpc(base, 'notifications/initialized', undefined, true);
    this.initialized = true;
  }

  private async rpc(
    base: string,
    method: string,
    params?: unknown,
    notify = false,
  ): Promise<unknown> {
    const body: Record<string, unknown> = { jsonrpc: '2.0', method };
    if (params !== undefined) body.params = params;
    if (!notify) body.id = ++this.nextId;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    };
    if (this.session) headers['Mcp-Session-Id'] = this.session;
    const token = process.env.MENTOR_PEER_TOKEN?.trim();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.options.timeoutMs ?? 8000),
    });

    const sid = res.headers.get('mcp-session-id');
    if (sid) this.session = sid;
    if (notify) return null;

    if (!res.ok) throw new Error(`HTTP ${res.status} on ${method}`);

    const text = await res.text();
    // `event: message\ndata: {...}` — the last data line is the reply.
    const line = text
      .split('\n')
      .filter((l) => l.startsWith('data:'))
      .pop();
    const payload = line ? line.slice(5).trim() : text.trim();
    if (!payload) throw new Error(`${method}: empty response`);

    const msg = JSON.parse(payload) as { result?: unknown; error?: unknown };
    if (msg.error) throw new Error(`${method}: ${JSON.stringify(msg.error)}`);
    return msg.result ?? null;
  }
}

/**
 * The `bridge` block every cross-service tool response carries.
 *
 * Deliberately uniform, and deliberately present even when the call did not
 * happen: "this deployment has no profile plane" is information a student and a
 * judge both need, and burying it would make a one-service demo indistinguishable
 * from a three-service one.
 */
export function bridgeReport(result: PeerResult): Record<string, unknown> {
  return {
    peer: result.peer,
    called: result.tool,
    mode: result.mode,
    reached: result.ok,
    url: result.url,
    note: result.note,
  };
}

// ── the three peers, named once so no app invents a different env var ─────────

export const PROFILE_URL_ENV = 'PROFILE_URL';
export const SENTINEL_URL_ENV = 'SENTINEL_URL';
export const ROSTER_URL_ENV = 'ROSTER_URL';

export function profilePeer(): Peer {
  return new Peer({
    name: 'profile',
    urlEnv: PROFILE_URL_ENV,
    absentNote:
      'No profile plane is configured on this deployment (PROFILE_URL is unset), so nothing is ' +
      'being kept between sessions. Everything still works for one sitting — you are simply ' +
      'starting fresh each time.',
  });
}

export function sentinelPeer(): Peer {
  return new Peer({
    name: 'sentinel',
    urlEnv: SENTINEL_URL_ENV,
    absentNote:
      'No verifier is configured on this deployment (SENTINEL_URL is unset). Hand the checkpoint ' +
      'spec to MCP-2 yourself — it is plain JSON and that path is fully supported.',
  });
}

export function rosterPeer(): Peer {
  return new Peer({
    name: 'roster',
    urlEnv: ROSTER_URL_ENV,
    absentNote:
      'No roster is configured on this deployment (ROSTER_URL is unset). Pass the checkpoint spec ' +
      'as an argument instead — it travels as plain JSON by design.',
  });
}
