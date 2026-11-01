import { describe, it, expect } from 'vitest';
import { lookupAdvisories } from '../../src/modules/intake/lookup.js';
import type { OsvVuln } from '../../src/modules/intake/osv.client.js';

const fake = (records: Record<string, OsvVuln | null>) => ({ getVuln: async (id: string) => records[id] ?? null });

const ghsa: OsvVuln = {
  id: 'GHSA-35jh-r3h4-6jhm',
  aliases: ['CVE-2021-23337'],
  summary: 'Command Injection in lodash',
  database_specific: { severity: 'HIGH' },
  affected: [{ package: { name: 'lodash', ecosystem: 'npm' }, ranges: [{ events: [{ introduced: '0' }, { fixed: '4.17.21' }] }] }]
};

describe('lookupAdvisories', () => {
  it('summarizes a record with package and fixed version', async () => {
    const [r] = await lookupAdvisories(['GHSA-35jh-r3h4-6jhm'], fake({ 'GHSA-35jh-r3h4-6jhm': ghsa }));
    expect(r).toMatchObject({ found: true, severity: 'high', aliases: ['CVE-2021-23337'] });
    expect(r.packages).toEqual([{ name: 'lodash', ecosystem: 'npm', fixedVersions: ['4.17.21'] }]);
  });

  it('handles a bare record without package data', async () => {
    const bare: OsvVuln = { id: 'CVE-2021-23337', summary: 'x' };
    const [r] = await lookupAdvisories(['CVE-2021-23337'], fake({ 'CVE-2021-23337': bare }));
    expect(r.found).toBe(true);
    expect(r.packages).toEqual([]);
  });

  it('marks unknown ids as not found', async () => {
    const [r] = await lookupAdvisories(['CVE-2099-0001'], fake({}));
    expect(r).toMatchObject({ id: 'CVE-2099-0001', found: false, packages: [] });
  });

  it('rejects invalid ids before any request', async () => {
    let called = false;
    const client = { getVuln: async () => { called = true; return null; } };
    await expect(lookupAdvisories(['not-an-id; rm -rf /'], client)).rejects.toThrow(RangeError);
    expect(called).toBe(false);
  });

  it('rejects more than 10 ids', async () => {
    const ids = Array.from({ length: 11 }, (_, i) => `CVE-2024-${1000 + i}`);
    await expect(lookupAdvisories(ids, fake({}))).rejects.toThrow(/at most 10/);
  });

  it('strips control characters and truncates long summaries', async () => {
    const noisy: OsvVuln = { id: 'GHSA-aaaa-bbbb-cccc', summary: 'bad\u0007text ' + 'x'.repeat(400), affected: [] };
    const [r] = await lookupAdvisories(['GHSA-aaaa-bbbb-cccc'], fake({ 'GHSA-aaaa-bbbb-cccc': noisy }));
    expect(r.summary.length).toBeLessThanOrEqual(160);
    expect(r.summary).not.toMatch(/\u0007/);
  });
});
