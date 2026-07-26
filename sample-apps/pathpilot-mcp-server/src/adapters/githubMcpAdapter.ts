import {
  RepositoryRef,
  FileNode,
  ManifestData,
  RepositorySnapshot,
  SelectedFileContent,
  TruncationInfo,
  ErrorCode,
} from '../domain/models.js';
import { CONFIG, isPathExcluded, redactSecrets } from '../infrastructure/config.js';

export interface GitHubAdapterError {
  code: ErrorCode;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

export interface ListCommitsResult {
  count: number;
  messages: string[];
}

const GITHUB_API = 'https://api.github.com';

export function parseRepositoryReference(input: string): RepositoryRef {
  const trimmed = input.trim();

  const ownerSlashRepo = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
  if (ownerSlashRepo.test(trimmed)) {
    const [owner, repo] = trimmed.split('/');
    return {
      provider: 'github',
      owner,
      repo,
      url: `https://github.com/${owner}/${repo}`,
    };
  }

  const urlPattern = /^https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?(?:[#?/].*)?$/i;
  const m = trimmed.match(urlPattern);
  if (m) {
    const [, owner, repo] = m;
    return {
      provider: 'github',
      owner,
      repo,
      url: `https://github.com/${owner}/${repo}`,
    };
  }

  const err: GitHubAdapterError = {
    code: 'INVALID_REPOSITORY',
    message: 'Enter a valid GitHub repository URL (https://github.com/owner/repo) or owner/repo identifier.',
    retryable: false,
  };
  throw err;
}

export class GitHubMcpAdapter {
  private token?: string;

  constructor(token?: string) {
    this.token = token || CONFIG.githubToken;
  }

  private authHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'pathpilot-mcp/1.0',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    return headers;
  }

  private async requestJson<T>(path: string): Promise<{ ok: boolean; status: number; data: T | null; error?: GitHubAdapterError }> {
    const url = path.startsWith('http') ? path : `${GITHUB_API}${path}`;
    try {
      const res = await fetch(url, { headers: this.authHeaders() });
      if (res.status === 403 || res.status === 429) {
        return {
          ok: false,
          status: res.status,
          data: null,
          error: {
            code: 'RATE_LIMITED',
            message: 'GitHub is temporarily limiting requests. Try again shortly.',
            retryable: true,
            details: { status: res.status },
          },
        };
      }
      if (res.status === 404 || res.status === 401) {
        return {
          ok: false,
          status: res.status,
          data: null,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Connect GitHub or choose a public repository you can access.',
            retryable: false,
            details: { status: res.status },
          },
        };
      }
      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          data: null,
          error: {
            code: 'PROVIDER_UNAVAILABLE',
            message: `GitHub request failed (${res.status}).`,
            retryable: true,
            details: { status: res.status },
          },
        };
      }
      const data = (await res.json()) as T;
      return { ok: true, status: res.status, data };
    } catch (e) {
      return {
        ok: false,
        status: 0,
        data: null,
        error: {
          code: 'PROVIDER_UNAVAILABLE',
          message: 'GitHub connection is unavailable.',
          retryable: true,
          details: { cause: e instanceof Error ? e.message : String(e) },
        },
      };
    }
  }

  async getDefaultBranch(ref: RepositoryRef): Promise<{ branch: string; error?: GitHubAdapterError }> {
    const res = await this.requestJson<{ default_branch?: string }>(
      `/repos/${ref.owner}/${ref.repo}`
    );
    if (res.error) return { branch: 'main', error: res.error };
    return { branch: res.data?.default_branch || 'main' };
  }

  async listFiles(
    ref: RepositoryRef,
    branch: string
  ): Promise<{ files: FileNode[]; error?: GitHubAdapterError; truncated?: boolean }> {
    const res = await this.requestJson<{
      tree?: Array<{ path: string; type: string; size?: number; sha?: string }>;
      truncated?: boolean;
    }>(
      `/repos/${ref.owner}/${ref.repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`
    );
    if (res.error) return { files: [], error: res.error };

    const data = res.data || {};
    const tree = Array.isArray(data) ? (data as any[]) : Array.isArray(data.tree) ? data.tree : [];
    const files: FileNode[] = tree
      .filter((item: any) => item && typeof item === 'object' && typeof item.path === 'string')
      .map((item: any) => ({
        path: item.path,
        type: item.type === 'tree' ? 'dir' : item.type === 'blob' ? 'file' : 'symlink',
        size: typeof item.size === 'number' ? item.size : undefined,
        sha: typeof item.sha === 'string' ? item.sha : undefined,
      }));
    return { files, truncated: !!data.truncated };
  }

  async readFile(
    ref: RepositoryRef,
    path: string,
    branch: string
  ): Promise<{ content?: string; encoding?: string; error?: GitHubAdapterError }> {
    const url = `/repos/${ref.owner}/${ref.repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`;
    const res = await this.requestJson<any>(url);
    if (res.error) return { error: res.error };
    const data = res.data;
    if (!data) return { content: '' };
    if (Array.isArray(data)) {
      return { content: '' };
    }
    if (typeof data !== 'object' || typeof data.content !== 'string') {
      return { content: '' };
    }
    const encoding = typeof data.encoding === 'string' ? data.encoding : 'base64';
    let decoded = '';
    try {
      if (encoding === 'base64') {
        decoded = Buffer.from(data.content.replace(/\s+/g, ''), 'base64').toString('utf-8');
      } else {
        decoded = data.content;
      }
    } catch {
      return {
        error: {
          code: 'UNSUPPORTED_CONTENT',
          message: 'Could not decode file content.',
          retryable: false,
        },
      };
    }
    return { content: redactSecrets(decoded), encoding };
  }

  async listCommits(
    ref: RepositoryRef,
    branch: string,
    perPage = 20
  ): Promise<ListCommitsResult & { error?: GitHubAdapterError }> {
    const res = await this.requestJson<any>(
      `/repos/${ref.owner}/${ref.repo}/commits?sha=${encodeURIComponent(branch)}&per_page=${perPage}`
    );
    if (res.error) {
      return { count: 0, messages: [], error: res.error };
    }
    const data = res.data;
    const commits = Array.isArray(data) ? data : Array.isArray((data as any)?.items) ? (data as any).items : [];
    const messages: string[] = [];
    for (const c of commits) {
      const msg = (c as any)?.commit?.message;
      if (typeof msg === 'string' && msg.trim().length > 0) messages.push(msg);
    }
    return {
      count: Math.min(commits.length, perPage),
      messages: messages.slice(0, perPage),
    }; 
  }
  async getUser(username: string) {
  return this.requestJson<any>(
    `/users/${encodeURIComponent(username)}`
  );
}
  async getUserRepositories(username: string) {
  return this.requestJson<any[]>(
    `/users/${encodeURIComponent(username)}/repos`
  );
}
}

