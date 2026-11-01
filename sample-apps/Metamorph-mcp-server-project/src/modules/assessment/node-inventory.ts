// Node/JavaScript project inventory and modernization findings. Pure functions: no I/O, no clock reads.
import type { DepRef, Finding } from './types.js';
import { SEVERITY_RANK } from './types.js';

export interface NodeInputs {
  packageJson?: string;
  packageLock?: string;
  nvmrc?: string;
  nodeVersionFile?: string;
  dockerNodeMajor?: number;
}

export interface NodeInventory {
  name?: string;
  moduleType: 'module' | 'commonjs';
  declaredEngine?: string;
  minNodeMajor?: number;
  runtimeSource?: 'engines' | 'nvmrc' | 'docker';
  deps: DepRef[];
  frameworks: string[];
  uiLibraries: string[];
  scripts: string[];
  hasTests: boolean;
  hasLockfile: boolean;
  valid: boolean;
}

// End-of-life dates by Node major, from the official release schedule:
// https://raw.githubusercontent.com/nodejs/Release/main/schedule.json (verified 2026-10-30).
export const NODE_EOL: Record<number, string> = {
  10: '2021-04-30',
  12: '2022-04-30',
  14: '2023-04-30',
  16: '2023-09-11',
  18: '2025-04-30',
  20: '2026-04-30',
  22: '2027-04-30',
  24: '2028-04-30'
};

const EOL_WARNING_DAYS = 180;
const DAY_MS = 86_400_000;

const FRAMEWORKS: Record<string, string> = {
  express: 'express',
  fastify: 'fastify',
  koa: 'koa',
  '@nestjs/core': 'nestjs',
  next: 'next',
  react: 'react',
  vue: 'vue',
  '@angular/core': 'angular',
  svelte: 'svelte'
};
const SERVER_FRAMEWORKS = new Set(['express', 'fastify', 'koa', 'nestjs', 'next']);

const UI_EXACT: Record<string, string> = {
  '@mantine/core': 'mantine',
  ink: 'ink',
  tailwindcss: 'tailwind',
  '@mui/material': 'material-ui',
  '@material-ui/core': 'material-ui',
  bootstrap: 'bootstrap',
  'react-bootstrap': 'bootstrap'
};
const UI_PREFIX: Array<[string, string]> = [
  ['@radix-ui/', 'radix'],
  ['@chakra-ui/', 'chakra']
];
const SHADCN = 'shadcn-ui (heuristic)';
const UI_SYSTEMS = ['mantine', 'shadcn-ui', 'material-ui', 'chakra', 'bootstrap'];

const TEST_DEPS = new Set(['jest', 'vitest', 'mocha', 'ava', 'tap']);
const DEPRECATED: Record<string, string> = {
  request: 'Replace it with the built-in fetch or undici.',
  'node-sass': 'Replace it with sass.',
  tslint: 'Replace it with ESLint and typescript-eslint.'
};

type Json = Record<string, unknown>;

function asObject(v: unknown): Json {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : {};
}

function parseObject(text: string | undefined): Json | undefined {
  if (typeof text !== 'string' || !text.trim()) return undefined;
  try {
    const v: unknown = JSON.parse(text);
    return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : undefined;
  } catch {
    return undefined;
  }
}

function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function parseMinMajor(range: string): number | undefined {
  if (typeof range !== 'string') return undefined;
  let min: number | undefined;
  for (const m of range.matchAll(/(?<![\w.])v?(\d+)(?:\.(?:\d+|x|X|\*))*/g)) {
    const n = Number(m[1]);
    if (min === undefined || n < min) min = n;
  }
  return min;
}

// Lowest version a range allows; undefined for specs we refuse to guess (tags, git, file, url, workspace).
function lowestVersion(spec: string): string | undefined {
  const s = spec.trim();
  if (!s || /[:/]/.test(s)) return undefined;
  const cleaned = s.replace(/^[\s^~><=v]+/, '');
  const m = cleaned.match(/^(\d+)(?:\.(\d+|x|X|\*))?(?:\.(\d+|x|X|\*))?(-[\w.]+)?/);
  if (!m) return undefined;
  const num = (p: string | undefined): string => (p && /^\d+$/.test(p) ? p : '0');
  return `${m[1]}.${num(m[2])}.${num(m[3])}${m[4] ?? ''}`;
}

function lockedVersions(lock: Json): Map<string, string> {
  const out = new Map<string, string>();
  for (const [name, entry] of Object.entries(asObject(lock.dependencies))) {
    const v = asObject(entry).version;
    if (typeof v === 'string') out.set(name, v);
  }
  const prefix = 'node_modules/';
  for (const [key, entry] of Object.entries(asObject(lock.packages))) {
    if (!key.startsWith(prefix) || key.includes(prefix, prefix.length)) continue;
    const v = asObject(entry).version;
    if (typeof v === 'string') out.set(key.slice(prefix.length), v);
  }
  return out;
}

