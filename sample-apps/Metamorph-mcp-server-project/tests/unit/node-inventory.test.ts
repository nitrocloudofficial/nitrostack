import { describe, it, expect } from 'vitest';
import { inventoryNode, nodeFindings, parseMinMajor, NODE_EOL } from '../../src/modules/assessment/node-inventory.js';
import type { NodeInputs } from '../../src/modules/assessment/node-inventory.js';

const TODAY = new Date('2026-10-30T12:00:00Z');

function pkg(extra: Record<string, unknown> = {}): string {
  return JSON.stringify({ name: 'demo', type: 'module', engines: { node: '>=22' }, scripts: { test: 'vitest run' }, ...extra });
}
const LOCK_V3 = JSON.stringify({
  lockfileVersion: 3,
  packages: {
    '': { name: 'demo' },
    'node_modules/zod': { version: '3.25.1' },
    'node_modules/@scope/pkg': { version: '2.0.4' },
    'node_modules/zod/node_modules/nested': { version: '9.9.9' }
  }
});
const ids = (i: NodeInputs, today = TODAY) => nodeFindings(inventoryNode(i), today).map((f) => f.id);

describe('lockfile versions', () => {
  it('reads exact versions from lockfile v3', () => {
    const inv = inventoryNode({ packageJson: pkg({ dependencies: { zod: '^3.0.0', '@scope/pkg': '^1.0.0' } }), packageLock: LOCK_V3 });
    expect(inv.deps).toEqual([
      { name: '@scope/pkg', version: '2.0.4', dev: false, approximate: false },
      { name: 'zod', version: '3.25.1', dev: false, approximate: false }
    ]);
    expect(inv.hasLockfile).toBe(true);
  });

  it('reads exact versions from lockfile v2 (packages and legacy dependencies)', () => {
    const lock = JSON.stringify({
      lockfileVersion: 2,
      packages: { 'node_modules/a': { version: '1.2.3' } },
      dependencies: { a: { version: '1.2.3' }, b: { version: '4.5.6' } }
    });
    const inv = inventoryNode({ packageJson: pkg({ dependencies: { a: '^1', b: '~4.0.0' } }), packageLock: lock });
    expect(inv.deps.map((d) => [d.name, d.version, d.approximate])).toEqual([['a', '1.2.3', false], ['b', '4.5.6', false]]);
  });

  it('reads exact versions from lockfile v1', () => {
    const lock = JSON.stringify({ lockfileVersion: 1, dependencies: { lodash: { version: '4.17.21' } } });
    const inv = inventoryNode({ packageJson: pkg({ dependencies: { lodash: '^4.0.0' } }), packageLock: lock });
    expect(inv.deps).toEqual([{ name: 'lodash', version: '4.17.21', dev: false, approximate: false }]);
  });

  it('ignores nested node_modules entries', () => {
    const inv = inventoryNode({ packageJson: pkg({ dependencies: { nested: '^9.0.0' } }), packageLock: LOCK_V3 });
    expect(inv.deps[0]).toMatchObject({ version: '9.0.0', approximate: true });
  });

  it('treats an unparsable lockfile as absent', () => {
    const inv = inventoryNode({ packageJson: pkg({ dependencies: { a: '1.0.0' } }), packageLock: '{oops' });
    expect(inv.hasLockfile).toBe(false);
    expect(inv.deps[0]?.approximate).toBe(true);
  });
});

