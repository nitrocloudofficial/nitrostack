// Finds the projects inside a repository from its file list (no extra disk walk). A project is a folder that holds a
// package.json or a composer.json. Pure functions.
//
// What is looked at and what is not (each ignore has a reason; docs/EVAL_RESULTS.md section 4 repeats this list):
//  - depth: folders up to 3 levels below the root (a/b/c). Deeper manifests are counted, not assessed.
//  - never read at all (files.ts SKIP_DIRS): node_modules, vendor, bower_components (third-party code), .git, dist, build,
//    .next, __pycache__ (generated), fixtures, fixture, __fixtures__, testdata (sample projects built to look old or
//    vulnerable; assessing them as the project gives false findings).
//  - read for repo-wide rules, but never a project: test, tests, __tests__, spec (harnesses and sample apps used by the test
//    suite), examples, example, samples, sample, demo, demos (documentation code that depends on the real project, is not
//    shipped, and would mix a second dependency set into the score), and hidden folders (tool config, no product code).
//    They are listed as ignored so nothing is hidden; pass `subfolder` to assess one of them on purpose.
export type ProjectStack = 'node' | 'php' | 'mixed';
export interface ProjectRef {
  path: string; // '' for the repository root
  stack: ProjectStack;
}
export interface Discovery {
  rootHasManifest: boolean;
  projects: ProjectRef[]; // root first, then shallower before deeper, then by path
  ignored: Array<{ path: string; reason: string }>; // manifests inside ignored folders
  tooDeep: number; // manifests deeper than MAX_DEPTH
}

export const MAX_DEPTH = 3;
export const MAX_PROJECTS = 5;
export const MANIFESTS = ['package.json', 'composer.json'] as const;

const TEST_DIRS = new Set(['test', 'tests', '__tests__', 'spec']);
const EXAMPLE_DIRS = new Set(['examples', 'example', 'samples', 'sample', 'demo', 'demos']);

function ignoreReason(segment: string): string | undefined {
  const s = segment.toLowerCase();
  if (TEST_DIRS.has(s)) return 'test folder';
  if (EXAMPLE_DIRS.has(s)) return 'example or demo folder';
  if (s.startsWith('.')) return 'hidden folder';
  return undefined;
}

export function discoverProjects(paths: string[]): Discovery {
  const found = new Map<string, Set<string>>(); // folder -> manifest names
  for (const p of paths) {
    const i = p.lastIndexOf('/');
    const name = p.slice(i + 1);
    if (!(MANIFESTS as readonly string[]).includes(name)) continue;
    const dir = i === -1 ? '' : p.slice(0, i);
    found.set(dir, (found.get(dir) ?? new Set()).add(name));
  }
  const projects: ProjectRef[] = [];
  const ignored: Discovery['ignored'] = [];
  let tooDeep = 0;
  for (const [dir, names] of found) {
    const segments = dir === '' ? [] : dir.split('/');
    if (segments.length > MAX_DEPTH) {
      tooDeep++;
      continue;
    }
    const reason = segments.map(ignoreReason).find((r) => r !== undefined);
    if (reason) {
      ignored.push({ path: dir, reason });
      continue;
    }
    projects.push({ path: dir, stack: names.has('package.json') && names.has('composer.json') ? 'mixed' : names.has('package.json') ? 'node' : 'php' });
  }
  const depth = (p: string) => (p === '' ? 0 : p.split('/').length);
  projects.sort((a, b) => depth(a.path) - depth(b.path) || a.path.localeCompare(b.path));
  ignored.sort((a, b) => a.path.localeCompare(b.path));
  return { rootHasManifest: found.has('') && projects.some((p) => p.path === ''), projects, ignored, tooDeep };
}

// Nearest enclosing project folder for a file path ('' = root project), among the given project folders; undefined when none.
export function ownerOf(path: string, projectPaths: string[]): string | undefined {
  let best: string | undefined;
  for (const p of projectPaths) {
    if (p === '' || path.startsWith(`${p}/`)) if (best === undefined || p.length > best.length) best = p;
  }
  return best;
}

export const shown = (path: string): string => (path === '' ? '.' : path);