function emptyInventory(): NodeInventory {
  return {
    moduleType: 'commonjs',
    deps: [],
    frameworks: [],
    uiLibraries: [],
    scripts: [],
    hasTests: false,
    hasLockfile: false,
    valid: false
  };
}

function runtimeFrom(
  engine: string | undefined,
  inputs: NodeInputs
): Pick<NodeInventory, 'minNodeMajor' | 'runtimeSource'> {
  const fromEngine = engine ? parseMinMajor(engine) : undefined;
  if (fromEngine !== undefined) return { minNodeMajor: fromEngine, runtimeSource: 'engines' };
  for (const file of [inputs.nvmrc, inputs.nodeVersionFile]) {
    const major = typeof file === 'string' ? parseMinMajor(file.trim().split(/\r?\n/)[0] ?? '') : undefined;
    if (major !== undefined) return { minNodeMajor: major, runtimeSource: 'nvmrc' };
  }
  const d = inputs.dockerNodeMajor;
  if (typeof d === 'number' && Number.isInteger(d) && d > 0) return { minNodeMajor: d, runtimeSource: 'docker' };
  return {};
}

// Package names and versions end up in titles and recommendations. Only identifier-shaped text is accepted, so repository
// content cannot put a sentence there (docs/THREAT_MODEL.md, prompt injection through repository files).
const NPM_NAME = /^(?:@[A-Za-z0-9][A-Za-z0-9._~-]*\/)?[A-Za-z0-9][A-Za-z0-9._~-]*$/;
export const isRegistryName = (name: string): boolean => name.length <= 214 && NPM_NAME.test(name);
export const isVersionText = (v: string): boolean => /^[0-9A-Za-z][0-9A-Za-z.+_~-]{0,63}$/.test(v);

export function inventoryNode(inputs: NodeInputs): NodeInventory {
  try {
    const pkg = parseObject(inputs?.packageJson);
    if (!pkg) return emptyInventory();
    const inv = emptyInventory();
    inv.valid = true;
    if (typeof pkg.name === 'string') inv.name = pkg.name;
    inv.moduleType = pkg.type === 'module' ? 'module' : 'commonjs';
    const engine = asObject(pkg.engines).node;
    if (typeof engine === 'string') inv.declaredEngine = engine;
    Object.assign(inv, runtimeFrom(inv.declaredEngine, inputs));

    const lock = parseObject(inputs.packageLock);
    inv.hasLockfile = lock !== undefined;
    const locked = lock ? lockedVersions(lock) : new Map<string, string>();

    const declared = new Set<string>();
    for (const [field, dev] of [['dependencies', false], ['devDependencies', true]] as const) {
      for (const [name, spec] of Object.entries(asObject(pkg[field]))) {
        if (declared.has(name) || !isRegistryName(name)) continue; // a name with spaces or punctuation is text, not a package
        declared.add(name);
        const lockedVersion = locked.get(name);
        const exact = lockedVersion !== undefined && isVersionText(lockedVersion) ? lockedVersion : undefined;
        if (exact) {
          inv.deps.push({ name, version: exact, dev, approximate: false });
          continue;
        }
        const low = typeof spec === 'string' ? lowestVersion(spec) : undefined;
        if (low) inv.deps.push({ name, version: low, dev, approximate: true });
      }
    }
    inv.deps.sort((a, b) => cmp(a.name, b.name));

    // Detection uses every declared name, including specs skipped for versions.
    const frameworks = new Set<string>();
    const ui = new Set<string>();
    for (const name of declared) {
      const fw = FRAMEWORKS[name];
      if (fw) frameworks.add(fw);
      const exact = UI_EXACT[name];
      if (exact) ui.add(exact);
      for (const [prefix, label] of UI_PREFIX) if (name.startsWith(prefix)) ui.add(label);
    }
    if (declared.has('class-variance-authority') && declared.has('tailwind-merge')) ui.add(SHADCN);
    inv.frameworks = [...frameworks].sort();
    inv.uiLibraries = [...ui].sort();

    const scripts = asObject(pkg.scripts);
    inv.scripts = Object.keys(scripts).sort();
    const testScript = scripts.test;
    const realTestScript = typeof testScript === 'string' && !/no test specified/i.test(testScript);
    inv.hasTests = realTestScript || [...declared].some((n) => TEST_DEPS.has(n));
    return inv;
  } catch {
    return emptyInventory();
  }
}

function utcDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

const SOURCE_LABEL = { engines: 'engines.node', nvmrc: '.nvmrc / .node-version', docker: 'Docker image' } as const;
const EOL_ADVICE = 'Move to the current maintained LTS (Node 22 or 24).';

