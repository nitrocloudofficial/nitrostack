/**
 * WorkspaceService — the single gatekeeper for every filesystem read the swarm performs.
 *
 * The proposal calls for hard operational boundaries so an agent loop cannot
 * exfiltrate a thirty-year-old codebase or exhaust memory. Rather than trusting
 * each tool to behave, all traversal funnels through here, which enforces:
 *
 *   - an allow-list of roots (the bundled fixture + anything the operator opts in to)
 *   - a maximum file count, maximum single-file size, and maximum total bytes read
 *   - symlink resolution before the containment check, so `..` and link escapes fail
 *   - a skip-list for vendored/build directories
 */
import { Injectable } from '@nitrostack/core';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { RepoSourceService, type ClonedRepo } from './repo-source.service.js';

export interface TraversalLimits {
  maxFiles: number;
  maxFileBytes: number;
  maxTotalBytes: number;
}

export const DEFAULT_LIMITS: TraversalLimits = {
  maxFiles: 4000,
  maxFileBytes: 2 * 1024 * 1024, // 2 MB per file
  maxTotalBytes: 64 * 1024 * 1024, // 64 MB per traversal
};

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  'target',
  '.next',
  'coverage',
  '__pycache__',
  '.venv',
  'venv',
  'vendor',
  '.bridge',
]);

const TEXT_EXTENSIONS = new Set([
  '.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.java', '.py', '.rb', '.go', '.rs',
  '.cs', '.php', '.kt', '.scala', '.sql', '.sh', '.bash',
  '.json', '.yml', '.yaml', '.toml', '.ini', '.xml', '.properties',
  '.css', '.scss', '.less', '.html', '.md', '.txt', '.gradle',
]);

/** Files with no extension that we still want to read. */
const NAMED_FILES = new Set(['Jenkinsfile', 'Dockerfile', 'Makefile', 'Procfile']);

export interface TraversalResult {
  files: string[];
  truncated: boolean;
  reason?: string;
  bytesRead: number;
}

/**
 * A resolved analysis target, whatever its origin.
 *
 * Tools receive one of these instead of a bare path so that a local directory
 * and a freshly cloned GitHub repository are indistinguishable to everything
 * downstream — the parsers, the personas and the manifest all just see `root`.
 * The only asymmetry is `cleanup`, which the caller must invoke in a `finally`.
 */
export interface TargetHandle {
  /** Absolute path to traverse. */
  root: string;
  /** What the user asked for: a URL for remote targets, else the resolved path. */
  origin: string;
  /** Human-facing label used in run records and the manifest header. */
  label: string;
  remote: boolean;
  /** Present only for remote targets. */
  repo?: ClonedRepo;
  /** Idempotent. Deletes the clone for remote targets; a no-op for local ones. */
  cleanup: () => Promise<void>;
}

/**
 * The provenance block every target-accepting tool returns.
 *
 * Without this a response from a cloned repo is indistinguishable from one read
 * off local disk, and an agent has no way to cite what it actually analysed.
 * Temp paths are deliberately excluded — they are meaningless to the caller and
 * gone by the time the response is read.
 */
export function describeSource(handle: TargetHandle): {
  kind: 'local' | 'github';
  origin: string;
  repository?: string;
  branch?: string;
  commit?: string;
} {
  if (!handle.remote || !handle.repo) {
    return { kind: 'local', origin: handle.label };
  }
  return {
    kind: 'github',
    origin: handle.origin,
    repository: handle.repo.slug,
    branch: handle.repo.branch,
    commit: handle.repo.commit,
  };
}

@Injectable({ deps: [RepoSourceService] })
export class WorkspaceService {
  /** Directory of this NitroStack project (resolved from the compiled/ts entry). */
  readonly projectRoot: string;
  /** The bundled legacy fixture used when no target is supplied. */
  readonly fixtureRoot: string;
  /** Durable state directory. */
  readonly stateRoot: string;
  /** Directory generated skills are written to. */
  readonly skillsRoot: string;
  /** Mock enterprise system payloads. */
  readonly dataRoot: string;

  private readonly extraRoots: string[] = [];
  /**
   * Temp clones currently checked out. They are allow-listed only while a tool
   * is using them, so a stale path cannot be replayed as a target after the
   * directory has been released (and, on a reused inode, repopulated).
   */
  private readonly tempRoots = new Set<string>();

