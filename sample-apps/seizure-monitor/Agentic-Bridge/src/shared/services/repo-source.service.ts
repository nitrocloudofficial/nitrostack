/**
 * Remote codebase ingestion.
 *
 * The reconnaissance swarm was built against a local absolute path, which is
 * exactly the assumption that breaks the moment this server is hosted: a
 * process running in NitroCloud cannot read `C:\Users\…\legacy-monolith`. This
 * service closes that gap by making a GitHub URL a first-class target — clone
 * it shallow into a private temp directory, let the existing traversal run over
 * that directory unmodified, then delete it.
 *
 * Design constraints worth stating, because they are what keeps this safe:
 *
 *   - `execFile`, never `exec`. No shell means no metacharacter injection, so a
 *     repository name is data rather than code.
 *   - The URL is parsed and re-assembled from validated parts. We never pass
 *     the caller's string through to git verbatim.
 *   - The host must be on an allow-list, so this cannot be turned into an
 *     SSRF-ish fetch-anything primitive by a creative `target` argument.
 *   - A token, if configured, travels in the environment via GIT_CONFIG_*
 *     rather than in argv or in the URL. `/proc/<pid>/cmdline` is world
 *     readable; `/proc/<pid>/environ` is not.
 *   - `GIT_TERMINAL_PROMPT=0` so a private repo without credentials fails in
 *     milliseconds instead of blocking on an interactive password prompt.
 */
import { Injectable } from '@nitrostack/core';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { redact } from './http.util.js';

const run = promisify(execFile);

/** Hard ceiling on a clone. A repo that cannot land in this window is not a demo target. */
const CLONE_TIMEOUT_MS = Number(process.env.BRIDGE_CLONE_TIMEOUT_MS ?? 120_000);
const MAX_GIT_OUTPUT_BYTES = 1024 * 1024;

