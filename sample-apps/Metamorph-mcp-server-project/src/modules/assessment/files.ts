import { constants } from 'node:fs';
import type { Stats } from 'node:fs';
import { lstat, open, readdir } from 'node:fs/promises';
import { join } from 'node:path';

export interface KeyFiles {
  paths: string[];
  contents: Record<string, string>;
  php: Array<{ path: string; content: string }>;
  // Source and config text files (other than the key files and PHP) kept only for the secrets scan; never returned to callers.
  scan: Array<{ path: string; content: string }>;
  // GitHub Actions workflow files (.github/workflows/*.yml|yaml), for the risky-CI rules.
  workflows: Array<{ path: string; content: string }>;
  truncated: boolean;
}

export const KEY_FILES: readonly string[] = [
  'package.json',
  'package-lock.json',
  'npm-shrinkwrap.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '.nvmrc',
  '.node-version',
  'composer.json',
  'composer.lock',
  'Dockerfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  'serverless.yml',
  'serverless.yaml',
  'vercel.json',
  'wrangler.toml',
  'netlify.toml',
  'Procfile',
  'app.yaml',
  '.htaccess',
  'nginx.conf',
  'components.json',
  'tsconfig.json'
];

// Lockfiles whose presence matters but whose (large) content is never stored.
const PRESENCE_ONLY = new Set(['yarn.lock', 'pnpm-lock.yaml']);
// Directories never read at all. Each is skipped for a stated reason (docs/EVAL_RESULTS.md section 4 lists them too):
//  third-party code    node_modules, vendor, bower_components: not the project's own code; their manifests and PHP would
//                      otherwise be assessed as if the team wrote them
//  VCS and build output .git, dist, build, .next, __pycache__: generated or tool-owned
//  test fixtures       fixtures, fixture, __fixtures__, testdata: sample projects that deliberately contain old, vulnerable or
//                      secret-looking content to test tools; assessing them as the project produces false findings
export const SKIP_DIRS = new Set(['node_modules', 'vendor', 'bower_components', '.git', 'dist', 'build', '.next', '__pycache__', 'fixtures', 'fixture', '__fixtures__', 'testdata']);

// Extensions whose text is scanned for hard-coded credentials. Documentation (.md, .txt) is deliberately left out: it is
// where example keys are written on purpose. Lockfiles and minified bundles are left out as generated.
const SCAN_EXT = /\.(?:m?[jt]sx?|cjs|py|rb|go|java|kt|cs|sh|bash|ya?ml|toml|ini|cfg|conf|properties|json|xml|pem|key)$/i;
const SCAN_SKIP_NAME = /(?:^|[.-])min\.(?:js|css)$|^package-lock\.json$|^npm-shrinkwrap\.json$|^composer\.lock$/i;
const WORKFLOW = /^\.github\/workflows\/[^/]+\.ya?ml$/;

export interface ReadLimits {
  maxFiles: number;
  maxDepth: number;
  maxFileBytes: number;
  maxPhpFiles: number;
  maxPhpBytes: number;
  maxScanFiles: number;
  maxScanFileBytes: number;
  maxScanTotalBytes: number;
}

export const DEFAULT_READ_LIMITS: ReadLimits = {
  maxFiles: 5000,
  maxDepth: 12,
  maxFileBytes: 256 * 1024,
  maxPhpFiles: 200,
  maxPhpBytes: 200 * 1024,
  maxScanFiles: 400,
  maxScanFileBytes: 128 * 1024,
  maxScanTotalBytes: 8 * 1024 * 1024
};

// Opens without following symlinks; returns null when unreadable, or when skipLarge is set and the file is over the limit.
async function readBounded(abs: string, maxBytes: number, skipLarge: boolean): Promise<string | null> {
  try {
    const handle = await open(abs, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const st = await handle.stat();
      if (!st.isFile() || (skipLarge && st.size > maxBytes)) return null;
      const buf = Buffer.alloc(Math.min(st.size, maxBytes));
      const { bytesRead } = await handle.read(buf, 0, buf.length, 0);
      return buf.subarray(0, bytesRead).toString('utf8');
    } finally {
      await handle.close();
    }
  } catch {
    return null;
  }
}