  constructor(private repoSource: RepoSourceService) {
    this.projectRoot = WorkspaceService.locateProjectRoot();
    this.fixtureRoot = path.join(this.projectRoot, 'fixtures', 'legacy-monolith');
    this.dataRoot = path.join(this.projectRoot, 'data');

    // Writable-directory selection. NitroStack Cloud containers own /app as root
    // but run the process as an unprivileged user, so an unconditional mkdir on
    // `/app/.bridge` throws EACCES and takes DI resolution down before the
    // server can start. Prefer an explicit env override, then the project root
    // (right for laptops), then a per-process directory under os.tmpdir()
    // (right for read-only containers). Falling back keeps the server bootable;
    // state is ephemeral in that case, which is acceptable for a demo target
    // and mount-a-volume-fixable for durability.
    this.stateRoot = WorkspaceService.ensureWritable(
      process.env.BRIDGE_STATE_DIR?.trim() || path.join(this.projectRoot, '.bridge'),
      path.join(os.tmpdir(), 'agentic-bridge-state')
    );
    this.skillsRoot = WorkspaceService.ensureWritable(
      process.env.BRIDGE_SKILLS_DIR?.trim() || path.join(this.projectRoot, 'src', 'skills'),
      path.join(os.tmpdir(), 'agentic-bridge-skills')
    );

    // Operators can widen the allow-list without editing code.
    const extra = process.env.BRIDGE_ALLOWED_ROOTS;
    if (extra) {
      for (const raw of extra.split(path.delimiter)) {
        const trimmed = raw.trim();
        if (trimmed) this.extraRoots.push(path.resolve(trimmed));
      }
    }
  }

  /**
   * Create `preferred` if writable, otherwise fall back to `fallback`.
   *
   * Any write failure on the preferred path (EACCES, EPERM, EROFS, ENOENT on a
   * missing parent we cannot create) triggers the fallback. Fallback failures
   * throw — a bridge that has no writable state at all is unrecoverable and
   * should crash loudly rather than silently corrupt.
   *
   * The chosen path is written to stderr so an operator can see, from the boot
   * log, whether state is going to a mounted volume or to a per-process tmpdir.
   */
  private static ensureWritable(preferred: string, fallback: string): string {
    try {
      fs.mkdirSync(preferred, { recursive: true });
      // Confirm we can actually write, not just mkdir. Some container FS layers
      // return success on mkdir then refuse writes with a different error.
      const probe = path.join(preferred, `.write-probe-${process.pid}`);
      fs.writeFileSync(probe, '');
      fs.unlinkSync(probe);
      return preferred;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code ?? 'UNKNOWN';
      console.error(
        `[bridge] Cannot write to ${preferred} (${code}); falling back to ${fallback}. ` +
          `Set BRIDGE_STATE_DIR / BRIDGE_SKILLS_DIR to a mounted writable path for durable state.`
      );
      fs.mkdirSync(fallback, { recursive: true });
      return fallback;
    }
  }

  /**
   * Walk up from this file until we find the directory holding package.json.
   * Works identically under `tsx src/index.ts` and `node dist/index.js`.
   */
  private static locateProjectRoot(): string {
    let dir = path.dirname(new URL(import.meta.url).pathname);
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return process.cwd();
  }

  /**
   * Is this root the bundled Aurora demo fixture?
   *
   * Used to decide whether fixture-backed enterprise data is legitimate. For
   * the bundled fixture the mock sprint and transcript ARE the truth of that
   * repository; for anyone else's codebase they are fiction, and must not be
   * written into their manifest.
   */
  isBundledFixture(root: string): boolean {
    try {
      return fs.realpathSync(root) === fs.realpathSync(this.fixtureRoot);
    } catch {
      return path.resolve(root) === path.resolve(this.fixtureRoot);
    }
  }

  /** Roots the swarm is permitted to read from. */
  get allowedRoots(): string[] {
    return [this.projectRoot, this.fixtureRoot, ...this.extraRoots, ...this.tempRoots];
  }

  /**
   * Resolve any target — local path, bundled fixture, or GitHub URL — into a
   * directory on this host, plus the cleanup that releases it.
   *
   * This is the single entry point every target-accepting tool should use.
   * Remote targets are shallow-cloned into a temp directory that is allow-listed
   * for exactly the lifetime of the handle; local targets take the existing
   * synchronous path and get a no-op cleanup.
   *
   * Callers MUST release the handle in a `finally`:
   *
   *   const handle = await workspace.acquireTarget(input.target);
   *   try { … } finally { await handle.cleanup(); }
   */
  async acquireTarget(target?: string): Promise<TargetHandle> {
    if (!RepoSourceService.isRemote(target)) {
      const root = this.resolveTarget(target);
      return {
        root,
        origin: root,
        label: this.rel(this.projectRoot, root) || root,
        remote: false,
        cleanup: async () => {},
      };
    }

    const repo = await this.repoSource.clone(target!.trim());
    // Real path first: on macOS os.tmpdir() is a symlink into /private, and the
    // containment check below resolves symlinks, so registering the unresolved
    // path would allow-list a directory that never matches.
    const real = fs.realpathSync(repo.root);
    this.tempRoots.add(real);

    let released = false;
    return {
      root: real,
      origin: target!.trim(),
      label: `${repo.slug}${repo.branch ? `@${repo.branch}` : ''}`,
      remote: true,
      repo: { ...repo, root: real },
      cleanup: async () => {
        if (released) return;
        released = true;
        this.tempRoots.delete(real);
        await this.repoSource.release(real);
      },
    };
  }

