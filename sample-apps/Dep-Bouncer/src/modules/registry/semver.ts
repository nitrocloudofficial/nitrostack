/**
 * Semver helpers without a dependency: parse, compare, and expand npm comparator ranges.
 */

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
  raw: string;
}

const SEMVER = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export function parse(version: string): SemVer | null {
  if (typeof version !== 'string') return null;
  const m = SEMVER.exec(version.trim());
  if (!m) return null;
  if (m.slice(1, 4).some(n => !Number.isSafeInteger(Number(n)) || !/^(0|[1-9]\d*)$/.test(n))) return null;
  if (m[4]?.split('.').some(id => !id || (/^\d+$/.test(id) && id.length > 1 && id[0] === '0'))) return null;
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    prerelease: m[4] ? m[4].split('.') : [],
    raw: version,
  };
}

export function isPrerelease(version: string): boolean {
  return (parse(version)?.prerelease.length ?? 0) > 0;
}

export function compare(a: string, b: string): number {
  const x = parse(a);
  const y = parse(b);
  if (!x || !y) return a.localeCompare(b);
  for (const k of ['major', 'minor', 'patch'] as const) {
    if (x[k] !== y[k]) return x[k] - y[k];
  }
  if (!x.prerelease.length || !y.prerelease.length) {
    return y.prerelease.length - x.prerelease.length;
  }
  const n = Math.max(x.prerelease.length, y.prerelease.length);
  for (let i = 0; i < n; i++) {
    const p = x.prerelease[i];
    const q = y.prerelease[i];
    if (p === undefined) return -1;
    if (q === undefined) return 1;
    const pn = /^\d+$/.test(p);
    const qn = /^\d+$/.test(q);
    if (pn && qn && Number(p) !== Number(q)) return Number(p) - Number(q);
    if (pn !== qn) return pn ? -1 : 1;
    if (p !== q) return p < q ? -1 : 1;
  }
  return 0;
}

/** npm comparator sets, unions, partials and hyphens. Unsupported syntax fails closed. */
export function satisfies(version: string, range: string): boolean {
  const v = parse(version);
  if (!v || typeof range !== 'string') return false;
  const sets = range.split('||').map(expandSet);
  if (sets.some(set => set === null)) return false;
  if (sets.some(set => set!.some(c => !parse(c.version)))) return false;
  // npm simplifies a union containing a wildcard to the wildcard alone.
  if (sets.some(set => set!.length === 0)) return v.prerelease.length === 0;
  return sets.some(set => set!.every(c => testComparator(version, c))
    && (!v.prerelease.length || set!.some(c => {
      const target = parse(c.version)!;
      return target.prerelease.length > 0 && target.major === v.major
        && target.minor === v.minor && target.patch === v.patch;
    })));
}

type Operator = '=' | '>' | '>=' | '<' | '<=';
interface Comparator { op: Operator; version: string }
interface PartialVersion { major: number; minor: number; patch: number; count: number; lower: string }

function partial(body: string): PartialVersion | null {
  const full = parse(body);
  if (full) return { ...full, count: 3, lower: body };
  const match = /^v?(\d+|[xX*])(?:\.(\d+|[xX*]))?(?:\.(\d+|[xX*]))?$/.exec(body);
  if (!match) return null;
  const numbers: number[] = [];
  let wildcard = false;
  for (const item of match.slice(1)) {
    if (item === undefined || /^[xX*]$/.test(item)) wildcard = true;
    else {
      if (wildcard || !/^(0|[1-9]\d*)$/.test(item) || !Number.isSafeInteger(Number(item))) return null;
      numbers.push(Number(item));
    }
  }
  // A complete numeric version that parse rejected is invalid, not a partial.
  if (numbers.length === 3) return null;
  const [major = 0, minor = 0, patch = 0] = numbers;
  return { major, minor, patch, count: numbers.length, lower: `${major}.${minor}.${patch}` };
}

function upper(p: PartialVersion): string {
  return p.count <= 1 ? `${p.major + 1}.0.0-0` : `${p.major}.${p.minor + 1}.0-0`;
}

function expand(operator: string, body: string): Comparator[] | null {
  const p = partial(body);
  if (!p) return null;
  const c = (op: Operator, version: string): Comparator => ({ op, version });
  if (p.count === 0) return operator === '<' || operator === '>' ? [c('<', '0.0.0-0')] : [];
  if (operator === '^' || operator === '~') {
    const limit = operator === '~'
      ? (p.count === 1 ? `${p.major + 1}.0.0-0` : `${p.major}.${p.minor + 1}.0-0`)
      : p.major > 0 || p.count === 1 ? `${p.major + 1}.0.0-0`
        : p.minor > 0 || p.count === 2 ? `0.${p.minor + 1}.0-0` : `0.0.${p.patch + 1}-0`;
    return [c('>=', p.lower), c('<', limit)];
  }
  if (p.count === 3) return [c((operator || '=') as Operator, p.lower)];
  switch (operator) {
    case '': case '=': return [c('>=', p.lower), c('<', upper(p))];
    case '>': return [c('>=', upper(p).replace(/-0$/, ''))];
    case '>=': return [c('>=', p.lower)];
    case '<': return [c('<', `${p.lower}-0`)];
    case '<=': return [c('<', upper(p))];
    default: return null;
  }
}

function expandSet(set: string): Comparator[] | null {
  const hyphen = /^\s*(\S+)\s+-\s+(\S+)\s*$/.exec(set);
  if (hyphen) {
    const a = partial(hyphen[1]);
    const b = partial(hyphen[2]);
    if (!a || !b) return null;
    return [
      ...(a.count ? [{ op: '>=' as const, version: a.lower }] : []),
      ...(b.count ? [{ op: b.count === 3 ? '<=' as const : '<' as const,
        version: b.count === 3 ? b.lower : upper(b) }] : []),
    ];
  }
  const normalized = set.trim().replace(/(>=|<=|>|<|=|\^|~)\s+(?=[v\d*xX])/g, '$1');
  if (!normalized) return [];
  const out: Comparator[] = [];
  for (const token of normalized.split(/\s+/)) {
    const match = /^(\^|~|>=|<=|>|<|=)?(.+)$/.exec(token);
    if (!match) return null;
    const comparators = expand(match[1] ?? '', match[2]);
    if (!comparators) return null;
    out.push(...comparators);
  }
  return out;
}

function testComparator(version: string, comparator: Comparator): boolean {
  const order = compare(version, comparator.version);
  switch (comparator.op) {
    case '=': return order === 0;
    case '>': return order > 0;
    case '>=': return order >= 0;
    case '<': return order < 0;
    case '<=': return order <= 0;
  }
}