const ENV_TEMPLATE = /\.(example|sample|template|dist)$/i;

// Variable names of a dotenv file as bare `KEY=` lines; values and comments are dropped.
function keysOnly(text: string): string {
  const keys: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]{0,63})\s*=/);
    if (m && !keys.includes(m[1])) keys.push(m[1]);
  }
  return keys.map((k) => `${k}=\n`).join('');
}

export async function readKeyFiles(dir: string, limits?: Partial<ReadLimits>): Promise<KeyFiles> {
  const lim: ReadLimits = { ...DEFAULT_READ_LIMITS, ...limits };
  let rootStat: Stats;
  try {
    rootStat = await lstat(dir);
  } catch {
    throw new Error('Cannot read project directory. Check the subfolder path.'); // no server path in the message
  }
  if (!rootStat.isDirectory()) throw new Error('Not a directory. Check the subfolder path.');

  const result: KeyFiles = { paths: [], contents: {}, php: [], scan: [], workflows: [], truncated: false };
  let scanBytes = 0;
  const queue: Array<{ rel: string; depth: number }> = [{ rel: '', depth: 0 }];

  for (let i = 0; i < queue.length; i++) {
    const { rel, depth } = queue[i];
    let names: string[];
    try {
      names = (await readdir(join(dir, rel))).sort();
    } catch {
      continue;
    }
    for (const name of names) {
      const childRel = rel ? `${rel}/${name}` : name;
      const abs = join(dir, childRel);
      let st: Stats;
      try {
        st = await lstat(abs);
      } catch {
        continue;
      }
      if (st.isSymbolicLink()) continue;
      if (st.isDirectory()) {
        if (SKIP_DIRS.has(name)) continue;
        if (depth + 1 > lim.maxDepth) result.truncated = true;
        else queue.push({ rel: childRel, depth: depth + 1 });
        continue;
      }
      if (!st.isFile()) continue;
      if (result.paths.length >= lim.maxFiles) {
        result.truncated = true;
        return result;
      }
      result.paths.push(childRel);
      const topLevelEnv = rel === '' && /^\.env(\..+)?$/.test(name);
      // Top-level env files and .gitignore are kept so the env stage can list variable NAMES and check ignore rules.
      // A real env file is reduced to `KEY=` lines on read: its values never leave this function.
      if (KEY_FILES.includes(name) || topLevelEnv || (rel === '' && name === '.gitignore')) {
        if (PRESENCE_ONLY.has(name)) continue;
        const text = await readBounded(abs, lim.maxFileBytes, true);
        if (text !== null) result.contents[childRel] = topLevelEnv && !ENV_TEMPLATE.test(name) ? keysOnly(text) : text;
      } else if (name.endsWith('.php') && result.php.length < lim.maxPhpFiles) {
        const text = await readBounded(abs, lim.maxPhpBytes, false);
        if (text !== null) result.php.push({ path: childRel, content: text });
      } else if (WORKFLOW.test(childRel) && result.workflows.length < 50) {
        const text = await readBounded(abs, lim.maxFileBytes, true);
        if (text !== null) result.workflows.push({ path: childRel, content: text });
      } else if (SCAN_EXT.test(name) && !SCAN_SKIP_NAME.test(name) && !/^\.env/.test(name) && result.scan.length < lim.maxScanFiles && scanBytes < lim.maxScanTotalBytes) {
        const text = await readBounded(abs, lim.maxScanFileBytes, true);
        if (text !== null) {
          scanBytes += text.length;
          result.scan.push({ path: childRel, content: text });
        }
      }
    }
  }
  return result;
}