describe('range-derived versions', () => {
  const cases: Array<[string, string]> = [
    ['^1.2.3', '1.2.3'],
    ['~2.4.1', '2.4.1'],
    ['>=3.0.0', '3.0.0'],
    ['>4.1.0', '4.1.0'],
    ['=5.0.0', '5.0.0'],
    ['v6.1.2', '6.1.2'],
    ['7.8.9', '7.8.9'],
    ['^2.0.0-beta.1', '2.0.0-beta.1'],
    ['18.x', '18.0.0'],
    ['^4', '4.0.0'],
    ['>=1.2.0 <2.0.0', '1.2.0']
  ];
  it.each(cases)('%s gives %s approximately', (spec, expected) => {
    const inv = inventoryNode({ packageJson: pkg({ dependencies: { dep: spec } }) });
    expect(inv.deps).toEqual([{ name: 'dep', version: expected, dev: false, approximate: true }]);
  });

  it('skips specs that cannot be guessed', () => {
    const specs = {
      a: '*',
      b: 'latest',
      c: 'git+https://github.com/x/y.git',
      d: 'file:../local',
      e: 'workspace:*',
      f: 'https://example.com/pkg.tgz',
      g: 'user/repo',
      h: 'link:../x',
      i: 'npm:other@1.0.0',
      j: '',
      k: 'next',
      ok: '^1.0.0'
    };
    const inv = inventoryNode({ packageJson: pkg({ dependencies: specs }) });
    expect(inv.deps.map((d) => d.name)).toEqual(['ok']);
  });

  it('flags devDependencies with dev:true and keeps scoped names', () => {
    const inv = inventoryNode({ packageJson: pkg({ dependencies: { '@nestjs/core': '^10.0.0' }, devDependencies: { '@types/node': '^22.0.0' } }) });
    expect(inv.deps).toEqual([
      { name: '@nestjs/core', version: '10.0.0', dev: false, approximate: true },
      { name: '@types/node', version: '22.0.0', dev: true, approximate: true }
    ]);
  });
});

describe('parseMinMajor', () => {
  const table: Array<[string, number | undefined]> = [
    ['>=10', 10],
    ['^14.17.0', 14],
    ['18.x', 18],
    ['~16', 16],
    ['>=18 <21', 18],
    ['14 || 16', 14],
    ['16 || 14', 14],
    ['v20.11.1', 20],
    ['22', 22],
    ['lts/*', undefined],
    ['lts/hydrogen', undefined],
    ['node', undefined],
    ['', undefined],
    ['*', undefined]
  ];
  it.each(table)('%j gives %s', (input, expected) => {
    expect(parseMinMajor(input)).toBe(expected);
  });
});

describe('runtime source', () => {
  it('prefers engines, then nvmrc, then node-version, then docker', () => {
    expect(inventoryNode({ packageJson: pkg(), nvmrc: '18', dockerNodeMajor: 16 })).toMatchObject({ minNodeMajor: 22, runtimeSource: 'engines', declaredEngine: '>=22' });
    const noEngine = JSON.stringify({ name: 'x' });
    expect(inventoryNode({ packageJson: noEngine, nvmrc: 'v18.19.0\n', dockerNodeMajor: 16 })).toMatchObject({ minNodeMajor: 18, runtimeSource: 'nvmrc' });
    expect(inventoryNode({ packageJson: noEngine, nodeVersionFile: '20.1.0', dockerNodeMajor: 16 })).toMatchObject({ minNodeMajor: 20, runtimeSource: 'nvmrc' });
    expect(inventoryNode({ packageJson: noEngine, nvmrc: 'lts/*', dockerNodeMajor: 16 })).toMatchObject({ minNodeMajor: 16, runtimeSource: 'docker' });
    expect(inventoryNode({ packageJson: noEngine }).minNodeMajor).toBeUndefined();
  });
});