export interface CollectSnapshotOptions {
  includeReadme?: boolean;
  maxFiles?: number;
  maxContentReads?: number;
  maxTextKb?: number;
}

export interface CollectSnapshotResult {
  snapshot?: RepositorySnapshot;
  error?: GitHubAdapterError;
  warnings: string[];
  commitCount?: number;
}

const PRIORITY_CONTENT_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /^package\.json$/i, label: 'manifest' },
  { pattern: /^README(\.[a-zA-Z0-9]+)?$/i, label: 'readme' },
  { pattern: /^tsconfig\.json$/i, label: 'tsconfig' },
  { pattern: /(^|\/)vercel\.json$/i, label: 'deploy' },
  { pattern: /(^|\/)netlify\.toml$/i, label: 'deploy' },
  { pattern: /(^|\/)Dockerfile$/i, label: 'deploy' },
  { pattern: /(^|\/)next\.config\./i, label: 'framework' },
  { pattern: /\.github\/workflows\/.+\.ya?ml$/i, label: 'ci' },
  { pattern: /schema\.prisma$/i, label: 'db' },
  { pattern: /(^|\/)(server|app|index|main)\.(ts|js)$/i, label: 'entry' },
  { pattern: /\.(tsx?|jsx?)$/i, label: 'source' },
  { pattern: /\.(css|scss|less)$/i, label: 'style' },
  { pattern: /\.html?$/i, label: 'html' },
  { pattern: /\.(sql)$/i, label: 'db' },
];

