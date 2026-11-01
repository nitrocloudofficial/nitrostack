import { describe, it, expect } from 'vitest';
import { CloudError } from '../../src/modules/cloud/aws-config.js';
import type { InventoryResult } from '../../src/modules/cloud/inventory.js';
import { CLOUD_NOT_CONFIGURED_TEXT, collectCloudSection } from '../../src/modules/cloud/report-cloud.js';
import { renderPdf } from '../../src/modules/report/pdf.js';
import { attachCloud } from '../../src/modules/report/report-data.js';
import { buildSarif } from '../../src/modules/report/sarif.js';
import { dataOf, manyFindings } from '../helpers/report-fixtures.js';
import { sarif210 } from '../helpers/schemas.js';

// Built at runtime: no account id or external id literal in the source.
const account = '2'.repeat(12);
const ENV = { METAMORPH_AWS_ROLE_ARN: `arn:aws:iam::${account}:role/ReadOnly`, METAMORPH_AWS_EXTERNAL_ID: ['ext', 'id', '0123456789'].join('-'), METAMORPH_AWS_REGIONS: 'eu-west-1' };

const inv = (over: Partial<InventoryResult> = {}): InventoryResult => ({
  provider: 'aws',
  account: '****2222',
  regions: ['eu-west-1', 'us-east-1'],
  services: ['lambda', 'rds'],
  counts: { lambda: 12, rds: 3 },
  limits: ['lambda eu-west-1: checked 200, more exist (cap 200)'],
  severityCounts: { critical: 0, high: 1, medium: 1, low: 0, info: 0 },
  findingsTotal: 3,
  moreFindings: 1,
  findings: [
    { id: 'aws-lambda-runtime-eol:old-fn', category: 'cloud', severity: 'high', title: 'Lambda function old-fn runs nodejs18.x; support ended 2025-09-01', evidence: 'lambda eu-west-1 old-fn runtime=nodejs18.x', recommendation: 'Move this function to nodejs24.x.', source: 'endoflife.date/aws-lambda, fetched 2026-10-31', rankReason: 'severity high' },
    { id: 'aws-rds-engine-eol:db-1', category: 'cloud', severity: 'medium', title: 'RDS mysql database db-1 runs version 8.0', evidence: 'rds us-east-1 db-1 mysql 8.0.35', recommendation: 'Upgrade the engine.', source: 'endoflife.date/amazon-rds-mysql', rankReason: 'severity medium' }
  ],
  notChecked: [
    { service: 'eks', region: 'eu-west-1', code: 'AccessDenied', note: 'some resources could not be read' },
    { service: 'beanstalk', code: 'NoVerifiedEolSource' }
  ],
  generatedAt: '2026-10-31T12:00:00.000Z',
  note: 'Read-only: nothing was changed in your AWS account.',
  ...over
});