describe('inventory details', () => {
  it('detects frameworks, ui libraries, scripts and tests', () => {
    const inv = inventoryNode({
      packageJson: pkg({
        scripts: { build: 'tsc', start: 'node x', test: 'jest' },
        dependencies: { express: '^4.0.0', react: '^18.0.0', '@angular/core': '^17.0.0', '@mantine/core': '^7.0.0', ink: '^5.0.0', '@radix-ui/react-dialog': '^1.0.0', tailwindcss: '^3.0.0', '@mui/material': '^5.0.0', bootstrap: '^5.0.0', '@chakra-ui/react': '^2.0.0' }
      })
    });
    expect(inv.frameworks).toEqual(['angular', 'express', 'react']);
    expect(inv.uiLibraries).toEqual(['bootstrap', 'chakra', 'ink', 'mantine', 'material-ui', 'radix', 'tailwind']);
    expect(inv.scripts).toEqual(['build', 'start', 'test']);
    expect(inv.hasTests).toBe(true);
    expect(inv.moduleType).toBe('module');
    expect(inv.name).toBe('demo');
  });

  it('does not count the default npm placeholder as a test', () => {
    const inv = inventoryNode({ packageJson: JSON.stringify({ scripts: { test: 'echo "Error: no test specified" && exit 1' } }) });
    expect(inv.hasTests).toBe(false);
  });

  it('counts a test framework dependency as tests', () => {
    expect(inventoryNode({ packageJson: JSON.stringify({ devDependencies: { mocha: '^10.0.0' } }) }).hasTests).toBe(true);
  });
});

describe('never throws', () => {
  it('handles invalid, empty and null-ish input', () => {
    const bad: NodeInputs[] = [
      {},
      { packageJson: '' },
      { packageJson: '{not json' },
      { packageJson: 'null' },
      { packageJson: '[]' },
      { packageJson: '"str"' },
      { packageJson: '42' },
      { packageJson: JSON.stringify({ dependencies: null, devDependencies: [], scripts: 'x', engines: 5 }) },
      { packageJson: JSON.stringify({ dependencies: { a: 5, b: null, c: {} } }) }
    ];
    for (const input of bad) {
      const inv = inventoryNode(input);
      expect(inv.deps.filter((d) => d.name === 'a' || d.name === 'b' || d.name === 'c')).toEqual([]);
      expect(() => nodeFindings(inv, TODAY)).not.toThrow();
    }
    const inv = inventoryNode({ packageJson: '{not json' });
    expect(inv).toMatchObject({ valid: false, deps: [], frameworks: [], uiLibraries: [], scripts: [], hasTests: false, hasLockfile: false });
    expect(nodeFindings(inv, TODAY)).toEqual([]);
  });

  it('copes with a null inputs object', () => {
    expect(inventoryNode(null as unknown as NodeInputs).valid).toBe(false);
  });

  it('stays fast with 2000 dependencies', () => {
    const dependencies: Record<string, string> = {};
    const packages: Record<string, { version: string }> = {};
    for (let i = 0; i < 2000; i++) {
      dependencies[`pkg-${i}`] = '^1.0.0';
      if (i % 2 === 0) packages[`node_modules/pkg-${i}`] = { version: '1.4.0' };
    }
    const start = performance.now();
    const inv = inventoryNode({ packageJson: pkg({ dependencies }), packageLock: JSON.stringify({ packages }) });
    nodeFindings(inv, TODAY);
    expect(performance.now() - start).toBeLessThan(1000);
    expect(inv.deps).toHaveLength(2000);
    expect(inv.deps.filter((d) => d.approximate)).toHaveLength(1000);
  });
});

