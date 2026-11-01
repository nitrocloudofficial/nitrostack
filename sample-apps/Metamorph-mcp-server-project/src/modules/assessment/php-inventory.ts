// PHP project inventory (composer files) and line-based legacy-code smell detection. Pure functions, no I/O.
import { SEVERITY_RANK, type DepRef, type Finding } from './types.js';

export interface PhpInputs {
  composerJson?: string;
  composerLock?: string;
}

export interface PhpInventory {
  hasComposer: boolean;
  hasLock: boolean;
  valid: boolean; // false when composer.json is unparsable
  phpConstraint?: string;
  minPhp?: string; // "major.minor" of the lowest PHP the constraint allows
  framework?: string;
  deps: DepRef[];
  phpFileCount: number;
}

export interface PhpSource {
  path: string;
  content: string;
}

// End-of-security-support dates (ISO). Verified 2026-10-30 against
// https://www.php.net/eol.php (branches 5.0 to 8.1) and https://www.php.net/supported-versions.php (8.2 to 8.5,
// "Security Support Until"). Versions not verified there are deliberately absent.
export const PHP_EOL: Record<string, string> = {
  '5.0': '2005-09-05',
  '5.1': '2006-08-24',
  '5.2': '2011-01-06',
  '5.3': '2014-08-14',
  '5.4': '2015-09-03',
  '5.5': '2016-07-21',
  '5.6': '2018-12-31',
  '7.0': '2019-01-10',
  '7.1': '2019-12-01',
  '7.2': '2020-11-30',
  '7.3': '2021-12-06',
  '7.4': '2022-11-28',
  '8.0': '2023-11-26',
  '8.1': '2025-12-31',
  '8.2': '2026-12-31',
  '8.3': '2027-12-31',
  '8.4': '2028-12-31',
  '8.5': '2029-12-31'
};

const MAX_FILES = 200;
const MAX_BYTES = 200 * 1024;
const MAX_PER_RULE = 5;
const MAX_FINDINGS = 40;
const EOL_WARN_DAYS = 180;
const DAY_MS = 86_400_000;

type Json = Record<string, unknown>;