function runtimeEolFinding(inv: NodeInventory, today: Date): Finding | undefined {
  const major = inv.minNodeMajor;
  if (major === undefined || !inv.runtimeSource) return undefined;
  const source = SOURCE_LABEL[inv.runtimeSource];
  const eol = NODE_EOL[major];
  if (!eol) {
    if (major >= 10) return undefined;
    return {
      id: 'node-runtime-eol',
      category: 'runtime',
      severity: 'high',
      title: `Node ${major} is long past end of life`,
      evidence: `${source} requires Node ${major}`,
      recommendation: EOL_ADVICE
    };
  }
  const days = Math.round((Date.parse(`${eol}T00:00:00Z`) - utcDay(today)) / DAY_MS);
  if (days < 0) {
    return {
      id: 'node-runtime-eol',
      category: 'runtime',
      severity: 'high',
      title: `Node ${major} no longer receives security fixes`,
      evidence: `${source} requires Node ${major}; end of life was ${eol}`,
      recommendation: EOL_ADVICE
    };
  }
  if (days <= EOL_WARNING_DAYS) {
    return {
      id: 'node-runtime-eol',
      category: 'runtime',
      severity: 'medium',
      title: `Node ${major} reaches end of life soon`,
      evidence: `${source} requires Node ${major}; end of life is ${eol}`,
      recommendation: EOL_ADVICE
    };
  }
  return undefined;
}

export function nodeFindings(inv: NodeInventory, today: Date = new Date()): Finding[] {
  if (!inv.valid) return [];
  const out: Finding[] = [];

  const eol = runtimeEolFinding(inv, today);
  if (eol) out.push(eol);

  if (inv.minNodeMajor === undefined) {
    out.push({
      id: 'node-runtime-unpinned',
      category: 'runtime',
      severity: 'low',
      title: 'No Node version is pinned',
      evidence: 'no engines.node, .nvmrc, .node-version or Docker node image found',
      recommendation: 'Declare the supported Node version in engines.node and .nvmrc.'
    });
  }

  if (inv.deps.length > 0 && !inv.hasLockfile) {
    out.push({
      id: 'node-no-lockfile',
      category: 'dependencies',
      severity: 'medium',
      title: 'No lockfile, so installs are not reproducible',
      evidence: `${inv.deps.length} dependencies and no package-lock.json`,
      recommendation: 'Commit a lockfile and install with npm ci.'
    });
  }

  const approx = inv.deps.filter((d) => d.approximate).length;
  if (approx > 0) {
    out.push({
      id: 'node-approximate-versions',
      category: 'dependencies',
      severity: 'info',
      title: 'Some dependency versions are approximate',
      evidence: `${approx} of ${inv.deps.length} versions come from ranges, not a lockfile; treat vulnerability results as indicative`,
      recommendation: 'Add a lockfile so versions can be checked exactly.'
    });
  }

  for (const dep of inv.deps) {
    const advice = DEPRECATED[dep.name];
    if (!advice) continue;
    out.push({
      id: 'node-deprecated-package',
      category: 'dependencies',
      severity: 'medium',
      title: `Deprecated package in use: ${dep.name}`,
      evidence: dep.name,
      recommendation: advice
    });
  }

  if (!inv.hasTests) {
    out.push({
      id: 'node-no-tests',
      category: 'standards',
      severity: 'low',
      title: 'No automated tests detected',
      evidence: 'no test script and no test framework dependency',
      recommendation: 'Add a test runner such as Vitest and a test script.'
    });
  }

  const serverFw = inv.frameworks.filter((f) => SERVER_FRAMEWORKS.has(f));
  if (inv.moduleType === 'commonjs' && serverFw.length > 0) {
    out.push({
      id: 'node-commonjs',
      category: 'architecture',
      severity: 'info',
      title: 'Project uses CommonJS modules',
      evidence: `no "type": "module" in package.json; framework: ${serverFw.join(', ')}`,
      recommendation: 'Consider moving to ESM and TypeScript.'
    });
  }

  const systems = UI_SYSTEMS.filter((s) => inv.uiLibraries.some((u) => u === s || u.startsWith(`${s} (`)));
  if (systems.length >= 2) {
    out.push({
      id: 'ui-multiple-systems',
      category: 'standards',
      severity: 'info',
      title: 'Multiple UI systems found: possible overlap',
      evidence: `${systems.join(', ')} (unverified hypothesis: check compatibility before migrating)`,
      recommendation: 'Confirm these UI systems are meant to be used together before planning a migration.'
    });
  }

  return out.sort(
    (a, b) =>
      SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] ||
      cmp(a.id, b.id) ||
      cmp(a.evidence ?? '', b.evidence ?? '')
  );
}