describe('node-runtime-eol', () => {
  const run = (nvmrc: string, today: string) => nodeFindings(inventoryNode({ packageJson: JSON.stringify({ type: 'module', scripts: { test: 'x' } }), packageLock: '{}', nvmrc }), new Date(`${today}T00:00:00Z`)).find((f) => f.id === 'node-runtime-eol');

  it('embeds the verified schedule', () => {
    expect(NODE_EOL[20]).toBe('2026-04-30');
    expect(NODE_EOL[24]).toBe('2028-04-30');
  });

  it('is high after EOL with the source and date in evidence', () => {
    const f = run('18', '2026-10-30');
    expect(f).toMatchObject({ severity: 'high', category: 'runtime' });
    expect(f?.evidence).toContain('2025-04-30');
    expect(f?.evidence).toContain('.nvmrc');
    expect(f?.recommendation).toContain('Node 22 or 24');
  });

  it('names engines and Docker as sources', () => {
    const e = nodeFindings(inventoryNode({ packageJson: JSON.stringify({ engines: { node: '>=14' } }) }), TODAY).find((f) => f.id === 'node-runtime-eol');
    expect(e?.evidence).toContain('engines');
    const d = nodeFindings(inventoryNode({ packageJson: '{}', dockerNodeMajor: 16 }), TODAY).find((f) => f.id === 'node-runtime-eol');
    expect(d?.evidence).toContain('Docker');
  });

  it('is medium the day before and the day of EOL, high the day after', () => {
    expect(run('20', '2026-04-29')?.severity).toBe('medium');
    expect(run('20', '2026-04-30')?.severity).toBe('medium');
    expect(run('20', '2026-05-01')?.severity).toBe('high');
  });

  it('warns for exactly 180 days ahead and not 181', () => {
    // 2027-04-30 minus 180 days is 2026-11-01
    expect(run('22', '2026-11-01')?.severity).toBe('medium');
    expect(run('22', '2026-10-31')).toBeUndefined();
  });

  it('ignores unlisted odd majors and far-future EOL', () => {
    expect(run('23', '2026-10-30')).toBeUndefined();
    expect(run('25', '2026-10-30')).toBeUndefined();
    expect(run('24', '2026-10-30')).toBeUndefined();
  });

  it('flags majors below 10 as high', () => {
    expect(run('8', '2026-10-30')?.severity).toBe('high');
  });

  it('defaults today to the real clock without throwing', () => {
    expect(() => nodeFindings(inventoryNode({ packageJson: pkg() }))).not.toThrow();
  });
});

