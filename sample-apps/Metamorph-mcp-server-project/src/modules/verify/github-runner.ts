// Small GitHub REST client that dispatches the runner workflow, follows the run and reads its result artifact.
// The hosted server never runs project code: it only asks GitHub Actions to do it and reads back result.json.
// The token (METAMORPH_GITHUB_TOKEN) is sent only to api.github.com. It is never logged, returned or put in an error:
// every message passes through scrub(). Artifact downloads follow GitHub's redirect WITHOUT the token.
import { randomBytes } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { parseRunnerResult, type RunnerResult } from './result.js';
import { ZipError, readSingleZipEntry } from './zip.js';

export const WORKFLOW_FILE = 'metamorph-runner.yml';
export const ARTIFACT_NAME = 'metamorph-result';
export const RESULT_ENTRY = 'result.json';
export const MAX_DISPATCH_PATCH_CHARS = 60_000; // same cap the runner enforces; GitHub allows 65,535 for all inputs
export const MAX_DISPATCH_INPUT_CHARS = 65_535;
const API = 'https://api.github.com';
const RUN_ID_RE = /^[0-9]{1,20}$/;
const REQUEST_ID_RE = /^[A-Za-z0-9-]{1,40}$/;
const MAX_JSON_BYTES = 1_000_000;
const REQUEST_TIMEOUT_MS = 15_000;
const SETUP_HINT = 'See docs/RUNNER_SETUP.md.';

/** Error whose message is safe to show: it never contains the token. */
export class RunnerError extends Error {}

export type RunState = 'queued' | 'running' | 'completed' | 'failed' | 'timed_out';

export interface RunnerConfig {
  repo: string; // owner/name of the runner repository
  ref: string;
  token: string;
}

export interface RunInfo {
  runId: string;
  state: RunState;
  conclusion?: string;
  htmlUrl?: string;
}

export interface GithubRunnerDeps {
  fetchFn?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  newRequestId?: () => string;
  pollDelaysMs?: number[];
  correlationAttempts?: number;
}

/** Reads METAMORPH_RUNNER_REPO / _REF / METAMORPH_GITHUB_TOKEN. Throws RunnerError with a next step when missing. */
export function loadRunnerConfig(env: Record<string, string | undefined> = process.env): RunnerConfig {
  const missing: string[] = [];
  const token = (env.METAMORPH_GITHUB_TOKEN ?? '').trim();
  const repo = (env.METAMORPH_RUNNER_REPO ?? '').trim();
  if (!token) missing.push('METAMORPH_GITHUB_TOKEN');
  if (!repo) missing.push('METAMORPH_RUNNER_REPO');
  if (missing.length > 0) {
    throw new RunnerError(`Verification is not configured on this server: ${missing.join(' and ')} ${missing.length > 1 ? 'are' : 'is'} not set. Ask the server operator to set ${missing.length > 1 ? 'them' : 'it'}. ${SETUP_HINT}`);
  }
  if (!/^[A-Za-z0-9._-]{1,100}\/[A-Za-z0-9._-]{1,100}$/.test(repo)) {
    throw new RunnerError(`METAMORPH_RUNNER_REPO must look like owner/name. ${SETUP_HINT}`);
  }
  const ref = (env.METAMORPH_RUNNER_REF ?? '').trim() || 'main';
  if (!/^[A-Za-z0-9._/-]{1,200}$/.test(ref) || ref.includes('..')) throw new RunnerError(`METAMORPH_RUNNER_REF is not a valid branch or tag name. ${SETUP_HINT}`);
  return { repo, ref, token };
}

/** Host rules for the artifact download redirect, checked by exact host (no substring or suffix tricks). */
export function isAllowedHost(url: URL): boolean {
  if (url.protocol !== 'https:' || url.username || url.password || (url.port !== '' && url.port !== '443')) return false;
  const h = url.hostname.toLowerCase();
  if (h === 'api.github.com' || h === 'results-receiver.actions.githubusercontent.com' || h === 'pipelines.actions.githubusercontent.com') return true;
  // GitHub documents *.blob.core.windows.net (artifact storage) and *.actions.githubusercontent.com: exactly one label in front.
  return /^[a-z0-9]{3,24}\.blob\.core\.windows\.net$/.test(h) || /^[a-z0-9-]{1,40}\.actions\.githubusercontent\.com$/.test(h);
}

export function newRequestId(): string {
  return `mm-${randomBytes(8).toString('hex')}`;
}

/** Maps GitHub's run status and conclusion to the tool's states. */
export function runState(status: string | undefined, conclusion: string | null | undefined): RunState {
  if (status === 'completed') {
    if (conclusion === 'success') return 'completed';
    if (conclusion === 'timed_out') return 'timed_out';
    return 'failed';
  }
  return status === 'in_progress' ? 'running' : 'queued';
}

export function isFinal(state: RunState): boolean {
  return state === 'completed' || state === 'failed' || state === 'timed_out';
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);

export class GithubRunner {
  private readonly fetchFn: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;
  private readonly makeRequestId: () => string;
  private readonly delays: number[];
  private readonly attempts: number;