function isRecord(v: unknown): v is Json {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function parseJson(text: string | undefined): unknown {
  if (text === undefined || text.trim() === '') return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function cmp(a: number[], b: number[]): number {
  for (let i = 0; i < 3; i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

// Lowest version a composer constraint allows, as [major, minor, patch]; undefined when none can be read.
function lowestVersion(constraint: string): number[] | undefined {
  let best: number[] | undefined;
  for (const alt of constraint.split(/\|\|?/)) {
    const first = alt.trim().split(/[\s,]+/)[0] ?? '';
    const m = /^(?:[\^~]|>=?|=)?v?(\d+)(?:\.(\d+|[*xX]))?(?:\.(\d+|[*xX]))?/.exec(first);
    if (!m) continue;
    const v = [1, 2, 3].map((i) => (m[i] && /^\d+$/.test(m[i]) ? Number(m[i]) : 0));
    if (!best || cmp(v, best) < 0) best = v;
  }
  return best;
}

function lockVersions(lock: unknown): Map<string, string> {
  const out = new Map<string, string>();
  if (!isRecord(lock)) return out;
  for (const key of ['packages', 'packages-dev']) {
    const list = lock[key];
    if (!Array.isArray(list)) continue;
    for (const p of list) {
      if (isRecord(p) && typeof p.name === 'string' && typeof p.version === 'string') out.set(p.name, p.version.replace(/^v/i, ''));
    }
  }
  return out;
}

const FRAMEWORKS: Array<[string, RegExp]> = [
  ['laravel', /^laravel\/(framework|lumen-framework)$/],
  ['slim', /^slim\/slim$/],
  ['codeigniter', /^codeigniter4?\/framework$/],
  ['cakephp', /^cakephp\/cakephp$/],
  ['yii', /^yiisoft\/yii2?(-framework)?$/],
  ['wordpress', /^(johnpbloch|roots)\/wordpress$|^roots\/bedrock$/],
  ['symfony', /^symfony\//]
];

function detectFramework(names: string[]): string | undefined {
  for (const [fw, re] of FRAMEWORKS) if (names.some((n) => re.test(n))) return fw;
  return undefined;
}

const COMPOSER_NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*$/;
const isComposerName = (name: string): boolean => name.length <= 214 && COMPOSER_NAME.test(name);

export function inventoryPhp(inputs: PhpInputs, phpFileCount: number): PhpInventory {
  const hasComposer = (inputs.composerJson ?? '').trim() !== '';
  const hasLock = (inputs.composerLock ?? '').trim() !== '';
  const inv: PhpInventory = { hasComposer, hasLock, valid: true, deps: [], phpFileCount };
  if (!hasComposer) return inv;

  const json = parseJson(inputs.composerJson);
  if (!isRecord(json)) return { ...inv, valid: false };

  const locked = lockVersions(parseJson(inputs.composerLock));
  const names: string[] = [];
  const seen = new Set<string>();
  for (const [section, dev] of [['require', false], ['require-dev', true]] as const) {
    const block = json[section];
    if (!isRecord(block)) continue;
    for (const [name, range] of Object.entries(block)) {
      if (typeof range !== 'string') continue;
      if (name === 'php') {
        if (!dev) {
          inv.phpConstraint = range;
          const v = lowestVersion(range);
          if (v) inv.minPhp = `${v[0]}.${v[1]}`;
        }
        continue;
      }
      if (name.startsWith('ext-') || seen.has(name) || !isComposerName(name)) continue; // identifier-shaped names only: text with spaces is not a package
      seen.add(name);
      names.push(name);
      const lockedVersion = locked.get(name);
      const exact = lockedVersion !== undefined && /^[0-9A-Za-z][0-9A-Za-z.+_~-]{0,63}$/.test(lockedVersion) ? lockedVersion : undefined;
      if (exact) {
        inv.deps.push({ name, version: exact, dev, approximate: false });
      } else {
        const v = lowestVersion(range) ?? [0, 0, 0];
        inv.deps.push({ name, version: v.join('.'), dev, approximate: true });
      }
    }
  }
  const fw = detectFramework(names);
  if (fw) inv.framework = fw;
  return inv;
}

export function phpFindings(inv: PhpInventory, today: Date = new Date()): Finding[] {
  const out: Finding[] = [];

  if (!inv.hasComposer) {
    if (inv.phpFileCount > 0) {
      out.push({
        id: 'composer-missing',
        category: 'dependencies',
        severity: 'medium',
        title: 'PHP files found but no composer.json',
        evidence: `${inv.phpFileCount} PHP files`,
        recommendation: 'Introduce Composer and declare the vendored or hand-included libraries so versions can be audited.'
      });
    }
    return out;
  }
  if (!inv.valid) return out;

  if (inv.minPhp) {
    const eol = PHP_EOL[inv.minPhp];
    if (eol) {
      const t = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
      const days = Math.round((Date.parse(`${eol}T00:00:00Z`) - t) / DAY_MS);
      if (days < 0) {
        out.push({
          id: 'php-version-eol',
          category: 'runtime',
          severity: 'high',
          title: `PHP ${inv.minPhp} no longer receives security fixes`,
          evidence: `PHP ${inv.minPhp} ended ${eol}`,
          recommendation: 'Raise the PHP requirement to a version that still receives security support.'
        });
      } else if (days <= EOL_WARN_DAYS) {
        out.push({
          id: 'php-version-eol',
          category: 'runtime',
          severity: 'medium',
          title: `PHP ${inv.minPhp} security support ends within ${EOL_WARN_DAYS} days`,
          evidence: `PHP ${inv.minPhp} ends ${eol}`,
          recommendation: 'Plan the upgrade to a newer PHP version before security support ends.'
        });
      }
    }
  }

  if (!inv.hasLock) {
    out.push({
      id: 'composer-no-lock',
      category: 'dependencies',
      severity: 'medium',
      title: 'composer.json has no composer.lock',
      recommendation: 'Run composer install and commit composer.lock so dependency versions are exact and auditable.'
    });
  }

  const approx = inv.deps.filter((d) => d.approximate).length;
  if (approx > 0) {
    out.push({
      id: 'php-approximate-versions',
      category: 'dependencies',
      severity: 'info',
      title: 'Some dependency versions are estimated from ranges',
      evidence: `${approx} of ${inv.deps.length} dependencies`,
      recommendation: 'Provide composer.lock to get exact versions for vulnerability matching.'
    });
  }

  if (!inv.phpConstraint) {
    out.push({
      id: 'php-unpinned-version',
      category: 'runtime',
      severity: 'low',
      title: 'composer.json declares no PHP version',
      recommendation: 'Add a php constraint to require in composer.json so the target runtime is explicit.'
    });
  }

  return out;
}

interface LineRule {
  id: string;
  category: Finding['category'];
  severity: Finding['severity'];
  title: string;
  recommendation: string;
  test: (line: string) => boolean;
}

const SUPERGLOBAL = /\$_(?:GET|POST|REQUEST|COOKIE)\b/;

// Text that marks a value as a password: "pass" (password, passwd, $pass), "pwd", or a bare pw ($pw, ['pw']).
// A line that only hashes something else (a file, a cache key) has none of these and is not reported.
const PASSWORD_LIKE = /pass|pwd|(?<![a-z])pw(?![a-z])/i;

// mysql_* call, but not a definition: `function mysql_query_count(` defines a method or shim and is not a use of the removed API.
function usesRemovedMysqlApi(line: string): boolean {
  for (const m of line.matchAll(/(?<![\w>:$])mysql_\w+\s*\(/gi)) {
    if (!/\bfunction\s+&?\s*$/i.test(line.slice(0, m.index))) return true;
  }
  return false;
}

const LINE_RULES: LineRule[] = [
  {
    id: 'php-mysql-removed-api',
    category: 'runtime',
    severity: 'high',
    title: 'Uses the mysql_* API removed in PHP 7.0',
    recommendation: 'Migrate to PDO or mysqli with prepared statements.',
    test: usesRemovedMysqlApi
  },
  {
    id: 'php-sql-concatenation',
    category: 'security',
    severity: 'high',
    title: 'SQL query built from request input',
    recommendation: 'Use PDO prepared statements with bound parameters instead of building SQL strings.',
    test: (l) => /(?:mysql_query|mysqli_query|->query|->exec)\s*\(/i.test(l) && SUPERGLOBAL.test(l)
  },
  {
    id: 'php-eval',
    category: 'security',
    severity: 'high',
    title: 'Dynamic code execution with eval',
    recommendation: 'Remove eval and replace it with explicit logic or a safe lookup table.',
    test: (l) => /(?<![\w>:$])eval\s*\(/i.test(l)
  },
  {
    id: 'php-weak-password-hash',
    category: 'security',
    severity: 'medium',
    title: 'Password hashed with md5 or sha1',
    recommendation: 'Use password_hash and password_verify with the default algorithm.',
    test: (l) => /(?<![\w>:$])(?:md5|sha1)\s*\(/i.test(l) && PASSWORD_LIKE.test(l)
  },
  {
    id: 'php-unserialize-input',
    category: 'security',
    severity: 'high',
    title: 'unserialize on request input',
    recommendation: 'Decode request data with json_decode instead of unserialize.',
    test: (l) => /(?<![\w>:$])unserialize\s*\(/i.test(l) && SUPERGLOBAL.test(l)
  },
  {
    id: 'php-dynamic-include',
    category: 'security',
    severity: 'high',
    title: 'include or require path taken from request input',
    recommendation: 'Map request values to a fixed allowlist of files before including anything.',
    test: (l) => /(?<![\w>:$])(?:include|require)(?:_once)?\b[^;]*\$_(?:GET|POST|REQUEST|COOKIE)\b/i.test(l)
  },
  {
    id: 'php-extract-input',
    category: 'security',
    severity: 'medium',
    title: 'extract on request input',
    recommendation: 'Read the specific request keys you need instead of extracting superglobals into variables.',
    test: (l) => /(?<![\w>:$])extract\s*\(\s*\$_/i.test(l)
  },
  {
    id: 'php-errors-hidden',
    category: 'standards',
    severity: 'low',
    title: 'Error reporting disabled or display_errors enabled in code',
    recommendation: 'Configure error reporting and display_errors per environment outside the code and log errors in production.',
    test: (l) => /error_reporting\s*\(\s*0\s*\)/i.test(l) || /display_errors['"]?\s*[,=]\s*['"]?(?:1|on|true)\b/i.test(l)
  }
];

const HTML_TAG = /<\/?[a-z][a-z0-9]*[\s>/]/gi;

function isComment(line: string): boolean {
  const t = line.trimStart();
  return t.startsWith('//') || t.startsWith('#') || t.startsWith('*') || t.startsWith('/*');
}

interface Hit {
  rule: Omit<LineRule, 'test'>;
  path: string;
  line?: number;
}

export function scanPhpSources(files: PhpSource[]): Finding[] {
  const hits: Hit[] = [];
  const perRule = new Map<string, number>();
  const room = (id: string) => (perRule.get(id) ?? 0) < MAX_PER_RULE;
  const add = (hit: Hit) => {
    perRule.set(hit.rule.id, (perRule.get(hit.rule.id) ?? 0) + 1);
    hits.push(hit);
  };

  for (const file of files.slice(0, MAX_FILES)) {
    const content = file.content.length > MAX_BYTES ? file.content.slice(0, MAX_BYTES) : file.content;
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      if (isComment(line)) continue;
      for (const { test, ...rule } of LINE_RULES) {
        if (room(rule.id) && test(line)) add({ rule, path: file.path, line: i + 1 });
      }
    }
    if (room('php-inline-html-mixed') && /<\?(?:php|=)/i.test(content) && (content.match(HTML_TAG)?.length ?? 0) >= 30) {
      add({
        rule: {
          id: 'php-inline-html-mixed',
          category: 'architecture',
          severity: 'info',
          title: 'PHP logic mixed with HTML markup in one file',
          recommendation: 'Move markup into templates and keep business logic in separate classes.'
        },
        path: file.path
      });
    }
  }

  hits.sort(
    (a, b) =>
      SEVERITY_RANK[b.rule.severity] - SEVERITY_RANK[a.rule.severity] ||
      (a.rule.id < b.rule.id ? -1 : a.rule.id > b.rule.id ? 1 : 0) ||
      (a.path < b.path ? -1 : a.path > b.path ? 1 : 0) ||
      (a.line ?? 0) - (b.line ?? 0)
  );

  return hits.slice(0, MAX_FINDINGS).map((h) => ({
    id: h.rule.id,
    category: h.rule.category,
    severity: h.rule.severity,
    title: h.rule.title,
    evidence: h.line === undefined ? h.path : `${h.path}:${h.line}`,
    recommendation: h.rule.recommendation
  }));
}