describe('other rules', () => {
  const base = { packageJson: pkg(), packageLock: '{}' };

  it('node-runtime-unpinned', () => {
    const f = nodeFindings(inventoryNode({ packageJson: JSON.stringify({ scripts: { test: 'x' } }), packageLock: '{}' }), TODAY);
    expect(f.map((x) => x.id)).toEqual(['node-runtime-unpinned']);
    expect(f[0]?.severity).toBe('low');
    expect(ids({ ...base, dockerNodeMajor: undefined })).not.toContain('node-runtime-unpinned');
    expect(ids({ packageJson: JSON.stringify({ scripts: { test: 'x' } }), packageLock: '{}', dockerNodeMajor: 22 })).toEqual([]);
  });

  it('node-no-lockfile and node-approximate-versions', () => {
    const f = nodeFindings(inventoryNode({ packageJson: pkg({ dependencies: { zod: '^3.0.0' } }) }), TODAY);
    expect(f.map((x) => [x.id, x.severity])).toEqual([['node-no-lockfile', 'medium'], ['node-approximate-versions', 'info']]);
    expect(f[1]?.evidence).toContain('indicative');
  });

  it('no lockfile finding when there are no deps', () => {
    expect(ids({ packageJson: pkg() })).toEqual([]);
  });

  it('flags only request, node-sass and tslint as deprecated', () => {
    const inv = inventoryNode({
      ...base,
      packageJson: pkg({ dependencies: { request: '^2.88.0', 'node-sass': '^9.0.0', left: '^1.0.0' }, devDependencies: { tslint: '^6.0.0', 'request-promise': '^4.0.0' } }),
      packageLock: JSON.stringify({ packages: { 'node_modules/request': { version: '2.88.2' }, 'node_modules/node-sass': { version: '9.0.0' }, 'node_modules/tslint': { version: '6.1.3' }, 'node_modules/left': { version: '1.0.0' }, 'node_modules/request-promise': { version: '4.2.6' } } })
    });
    const dep = nodeFindings(inv, TODAY).filter((f) => f.id === 'node-deprecated-package');
    expect(dep.map((f) => f.evidence)).toEqual(['node-sass', 'request', 'tslint']);
    expect(dep.every((f) => f.severity === 'medium' && f.category === 'dependencies')).toBe(true);
    expect(dep.map((f) => f.recommendation).join(' ')).toMatch(/sass.*fetch.*typescript-eslint/);
  });

  it('node-no-tests', () => {
    const f = nodeFindings(inventoryNode({ packageJson: JSON.stringify({ type: 'module', engines: { node: '>=22' } }), packageLock: '{}' }), TODAY);
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ id: 'node-no-tests', severity: 'low', category: 'standards' });
  });

  it('node-commonjs needs commonjs plus a server framework', () => {
    const cjs = (deps: Record<string, string>) => ids({ packageJson: JSON.stringify({ engines: { node: '>=22' }, scripts: { test: 'x' }, dependencies: deps }), packageLock: JSON.stringify({ packages: { 'node_modules/express': { version: '4.19.0' }, 'node_modules/left-pad': { version: '1.3.0' } } }) });
    expect(cjs({ express: '^4.0.0' })).toEqual(['node-commonjs']);
    expect(cjs({ 'left-pad': '^1.0.0' })).toEqual([]);
    expect(ids({ packageJson: pkg({ dependencies: { express: '^4.0.0' } }), packageLock: '{}' })).not.toContain('node-commonjs');
  });

  it('ui-multiple-systems is a hedged hypothesis, only for two or more systems', () => {
    const one = ids({ ...base, packageJson: pkg({ dependencies: { '@mantine/core': '^7.0.0', tailwindcss: '^3.0.0', ink: '^5.0.0' } }) });
    expect(one).not.toContain('ui-multiple-systems');
    const f = nodeFindings(inventoryNode({ ...base, packageJson: pkg({ dependencies: { '@mantine/core': '^7.0.0', bootstrap: '^5.0.0' } }) }), TODAY).find((x) => x.id === 'ui-multiple-systems');
    expect(f).toMatchObject({ severity: 'info', category: 'standards' });
    expect(f?.title).toContain('possible overlap');
    expect(f?.evidence).toContain('unverified hypothesis: check compatibility before migrating');
    expect(`${f?.title} ${f?.evidence} ${f?.recommendation}`).not.toMatch(/conflict/i);
  });

  it('shadcn-ui heuristic needs both class-variance-authority and tailwind-merge', () => {
    const ui = (deps: Record<string, string>) => inventoryNode({ ...base, packageJson: pkg({ dependencies: deps }) }).uiLibraries;
    expect(ui({ 'class-variance-authority': '^0.7.0' })).toEqual([]);
    expect(ui({ 'tailwind-merge': '^2.0.0' })).toEqual([]);
    expect(ui({ 'class-variance-authority': '^0.7.0', 'tailwind-merge': '^2.0.0' })).toEqual(['shadcn-ui (heuristic)']);
    const f = ids({ ...base, packageJson: pkg({ dependencies: { 'class-variance-authority': '^0.7.0', 'tailwind-merge': '^2.0.0', '@mantine/core': '^7.0.0' } }) });
    expect(f).toContain('ui-multiple-systems');
  });

  it('a clean modern project fires nothing', () => {
    const lock = JSON.stringify({ lockfileVersion: 3, packages: { 'node_modules/zod': { version: '3.25.1' }, 'node_modules/vitest': { version: '2.1.9' } } });
    const clean = { packageJson: pkg({ dependencies: { zod: '^3.25.0' }, devDependencies: { vitest: '^2.1.9' } }), packageLock: lock };
    expect(ids(clean)).toEqual([]);
  });

  it('sorts by severity then id, deterministically', () => {
    const input = { packageJson: JSON.stringify({ dependencies: { express: '^4.0.0', request: '^2.0.0', tslint: '^6.0.0' } }), nvmrc: '16' };
    const a = nodeFindings(inventoryNode(input), TODAY);
    const b = nodeFindings(inventoryNode(input), TODAY);
    expect(a).toEqual(b);
    expect(a.map((f) => f.id)).toEqual([
      'node-runtime-eol',
      'node-deprecated-package',
      'node-deprecated-package',
      'node-no-lockfile',
      'node-no-tests',
      'node-approximate-versions',
      'node-commonjs'
    ]);
    expect(a[1]?.evidence).toBe('request');
    expect(a[2]?.evidence).toBe('tslint');
  });
});