  constructor(private readonly cfg: RunnerConfig, deps: GithubRunnerDeps = {}) {
    this.fetchFn = deps.fetchFn ?? fetch;
    this.sleep = deps.sleep ?? defaultSleep;
    this.now = deps.now ?? Date.now;
    this.makeRequestId = deps.newRequestId ?? newRequestId;
    this.delays = deps.pollDelaysMs ?? [2000, 3000, 5000, 8000, 10_000];
    this.attempts = deps.correlationAttempts ?? 5;
  }

  /** Removes the token (and anything shaped like a GitHub token) from text that may be shown. */
  scrub(text: string): string {
    let t = text;
    if (this.cfg.token) t = t.split(this.cfg.token).join('[token]');
    return t.replace(/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g, '[token]');
  }

  private fail(message: string): never {
    throw new RunnerError(this.scrub(message));
  }

  private repoPath(rest: string): string {
    return `${API}/repos/${this.cfg.repo}${rest}`;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.cfg.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'metamorph-mcp'
    };
  }

  private async send(op: string, url: string, init: RequestInit): Promise<Response> {
    if (!isAllowedHost(new URL(url))) this.fail(`Refusing to call a host that is not allowed (${op}).`);
    try {
      return await this.fetchFn(url, { ...init, redirect: 'manual', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    } catch {
      return this.fail(`GitHub request failed (${op}): network error or timeout. Try again shortly.`);
    }
  }

  private async api(op: string, rest: string, init: RequestInit = {}): Promise<{ status: number; json: unknown }> {
    const res = await this.send(op, this.repoPath(rest), { ...init, headers: { ...this.headers(), ...(init.headers as Record<string, string> | undefined) } });
    const text = await res.text().catch(() => '');
    let json: unknown;
    if (text && text.length <= MAX_JSON_BYTES) {
      try {
        json = JSON.parse(text);
      } catch {
        json = undefined;
      }
    }
    if (res.status >= 400) {
      const detail = isObj(json) && typeof json.message === 'string' ? `: ${json.message.slice(0, 200)}` : '';
      const hint =
        res.status === 401 || res.status === 403
          ? ' Check that METAMORPH_GITHUB_TOKEN is valid and has Actions read and write on the runner repository.'
          : res.status === 404
            ? ' Check METAMORPH_RUNNER_REPO and that the workflow file exists on the runner ref.'
            : res.status === 422
              ? ' Check that METAMORPH_RUNNER_REF exists and the workflow accepts these inputs.'
              : '';
      this.fail(`GitHub ${op} failed with HTTP ${res.status}${detail}.${hint}`);
    }
    return { status: res.status, json };
  }

  /** Dispatches the workflow and returns the new run id. Uses the run id GitHub returns, else finds the run by request_id. */
  async dispatch(input: { repoUrl: string; subfolder?: string; patch?: string; checks?: string }): Promise<{ runId: string; requestId: string }> {
    const requestId = this.makeRequestId();
    if (!REQUEST_ID_RE.test(requestId)) this.fail('Internal error: invalid request id.');
    const inputs: Record<string, string> = { repo_url: input.repoUrl, request_id: requestId, checks: input.checks ?? 'light' };
    if (input.subfolder) inputs.subfolder = input.subfolder;
    if (input.patch) {
      const gz = gzipSync(Buffer.from(input.patch, 'utf8'), { level: 9 }).toString('base64');
      if (gz.length > MAX_DISPATCH_PATCH_CHARS) {
        this.fail(
          `The patch is still ${gz.length} characters after compression, over the ${MAX_DISPATCH_PATCH_CHARS} character limit GitHub allows for dispatch inputs (65,535 in total). Next step: verify a smaller stage, or run the runner image locally (see runner/README.md).`
        );
      }
      inputs.patch_gz_b64 = gz;
    }
    const total = Object.entries(inputs).reduce((n, [k, v]) => n + k.length + v.length, 0);
    if (total > MAX_DISPATCH_INPUT_CHARS) this.fail(`The dispatch inputs total ${total} characters, over GitHub's 65,535 limit. Use a smaller patch or subfolder.`);

    const before = this.now();
    const { json } = await this.api('workflow dispatch', `/actions/workflows/${WORKFLOW_FILE}/dispatches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: this.cfg.ref, inputs })
    });
    // GitHub's current API answers 200 with workflow_run_id. Older behaviour is an empty 204: correlate by request_id.
    if (isObj(json) && (typeof json.workflow_run_id === 'number' || typeof json.workflow_run_id === 'string')) {
      const id = String(json.workflow_run_id);
      if (RUN_ID_RE.test(id)) return { runId: id, requestId };
    }
    for (let i = 0; i < this.attempts; i++) {
      if (i > 0) await this.sleep(Math.min(1000 * 2 ** (i - 1), 8000));
      const found = await this.findRun(requestId, before);
      if (found) return { runId: found, requestId };
    }
    return this.fail(`The workflow was dispatched but its run (request ${requestId}) could not be found yet. Check the Actions tab of the runner repository; do not dispatch again until you have looked.`);
  }

  private async findRun(requestId: string, sinceMs: number): Promise<string | undefined> {
    const q = `?event=workflow_dispatch&branch=${encodeURIComponent(this.cfg.ref)}&per_page=30`;
    const { json } = await this.api('list runs', `/actions/workflows/${WORKFLOW_FILE}/runs${q}`);
    const runs = isObj(json) && Array.isArray(json.workflow_runs) ? json.workflow_runs : [];
    for (const r of runs) {
      if (!isObj(r)) continue;
      const title = `${typeof r.display_title === 'string' ? r.display_title : ''} ${typeof r.name === 'string' ? r.name : ''}`;
      const created = typeof r.created_at === 'string' ? Date.parse(r.created_at) : NaN;
      // allow a minute of clock skew between GitHub and this host
      if (title.includes(requestId) && (Number.isNaN(created) || created >= sinceMs - 60_000) && (typeof r.id === 'number' || typeof r.id === 'string')) {
        const id = String(r.id);
        if (RUN_ID_RE.test(id)) return id;
      }
    }
    return undefined;
  }

  static validRunId(id: string): boolean {
    return RUN_ID_RE.test(id);
  }

  async getRun(runId: string): Promise<RunInfo> {
    if (!RUN_ID_RE.test(runId)) this.fail('run_id must be digits only (the id from an earlier verify_patch result).');
    const { json } = await this.api('get run', `/actions/runs/${runId}`);
    if (!isObj(json)) this.fail('GitHub returned an unexpected answer for the run.');
    // only runs of our workflow count: an id from another workflow must not be read
    if (typeof json.path === 'string' && !json.path.startsWith(`.github/workflows/${WORKFLOW_FILE}`)) this.fail('That run does not belong to the Metamorph runner workflow.');
    const status = typeof json.status === 'string' ? json.status : undefined;
    const conclusion = typeof json.conclusion === 'string' ? json.conclusion : undefined;
    const html = typeof json.html_url === 'string' && json.html_url.startsWith(`https://github.com/${this.cfg.repo}/`) ? json.html_url : undefined;
    return { runId, state: runState(status, conclusion), ...(conclusion ? { conclusion } : {}), ...(html ? { htmlUrl: html } : {}) };
  }

  /** Polls with backoff until the run is final or `budgetMs` is used up (then returns the last, non-final state). */
  async waitFor(runId: string, budgetMs: number): Promise<RunInfo> {
    const deadline = this.now() + budgetMs;
    let info = await this.getRun(runId);
    for (let i = 0; !isFinal(info.state); i++) {
      const delay = this.delays[Math.min(i, this.delays.length - 1)];
      if (this.now() + delay >= deadline) break;
      await this.sleep(delay);
      info = await this.getRun(runId);
    }
    return info;
  }

  /** Downloads the result artifact of a finished run and validates result.json. */
  async fetchResult(runId: string): Promise<RunnerResult> {
    if (!RUN_ID_RE.test(runId)) this.fail('run_id must be digits only.');
    const { json } = await this.api('list artifacts', `/actions/runs/${runId}/artifacts?name=${ARTIFACT_NAME}&per_page=5`);
    const list = isObj(json) && Array.isArray(json.artifacts) ? json.artifacts : [];
    const art = list.find((a) => isObj(a) && a.name === ARTIFACT_NAME && a.expired !== true);
    if (!isObj(art) || (typeof art.id !== 'number' && typeof art.id !== 'string') || !/^[0-9]{1,20}$/.test(String(art.id))) {
      this.fail(`Run ${runId} has no ${ARTIFACT_NAME} artifact (it may have expired after 3 days, or the job failed before writing a result). Check the run log in the runner repository.`);
    }
    const first = await this.send('artifact download', this.repoPath(`/actions/artifacts/${String(art.id)}/zip`), { headers: this.headers() });
    let zipRes = first;
    if (first.status >= 300 && first.status < 400) {
      const loc = first.headers.get('location') ?? '';
      let target: URL;
      try {
        target = new URL(loc);
      } catch {
        return this.fail('GitHub sent an unusable artifact redirect.');
      }
      if (!isAllowedHost(target)) this.fail(`GitHub redirected the artifact download to a host that is not allowed (${target.hostname.slice(0, 80)}).`);
      // The redirect target is pre-signed: it must not receive the token.
      zipRes = await this.send('artifact download', target.toString(), { headers: { 'User-Agent': 'metamorph-mcp' } });
    }
    if (zipRes.status >= 300) this.fail(`Artifact download failed with HTTP ${zipRes.status}. The link expires after one minute; try again.`);
    const buf = Buffer.from(await zipRes.arrayBuffer());
    let text: string;
    try {
      text = readSingleZipEntry(buf, RESULT_ENTRY).toString('utf8');
    } catch (e) {
      return this.fail(`The result artifact was rejected: ${e instanceof ZipError ? e.message : 'unreadable archive'}.`);
    }
    const parsed = parseRunnerResult(text);
    if (!parsed.ok) this.fail(`The runner result was rejected: ${parsed.error}`);
    return parsed.result;
  }
}