describe('collectCloudSection', () => {
  it('not configured: one fixed sentence, no variable names, no inventory call', async () => {
    let called = 0;
    const c = await collectCloudSection({ env: {}, inventory: async () => ((called += 1), inv()) });
    expect(called).toBe(0);
    expect(c.status).toBe('not-configured');
    expect(c.summary).toBe(CLOUD_NOT_CONFIGURED_TEXT);
    expect(JSON.stringify(c)).not.toMatch(/METAMORPH|_ARN|EXTERNAL_ID|AWS_REGION/);
  });

  it('maps the inventory: counts, ranked findings with service, region and resource, notChecked codes, limits', async () => {
    const c = await collectCloudSection({ env: ENV, inventory: async () => inv() });
    expect(c.status).toBe('scanned');
    expect(c.counts.map((x) => [x.service, x.count.value])).toEqual([['lambda', 12], ['rds', 3]]);
    expect(c.findings.map((f) => [f.service, f.region, f.resource, f.source])).toEqual([
      ['lambda', 'eu-west-1', 'old-fn', 'aws-readonly'],
      ['rds', 'us-east-1', 'db-1', 'aws-readonly']
    ]);
    expect(c.findings[0].rankReason).toBe('severity high');
    expect(c.notChecked).toEqual([{ service: 'eks', region: 'eu-west-1', code: 'AccessDenied', note: 'some resources could not be read' }, { service: 'beanstalk', code: 'NoVerifiedEolSource' }]);
    expect(c.limits).toHaveLength(1);
    expect(c.moreFindings).toBe(1);
  });

  it('a scan that does not finish inside the step cap becomes a short note and returns', async () => {
    const t0 = Date.now();
    const c = await collectCloudSection({ env: ENV, stepMs: 30, inventory: () => new Promise<InventoryResult>(() => undefined) });
    expect(Date.now() - t0).toBeLessThan(2000);
    expect(c.status).toBe('failed');
    expect(c.summary).toMatch(/did not finish \(ReportTimeBudget\)/);
  });

  it('an error never leaks its message', async () => {
    const leak = ['AKIA', 'ABCDEFGHIJKLMNOP'].join('');
    const c = await collectCloudSection({
      env: ENV,
      inventory: async () => {
        throw new CloudError(`boom ${leak}`, 'AccessDenied');
      }
    });
    expect(c.status).toBe('failed');
    expect(c.summary).toContain('AccessDenied');
    expect(JSON.stringify(c)).not.toContain(leak);
  });

  it('with no hook it uses the real inventory path; an unconfigured env stops it before any AWS call', async () => {
    const c = await collectCloudSection({ env: {} });
    expect(c.status).toBe('not-configured');
  });
});

describe('cloud section in SARIF and PDF', () => {
  async function withCloud() {
    return attachCloud(dataOf(manyFindings(3)), await collectCloudSection({ env: ENV, inventory: async () => inv() }));
  }

  it('SARIF: results with sources ["aws-readonly"], a logical location and no file; schema valid', async () => {
    const d = await withCloud();
    const sarif = JSON.parse(JSON.stringify(buildSarif(d)));
    const v = sarif210()(sarif);
    expect(v.errors).toEqual([]);
    expect(v.valid).toBe(true);
    const r = sarif.runs[0].results.filter((x: { properties: { sources?: string[] } }) => x.properties.sources?.[0] === 'aws-readonly');
    expect(r).toHaveLength(2);
    expect(r[0].locations[0].physicalLocation).toBeUndefined();
    expect(r[0].locations[0].logicalLocations[0]).toMatchObject({ name: 'old-fn', fullyQualifiedName: 'aws/eu-west-1/lambda/old-fn', kind: 'resource' });
    expect(r[0].properties).toMatchObject({ region: 'eu-west-1', rankReason: 'severity high' });
    expect(sarif.runs[0].results).toHaveLength(3 + 2);
    expect(sarif.runs[0].tool.driver.rules.map((x: { id: string }) => x.id)).toContain('aws-lambda-runtime-eol:old-fn');
  });

  it('the repository counts and score are the same with and without the cloud section', async () => {
    const base = dataOf(manyFindings(3));
    const d = await withCloud();
    expect(d.score).toEqual(base.score);
    expect(d.counts).toEqual(base.counts);
    expect(d.findings).toEqual(base.findings);
  });

  it('the PDF renders for scanned, not configured and failed', async () => {
    const base = dataOf(manyFindings(3));
    const scanned = await renderPdf(await withCloud());
    const none = await renderPdf(attachCloud(base, await collectCloudSection({ env: {} })));
    const failed = await renderPdf(
      attachCloud(
        base,
        await collectCloudSection({
          env: ENV,
          inventory: async () => {
            throw new Error('x');
          }
        })
      )
    );
    for (const r of [scanned, none, failed]) expect(r.pages).toBeGreaterThan(1);
    expect(scanned.bytes).toBeGreaterThan(none.bytes);
  });

  it('SARIF stays valid when the section is not configured', async () => {
    const d = attachCloud(dataOf(manyFindings(1)), await collectCloudSection({ env: {} }));
    expect(sarif210()(JSON.parse(JSON.stringify(buildSarif(d)))).valid).toBe(true);
  });
});