  /**
   * Resolve a caller-supplied local target into a real, allow-listed directory.
   * Throws with an actionable message rather than silently falling back.
   *
   * Prefer `acquireTarget` in tools: this one rejects remote URLs by design.
   */
  resolveTarget(target?: string): string {
    if (RepoSourceService.isRemote(target)) {
      throw new Error(
        `"${target}" is a repository URL, which this code path cannot resolve synchronously. ` +
          `This is a bug — the calling tool should use acquireTarget().`
      );
    }
    if (!target || !target.trim()) {
      if (!fs.existsSync(this.fixtureRoot)) {
        throw new Error(
          `No target supplied and the bundled fixture is missing at ${this.fixtureRoot}. ` +
            `Pass an absolute path via the "target" parameter.`
        );
      }
      return this.fixtureRoot;
    }

    const resolved = path.resolve(target.trim());
    if (!fs.existsSync(resolved)) {
      throw new Error(`Target path does not exist: ${resolved}`);
    }
    if (!fs.statSync(resolved).isDirectory()) {
      throw new Error(`Target must be a directory, got a file: ${resolved}`);
    }

    const real = fs.realpathSync(resolved);
    const permitted = this.allowedRoots.some((root) => this.contains(root, real));
    if (!permitted) {
      throw new Error(
        `Refusing to traverse ${real}: outside the allow-list. ` +
          `Allowed roots: ${this.allowedRoots.join(', ')}. ` +
          `Add it with BRIDGE_ALLOWED_ROOTS="${real}" to opt in.`
      );
    }
    return real;
  }

  /** True when `child` is `parent` or lives beneath it. */
  private contains(parent: string, child: string): boolean {
    const rel = path.relative(fs.existsSync(parent) ? fs.realpathSync(parent) : parent, child);
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
  }

  /**
   * Enumerate readable text files beneath `root`, honouring the traversal budget.
   * Returns absolute paths. Never throws on a single unreadable entry.
   */
  walk(root: string, limits: TraversalLimits = DEFAULT_LIMITS): TraversalResult {
    const files: string[] = [];
    let bytesRead = 0;
    let truncated = false;
    let reason: string | undefined;

    const stack: string[] = [root];
    while (stack.length) {
      if (files.length >= limits.maxFiles) {
        truncated = true;
        reason = `file count limit (${limits.maxFiles}) reached`;
        break;
      }
      if (bytesRead >= limits.maxTotalBytes) {
        truncated = true;
        reason = `total byte budget (${limits.maxTotalBytes}) reached`;
        break;
      }

      const dir = stack.pop()!;
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        continue; // unreadable directory — skip, do not abort the traversal
      }

      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (SKIP_DIRS.has(entry.name)) continue;
          stack.push(full);
          continue;
        }
        if (!entry.isFile()) continue; // ignore symlinks/sockets/devices
        if (!this.isTextFile(entry.name)) continue;

        let size: number;
        try {
          size = fs.statSync(full).size;
        } catch {
          continue;
        }
        if (size > limits.maxFileBytes) continue;

        files.push(full);
        bytesRead += size;
        if (files.length >= limits.maxFiles) break;
      }
    }

    return { files, truncated, reason, bytesRead };
  }

  isTextFile(name: string): boolean {
    if (NAMED_FILES.has(name)) return true;
    if (name.startsWith('.') && !name.startsWith('.eslintrc') && !name.startsWith('.prettierrc')) {
      // Allow dot-configs we care about, skip the rest of the dotfile noise.
      if (!['.env.example', '.babelrc', '.nvmrc'].includes(name)) return false;
    }
    return TEXT_EXTENSIONS.has(path.extname(name).toLowerCase());
  }

  /** Read a file as UTF-8, returning null instead of throwing. */
  read(file: string): string | null {
    try {
      return fs.readFileSync(file, 'utf8');
    } catch {
      return null;
    }
  }

  rel(root: string, file: string): string {
    return path.relative(root, file).split(path.sep).join('/');
  }
}