export async function collectRepositorySnapshot(
  adapter: GitHubMcpAdapter,
  rawRef: string,
  options: CollectSnapshotOptions = {}
): Promise<CollectSnapshotResult> {
  try {
  const warnings: string[] = [];
  let ref: RepositoryRef;
  try {
    ref = parseRepositoryReference(rawRef);
  } catch (e) {
    return { error: e as GitHubAdapterError, warnings: [] };
  }

  const budget = {
    maxFilePaths: options.maxFiles ?? CONFIG.budget.maxFilePaths,
    maxContentReads: options.maxContentReads ?? CONFIG.budget.maxContentReads,
    maxTextKb: options.maxTextKb ?? CONFIG.budget.maxRetainedTextKb,
  };

  const { branch, error: branchErr } = await adapter.getDefaultBranch(ref);
  const effectiveBranch = ref.branch || branch;
  if (branchErr) {
    if (branchErr.code === 'ACCESS_DENIED' || branchErr.code === 'RATE_LIMITED' || branchErr.code === 'PROVIDER_UNAVAILABLE') {
      return { error: branchErr, warnings };
    }
  }

  const { files: rawFiles, error: listErr } = await adapter.listFiles(ref, effectiveBranch);
  if (listErr) return { error: listErr, warnings };

  const excluded: string[] = [];
  const allowedFiles: FileNode[] = [];
  for (const f of rawFiles) {
    if (isPathExcluded(f.path)) {
      excluded.push(f.path);
      continue;
    }
    allowedFiles.push(f);
  }

  const fileCountBefore = allowedFiles.length;
  if (allowedFiles.length > budget.maxFilePaths) {
    warnings.push(
      `Repository has ${fileCountBefore} files; analysis sampled to ${budget.maxFilePaths} using safe budget limits.`
    );
  }

  const byPriority: FileNode[][] = PRIORITY_CONTENT_PATTERNS.map(() => []);
  const rest: FileNode[] = [];
  for (const f of allowedFiles) {
    let placed = false;
    for (let i = 0; i < PRIORITY_CONTENT_PATTERNS.length; i++) {
      if (PRIORITY_CONTENT_PATTERNS[i].pattern.test(f.path)) {
        byPriority[i].push(f);
        placed = true;
        break;
      }
    }
    if (!placed) rest.push(f);
  }

  const budgetedFiles: FileNode[] = [];
  for (const group of byPriority) budgetedFiles.push(...group);
  budgetedFiles.push(...rest);

  const truncatedFileList = budgetedFiles.slice(0, budget.maxFilePaths);

  const manifestPath = truncatedFileList.find((f) => /^package\.json$/i.test(f.path));
  let manifest: ManifestData | undefined;
  if (manifestPath) {
    const read = await adapter.readFile(ref, manifestPath.path, effectiveBranch);
    if (!read.error && read.content) {
      try {
        const parsed = JSON.parse(read.content);
        manifest = {
          name: parsed.name,
          dependencies: parsed.dependencies,
          devDependencies: parsed.devDependencies,
          scripts: parsed.scripts,
          raw: read.content,
          sourcePath: manifestPath.path,
        };
      } catch {
        warnings.push('package.json was present but could not be parsed as JSON.');
      }
    } else if (read.error) {
      warnings.push(`Could not read package.json: ${read.error.message}`);
    }
  }

  let readme: string | undefined;
  if (options.includeReadme !== false) {
    const readmePath = truncatedFileList.find((f) => /^README(\.[a-zA-Z0-9]+)?$/i.test(f.path.split('/').pop() || f.path));
    if (readmePath) {
      const r = await adapter.readFile(ref, readmePath.path, effectiveBranch);
      if (!r.error && r.content) readme = r.content;
    }
  }

  const contentReadBudget = budget.maxContentReads - (manifest ? 1 : 0) - (readme ? 1 : 0);
  const candidatePaths = truncatedFileList.filter((f) => {
    if (manifest && f.path === manifest?.sourcePath) return false;
    if (readme && /^README(\.[a-zA-Z0-9]+)?$/i.test(f.path.split('/').pop() || '')) return false;
    if (f.type !== 'file') return false;
    if (/\.(png|jpe?g|gif|ico|woff|binary)$/i.test(f.path)) return false;
    if ((f.size || 0) > 500_000) return false;
    return true;
  });

  const toRead: FileNode[] = candidatePaths.slice(0, Math.max(0, contentReadBudget));
  const selectedFiles: SelectedFileContent[] = [];
  let retainedKb = 0;
  const maxBytes = budget.maxTextKb * 1024;

  for (const f of toRead) {
    if (retainedKb * 1024 >= maxBytes) {
      warnings.push('Content sampling stopped after hitting text retention budget.');
      break;
    }
    const r = await adapter.readFile(ref, f.path, effectiveBranch);
    if (r.error || r.content === undefined) continue;
    let content = r.content;
    const remaining = Math.max(0, maxBytes - retainedKb * 1024);
    let truncated = false;
    if (Buffer.byteLength(content, 'utf-8') > remaining) {
      const arr = Buffer.from(content, 'utf-8');
      content = arr.slice(0, remaining).toString('utf-8');
      truncated = true;
    }
    retainedKb += Buffer.byteLength(content, 'utf-8') / 1024;
    selectedFiles.push({
      path: f.path,
      content,
      truncated,
      truncatedAt: truncated ? content.length : undefined,
    });
  }

  let commitCount: number | undefined;
  const commitsRes = await adapter.listCommits(ref, effectiveBranch, 20);
  if (!commitsRes.error) {
    commitCount = commitsRes.count;
  } else if (commitsRes.error?.code !== 'ACCESS_DENIED') {
    warnings.push(`Commit history unavailable: ${commitsRes.error.message}`);
  }

  const truncation: TruncationInfo = {
    fileCount: { budget: budget.maxFilePaths, used: truncatedFileList.length },
    contentRead: {
      budget: budget.maxContentReads,
      used: (manifest ? 1 : 0) + (readme ? 1 : 0) + selectedFiles.length,
    },
    totalTextKb: { budget: budget.maxTextKb, used: Math.round(retainedKb) },
    pathsExcluded: excluded.slice(0, 50),
  };
  if (fileCountBefore > budget.maxFilePaths) {
    truncation.pathsExcluded.push(`... and ${fileCountBefore - budget.maxFilePaths} additional paths beyond file budget`);
  }

  return {
    snapshot: {
      repository: { ...ref, branch: effectiveBranch },
      branch: effectiveBranch,
      files: truncatedFileList,
      manifest,
      readme,
      selectedFiles,
      collectedAt: new Date().toISOString(),
      truncation,
      warnings,
    },
    warnings,
    commitCount,
  };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      error: {
        code: 'PROVIDER_UNAVAILABLE',
        message: `Snapshot collection failed unexpectedly: ${message}`,
        retryable: true,
        details: { cause: message },
      },
      warnings: [],
    };
  }
}