/** Hosts a target URL may point at. Widen deliberately, not by accident. */
function allowedHosts(): string[] {
  const configured = process.env.BRIDGE_ALLOWED_REPO_HOSTS?.trim();
  if (!configured) return ['github.com'];
  return configured
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

/** Owner and repository segments: GitHub's own character set, nothing else. */
const SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
/** Branch, tag or SHA. Leading dash excluded so it can never read as a flag. */
const REF = /^[A-Za-z0-9][A-Za-z0-9._\/-]*$/;

export interface RemoteRepoRef {
  host: string;
  owner: string;
  repo: string;
  /** Branch/tag/commit, when the URL carried one. */
  ref?: string;
  /** The normalised clone URL actually handed to git. */
  cloneUrl: string;
  /** `owner/repo` — used for display and for manifest filenames. */
  slug: string;
}

export interface ClonedRepo extends RemoteRepoRef {
  /** Absolute path to the working tree. */
  root: string;
  /** Resolved HEAD, so a report can cite the exact revision it analysed. */
  commit?: string;
  branch?: string;
  clonedInMs: number;
}

@Injectable()
export class RepoSourceService {
  /** Temp directories this process created and has not yet removed. */
  private readonly live = new Set<string>();

  constructor() {
    // A crashed or interrupted tool call must not leak a multi-megabyte clone
    // into the container's tmpfs for the life of the process.
    const sweep = () => this.cleanupAllSync();
    process.once('exit', sweep);
    process.once('SIGINT', sweep);
    process.once('SIGTERM', sweep);
  }

  /**
   * Does this target look like a URL rather than a path?
   *
   * Deliberately broad: a `git@…` or `http://` target is recognised here so
   * `parse` can reject it with a useful message, instead of `resolveTarget`
   * later reporting the confusing "path does not exist: /cwd/git@github.com…".
   */
  static isRemote(target?: string): boolean {
    if (!target) return false;
    return /^(https?:\/\/|git@|ssh:\/\/|git:\/\/)/i.test(target.trim());
  }

  isRemote(target?: string): boolean {
    return RepoSourceService.isRemote(target);
  }

  /**
   * Validate a remote target and decompose it. Throws with an actionable
   * message — the caller surfaces it verbatim to the model.
   *
   * Accepts the forms a human actually pastes:
   *   https://github.com/owner/repo
   *   https://github.com/owner/repo.git
   *   https://github.com/owner/repo/tree/some-branch
   *   https://github.com/owner/repo#some-branch
   */
  parse(target: string): RemoteRepoRef {
    const raw = target.trim();

    if (!/^https:\/\//i.test(raw)) {
      throw new Error(
        `Only https:// repository URLs are supported, got "${redact(raw)}". ` +
          `SSH targets need a key on the host; use the https URL of the repository instead.`
      );
    }

    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new Error(`Not a valid URL: "${redact(raw)}"`);
    }

    if (url.username || url.password) {
      throw new Error(
        'Refusing a repository URL with embedded credentials. Set GITHUB_TOKEN in the environment instead.'
      );
    }

    const host = url.hostname.toLowerCase();
    const permitted = allowedHosts();
    if (!permitted.includes(host)) {
      throw new Error(
        `Refusing to clone from ${host}: not on the host allow-list (${permitted.join(', ')}). ` +
          `Add it with BRIDGE_ALLOWED_REPO_HOSTS="${permitted.join(',')},${host}" to opt in.`
      );
    }

    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length < 2) {
      throw new Error(
        `Expected a repository URL of the form https://${host}/<owner>/<repo>, got "${redact(raw)}".`
      );
    }

    const owner = segments[0];
    const repo = segments[1].replace(/\.git$/i, '');
    if (!SEGMENT.test(owner) || !SEGMENT.test(repo)) {
      throw new Error(`Invalid owner/repository in "${redact(raw)}".`);
    }

    // `/tree/<ref>` may carry slashes (feature/foo); take everything after it.
    let ref: string | undefined;
    if (segments[2] === 'tree' && segments.length > 3) {
      ref = segments.slice(3).map(decodeURIComponent).join('/');
    } else if (url.hash) {
      ref = decodeURIComponent(url.hash.slice(1));
    }
    if (ref && !REF.test(ref)) {
      throw new Error(`Invalid branch or tag "${ref}" in the target URL.`);
    }

    return { host, owner, repo, ref, slug: `${owner}/${repo}`, cloneUrl: `https://${host}/${owner}/${repo}.git` };
  }

  /**
   * Shallow-clone the repository into a fresh private temp directory.
   *
   * `--depth 1 --single-branch --no-tags` is what makes this viable inside a
   * tool call: it pulls one commit of one branch, so a repository with a decade
   * of history costs the same as a fresh one.
   */
  async clone(target: string): Promise<ClonedRepo> {
    const ref = this.parse(target);
    const started = Date.now();

    // 0o700 by default on POSIX, and a random suffix, so a co-tenant process
    // cannot read a private repository out of the temp directory.
    const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'agentic-bridge-clone-'));
    this.live.add(root);

    const args = ['clone', '--depth', '1', '--single-branch', '--no-tags', '--quiet'];
    if (ref.ref) args.push('--branch', ref.ref);
    args.push('--', ref.cloneUrl, root);

    try {
      await run('git', args, {
        timeout: CLONE_TIMEOUT_MS,
        maxBuffer: MAX_GIT_OUTPUT_BYTES,
        env: this.gitEnv(),
        windowsHide: true,
      });
    } catch (error) {
      await this.remove(root);
      throw new Error(this.explainCloneFailure(error, ref));
    }

    // Provenance. Cheap, and it is what lets a generated manifest say which
    // revision it describes rather than just naming a branch.
    const commit = await this.gitOutput(root, ['rev-parse', 'HEAD']);
    const branch = await this.gitOutput(root, ['rev-parse', '--abbrev-ref', 'HEAD']);

    return { ...ref, root, commit, branch: branch || ref.ref, clonedInMs: Date.now() - started };
  }

  /** Delete a clone. Safe to call twice; never throws. */
  async release(root: string): Promise<void> {
    await this.remove(root);
  }

  /**
   * Git invocations inherit a deliberately narrow environment.
   *
   * The token goes in via GIT_CONFIG_* rather than argv or the URL, and every
   * interactive prompt is disabled so a missing credential is an immediate
   * error rather than a hung tool call.
   */
  private gitEnv(): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      GIT_TERMINAL_PROMPT: '0',
      GIT_ASKPASS: '',
      GCM_INTERACTIVE: 'never',
      // Some hosts ship a global credential helper that pops UI. Neutralise it.
      GIT_CONFIG_COUNT: '1',
      GIT_CONFIG_KEY_0: 'credential.helper',
      GIT_CONFIG_VALUE_0: '',
    };

    const token = process.env.GITHUB_TOKEN?.trim();
    if (token) {
      const header = `Authorization: Basic ${Buffer.from(`x-access-token:${token}`).toString('base64')}`;
      env.GIT_CONFIG_COUNT = '2';
      env.GIT_CONFIG_KEY_1 = 'http.extraHeader';
      env.GIT_CONFIG_VALUE_1 = header;
    }

    return env;
  }

  /** git's stderr is precise but unfriendly; map the common cases to an instruction. */
  private explainCloneFailure(error: unknown, ref: RemoteRepoRef): string {
    const err = error as { killed?: boolean; signal?: string; code?: string | number; stderr?: string };
    if (err.killed || err.signal === 'SIGTERM') {
      return (
        `Cloning ${ref.slug} exceeded ${CLONE_TIMEOUT_MS}ms and was aborted. ` +
        `Raise BRIDGE_CLONE_TIMEOUT_MS, or analyse a smaller repository.`
      );
    }
    if (err.code === 'ENOENT') {
      return 'git is not installed on this host, so remote repository targets cannot be cloned. Install git, or pass a local path.';
    }

    const stderr = redact((err.stderr ?? '').toString().trim());
    if (/could not read Username|Authentication failed|terminal prompts disabled/i.test(stderr)) {
      return (
        `Cannot access ${ref.slug} — it is private or does not exist. ` +
        `Set GITHUB_TOKEN with repo read access to clone private repositories.`
      );
    }
    if (/Remote branch .* not found|pathspec/i.test(stderr) && ref.ref) {
      return `Branch or tag "${ref.ref}" does not exist in ${ref.slug}.`;
    }
    if (/not found|does not exist/i.test(stderr)) {
      return `Repository ${ref.slug} was not found on ${ref.host}.`;
    }
    return `git clone of ${ref.slug} failed: ${stderr || (error instanceof Error ? error.message : String(error))}`;
  }

  /** Run a read-only git command in the clone. Provenance is nice-to-have, never fatal. */
  private async gitOutput(cwd: string, args: string[]): Promise<string | undefined> {
    try {
      const { stdout } = await run('git', args, {
        cwd,
        timeout: 10_000,
        maxBuffer: MAX_GIT_OUTPUT_BYTES,
        env: this.gitEnv(),
        windowsHide: true,
      });
      return stdout.trim() || undefined;
    } catch {
      return undefined;
    }
  }

  private async remove(root: string): Promise<void> {
    this.live.delete(root);
    try {
      await fsp.rm(root, { recursive: true, force: true, maxRetries: 2 });
    } catch (error) {
      // A leaked temp directory is a disk-space problem, not a correctness one.
      console.error(`[bridge] Could not remove clone at ${root}: ${(error as Error).message}`);
    }
  }

  /** Exit handlers cannot await, so shutdown cleanup is synchronous. */
  private cleanupAllSync(): void {
    for (const root of this.live) {
      try {
        fs.rmSync(root, { recursive: true, force: true });
      } catch {
        /* process is going away regardless */
      }
    }
    this.live.clear();
  }
}
