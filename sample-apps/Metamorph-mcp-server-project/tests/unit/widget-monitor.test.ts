import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { InventoryResult } from '../../src/modules/cloud/inventory.js';
import type { WatchOutput } from '../../src/modules/feeds/check.js';
import { toViewModel, type CloudVM, type ViewModel, type WatchVM } from '../../src/widgets/lib/view-model.js';

// Hand-built to the server's output types (see the _note in each file); the type annotations keep them in step.
const load = <T>(n: string): T => (JSON.parse(readFileSync(new URL(`../fixtures/widget/${n}`, import.meta.url), 'utf8')) as { structuredContent: T }).structuredContent;
const watch = load<WatchOutput>('check_watch.result.json');
const cloud = load<InventoryResult>('cloud_inventory.result.json');

describe('watch view model', () => {
  const vm = toViewModel(watch) as WatchVM;
  it('is classified and keeps source and fetch time on every row', () => {
    expect(vm.kind).toBe('watch');
    expect(vm.kev[0]).toMatchObject({ cveId: 'CVE-2021-44228', ransomware: true });
    expect([...vm.kev, ...vm.epss, ...vm.eol, ...vm.feedItems].every((r) => r.source && r.fetchedAt)).toBe(true);
    expect(vm.eol.map((e) => e.isEol)).toEqual([true, false, true]);
    expect(vm.unavailable).toEqual(['symfony release feed']);
  });
  it('clamps EPSS to 0..1 and drops unsafe feed links', () => {
    const o = { ...watch, epss: [{ cve: 'CVE-1', epss: 7, percentile: -1 }], feedItems: [{ title: 't', link: 'javascript:alert(1)', feed: 'f' }] };
    const v = toViewModel(o) as WatchVM;
    expect(v.epss[0]).toMatchObject({ epss: 1, percentile: 0 });
    expect(v.feedItems[0].link).toBeUndefined();
  });
});

describe('cloud view model', () => {
  const vm = toViewModel(cloud) as CloudVM;
  it('is classified with counts, ranked findings and not-checked codes', () => {
    expect(vm.kind).toBe('cloud');
    expect(vm.counts).toContainEqual({ service: 'lambda', count: 12 });
    expect(vm.findings[0].rankReason).toBeTruthy();
    expect(vm.notChecked.map((n) => n.code)).toContain('AccessDenied');
    expect(vm.severityCounts.find((s) => s.severity === 'high')?.count).toBe(2);
  });
  it('only ever shows a masked account', () => {
    expect((toViewModel({ ...cloud, account: '123456789012' }) as CloudVM).account).toBe('****');
    expect(JSON.stringify(toViewModel({ ...cloud, account: '123456789012' }))).not.toContain('123456789012');
  });
});

describe('detection cannot shadow the other kinds', () => {
  it('real watch and cloud outputs are not read as an assessment, plan, apply, verify or report', () => {
    expect(toViewModel(watch).kind).toBe('watch');
    expect(toViewModel(cloud).kind).toBe('cloud');
  });
  it('the existing kinds still win on their own shapes', () => {
    const kinds = (o: unknown): ViewModel['kind'] => toViewModel(o).kind;
    expect(kinds({ stack: 'php', score: { overall: 40, counts: {} }, findings: [], provider: 'aws', account: '****1', counts: {} })).toBe('assessment');
    expect(kinds({ stages: [] })).toBe('plan');
    expect(kinds({ reportId: 'r', score: { overall: 1 }, files: [] })).toBe('report');
  });
  it('a partial shape is unrecognised, not guessed', () => {
    expect(kinds2({ kevHits: [], epss: [] })).toBe('unknown');
    expect(kinds2({ provider: 'aws', account: '****1' })).toBe('unknown');
  });
});
const kinds2 = (o: unknown) => toViewModel(o).kind;
