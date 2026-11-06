export type LookalikeKind = 'typo' | 'scope-confusion' | 'separator' | 'suffix' | 'affix';
export interface Lookalike { name: string; distance: number; kind: LookalikeKind; }

export function damerauLevenshtein(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => {
    const row = Array<number>(b.length + 1).fill(0); row[0] = i; return row;
  });
  for (let j = 0; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    const cost = a[i - 1] === b[j - 1] ? 0 : 1;
    d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
      d[i]![j] = Math.min(d[i]![j]!, d[i - 2]![j - 2]! + cost);
  }
  return d[a.length]![b.length]!;
}

const stripScope = (s: string) => s.startsWith('@') ? s.slice(1).replace('/', '-') : s;
const SUFFIXES = ['-js', '.js', 'js', '-node', '2'];
const separators = (s: string) => s.replace(/[._-]/g, '');

function compare(name: string, target: string, maxDist: number): Lookalike | undefined {
  const a = stripScope(name).toLowerCase(), b = stripScope(target).toLowerCase();
  const distance = damerauLevenshtein(a, b);
  const scopeDiff = name.startsWith('@') !== target.startsWith('@') || name.includes('/') !== target.includes('/');
  if (!distance) return scopeDiff ? { name: target, distance, kind: 'scope-confusion' } : undefined;
  if (SUFFIXES.some(s => a === b + s || b === a + s)) return { name: target, distance, kind: 'suffix' };
  // Short names sit one or two edits away from many unrelated names, so allow less.
  const limit = b.length < 5 ? Math.min(maxDist, 1) : maxDist;
  if (distance <= limit) {
    const kind: LookalikeKind = scopeDiff
      ? 'scope-confusion'
      : separators(a) === separators(b) ? 'separator' : 'typo';
    return { name: target, distance, kind };
  }
  if (b.length >= 5) {
    const wordsA = a.split(/[-._]/), wordsB = b.split(/[-._]/);
    if (wordsA.length === wordsB.length + 1 &&
      (wordsA.slice(1).join('-') === wordsB.join('-') || wordsA.slice(0, -1).join('-') === wordsB.join('-')))
      return { name: target, distance, kind: 'affix' };
  }
  return undefined;
}

export function findLookalikes(name: string, popular: string[], maxDist = 2): Lookalike[] {
  if (popular.some(p => p.toLowerCase() === name.toLowerCase())) return [];
  return popular.map(p => compare(name, p, maxDist)).filter((x): x is Lookalike => x !== undefined)
    .sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name));
}
