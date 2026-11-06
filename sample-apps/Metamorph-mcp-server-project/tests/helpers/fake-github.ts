import { makeZip } from './zip.js';

export const TOKEN = 'ghp_' + 'Ab1'.repeat(12);
export const CONFIG = { repo: 'acme/metamorph-runner', ref: 'main', token: TOKEN };

export interface FakeRun {
  id: number;
  title: string;
  /** status sequence returned by successive GETs of the run; the last one repeats */
  states: Array<{ status: string; conclusion: string | null }>;
  artifact?: Buffer | 'none';
  path?: string;
}

export interface Call {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
}

/** In-memory GitHub: records every call, never touches the network. */
export class FakeGithub {
  calls: Call[] = [];
  runs = new Map<number, FakeRun>();
  nextId = 9000;
  dispatchReturnsRunId = true;
  dispatchStatus = 200;
  /** run titles are 'Metamorph runner <request_id>' like the workflow run-name */
  scriptFor: (inputs: Record<string, string>) => Pick<FakeRun, 'states' | 'artifact'> = () => ({ states: [{ status: 'completed', conclusion: 'success' }] });
  redirectTo = 'https://productionresultssa1.blob.core.windows.net/artifacts/zip?sig=abc';
  hiddenListings = 0; // number of list calls that do not yet show the new run

  fetch = (async (input: string | URL, init: RequestInit = {}) => {
    const url = String(input);
    const headers = Object.fromEntries(Object.entries((init.headers as Record<string, string>) ?? {}));
    const call: Call = { method: init.method ?? 'GET', url, headers, body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined };
    this.calls.push(call);
    const u = new URL(url);
    const j = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status, headers: { 'content-type': 'application/json' } });
    if (u.hostname !== 'api.github.com') {
      if (u.hostname.endsWith('.blob.core.windows.net')) return new Response(this.zipFor(u), { status: 200 });
      return new Response('nope', { status: 500 });
    }
    const p = u.pathname.replace('/repos/acme/metamorph-runner', '');
    if (call.method === 'POST' && p === '/actions/workflows/metamorph-runner.yml/dispatches') {
      if (this.dispatchStatus >= 400) return j({ message: `Bad credentials for ${TOKEN}` }, this.dispatchStatus);
      const inputs = (call.body as { inputs: Record<string, string> }).inputs;
      const id = this.nextId++;
      const script = this.scriptFor(inputs);
      this.runs.set(id, { id, title: `Metamorph runner ${inputs.request_id}`, ...script });
      return this.dispatchReturnsRunId ? j({ workflow_run_id: id, run_url: 'x', html_url: 'y' }) : new Response(null, { status: 204 });
    }
    if (p === '/actions/workflows/metamorph-runner.yml/runs') {
      if (this.hiddenListings > 0) {
        this.hiddenListings--;
        return j({ workflow_runs: [] });
      }
      return j({ workflow_runs: [...this.runs.values()].map((r) => ({ id: r.id, display_title: r.title, name: r.title, created_at: new Date().toISOString() })) });
    }
    const run = p.match(/^\/actions\/runs\/(\d+)$/);
    if (run) {
      const r = this.runs.get(Number(run[1]));
      if (!r) return j({ message: 'Not Found' }, 404);
      const s = r.states.length > 1 ? r.states.shift()! : r.states[0];
      return j({ id: r.id, status: s.status, conclusion: s.conclusion, path: r.path ?? '.github/workflows/metamorph-runner.yml@refs/heads/main', html_url: `https://github.com/acme/metamorph-runner/actions/runs/${r.id}` });
    }
    const arts = p.match(/^\/actions\/runs\/(\d+)\/artifacts$/);
    if (arts) {
      const r = this.runs.get(Number(arts[1]));
      const has = r?.artifact && r.artifact !== 'none';
      return j({ total_count: has ? 1 : 0, artifacts: has ? [{ id: r!.id * 10, name: 'metamorph-result', expired: false }] : [] });
    }
    const dl = p.match(/^\/actions\/artifacts\/(\d+)\/zip$/);
    if (dl) return new Response(null, { status: 302, headers: { location: this.redirectTo.replace('artifacts/zip', `artifacts/${dl[1]}`) } });
    return j({ message: 'Not Found' }, 404);
  }) as unknown as typeof fetch;

  private zipFor(u: URL): Buffer {
    const id = Number(u.pathname.match(/artifacts\/(\d+)/)?.[1]) / 10;
    const a = this.runs.get(id)?.artifact;
    return a && a !== 'none' ? a : makeZip([]);
  }
}

export const resultZip = (json: string | object) => makeZip([{ name: 'result.json', data: typeof json === 'string' ? json : JSON.stringify(json) }]);
