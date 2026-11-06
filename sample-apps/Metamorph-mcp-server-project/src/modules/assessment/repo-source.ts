import type { ExecutionContext } from '@nitrostack/core';
import { rootManifestGuard } from './assess.js';
import { promises as fs } from 'node:fs';
import { archiveUrl, createWorkdir, extractTarGz, fetchArchive, parseGithubRepo, resolveInside } from '../../common/safe-archive.js';

// Unpacking holds the whole decompressed tar in memory (up to 80 MiB, plus parsing). scripts/load.mjs measured 589 MiB peak RSS
// for three simultaneous near-limit archives against 364 MiB for one, so unpacking runs one at a time; analysis still overlaps.
let unpackQueue: Promise<unknown> = Promise.resolve();
function oneAtATime<T>(fn: () => Promise<T>): Promise<T> {
  const run = unpackQueue.then(fn, fn);
  unpackQueue = run.catch(() => undefined);
  return run;
}

export interface RepoMeta {
  // Resolved 40-hex commit sha, read from the pax global header GitHub puts in every codeload tarball.
  commit?: string;
}

// Downloads a public GitHub repo into a private temp folder, runs `fn` on the (sub)folder and always cleans up.
// Error messages are safe to show to users: they never contain server paths.
export async function withRepo<T>(
  repoUrl: string,
  subfolder: string | undefined,
  ctx: Pick<ExecutionContext, 'logger'>,
  fn: (dir: string, meta: RepoMeta) => Promise<T>,
  deps: { fetchFn?: typeof fetch; requireProjectRoot?: boolean } = {}
): Promise<T> {
  let repo: ReturnType<typeof parseGithubRepo>;
  try {
    repo = parseGithubRepo(repoUrl);
  } catch {
    throw new Error('Invalid repository URL. Use a public GitHub link like https://github.com/owner/repo.');
  }
  ctx.logger.info('repo fetch', { owner: repo.owner, repo: repo.repo, ref: repo.ref ?? 'HEAD' });

  const work = await createWorkdir(process.env.METAMORPH_SANDBOX_DIR);
  try {
    let archive: Buffer;
    try {
      archive = await fetchArchive(archiveUrl(repo.owner, repo.repo, repo.ref), { fetchFn: deps.fetchFn });
    } catch {
      throw new Error('Could not download the repository. Only public GitHub repositories up to 25 MB are supported; check the URL and branch name.');
    }
    let meta: RepoMeta = {};
    try {
      const r = await oneAtATime(() => extractTarGz(archive, work.dir));
      meta = r.commit ? { commit: r.commit } : {};
    } catch {
      throw new Error('The repository archive could not be unpacked safely (too large, too many files, or unexpected content). Try a smaller repository: the limits are 25 MB to download, 80 MiB unpacked and 5,000 files.');
    }
    let root: string;
    try {
      root = await resolveInside(work.dir, subfolder ?? '');
      if (!(await fs.stat(root)).isDirectory()) throw new Error('not a directory'); // a missing or file subfolder must not reach the analysis (its errors name server paths)
    } catch {
      throw new Error('The subfolder is not valid. Use a path inside the repository, like apps/api.');
    }
    // Tools that plan or patch one project's files need a project at the folder they act on: say so instead of acting on nothing.
    if (deps.requireProjectRoot && !subfolder) await rootManifestGuard(root);
    return await fn(root, meta);
  } finally {
    await work.cleanup();
  }
}
