// Orchestrates one read-only AWS inventory: assume the role, scan each region and service in isolation, turn what was found
// into ranked findings. Output is small and capped; failures are named by AWS error CODE only.
import { rankFindings } from '../assessment/rank.js';
import type { Finding, Severity } from '../assessment/types.js';
import { EolClient } from '../feeds/eol.js';
import { MAX_REGIONS, REGION_RE, accountHint, errorCode, loadAwsConfig, type AwsConfig } from './aws-config.js';
import { BUDGET_MS, MAX_RESOURCES_PER_SERVICE, scanEc2, scanEks, scanLambda, scanRds, type Ec2Instance, type EksCluster, type LambdaFn, type RdsDb, type Scan, type ScanContext } from './aws-scan.js';
import { assumeReadOnlyRole, makeRegionClients, type AssumeDeps, type RegionClients, type SessionCredentials } from './aws-session.js';
import { AwsEolSource } from './eol-source.js';
import { RDS_PRODUCTS, ec2Findings, eksFindings, lambdaFindings, rdsFindings } from './findings.js';

export const SERVICES = ['lambda', 'rds', 'eks', 'ec2', 'beanstalk'] as const;
export type Service = (typeof SERVICES)[number];
export const MAX_FINDINGS = 25;
export const MAX_NOT_CHECKED = 40;
export const READ_ONLY_NOTE = 'Read-only: nothing was changed in your AWS account. Dates come from endoflife.date or a built-in table, as each finding states.';

export interface NotChecked {
  service: Service | 'eol-data';
  region?: string;
  /** AWS error code, or a fixed Metamorph code such as NoVerifiedEolSource. */
  code: string;
  note?: string;
}

export interface InventoryResult {
  provider: 'aws';
  account: string;
  regions: string[];
  services: Service[];
  counts: Partial<Record<Service, number>>;
  /** Present for a service only when the cap or the time budget stopped the read. */
  limits: string[];
  severityCounts: Record<Severity, number>;
  findingsTotal: number;
  findings: Finding[];
  moreFindings: number;
  notChecked: NotChecked[];
  generatedAt: string;
  note: string;
}

export interface InventoryInput {
  regions?: string[];
  services?: Service[];
}

export interface InventoryDeps {
  env?: Record<string, string | undefined>;
  now?: () => number;
  assume?: AssumeDeps;
  /** Test hook: replaces the credential exchange. */
  getCredentials?: (cfg: AwsConfig) => Promise<SessionCredentials>;
  clients?: (region: string, creds: SessionCredentials) => RegionClients;
  eol?: AwsEolSource;
  fetchFn?: typeof fetch;
  budgetMs?: number;
  cap?: number;
}

interface RegionData {
  lambda?: Scan<LambdaFn>;
  rds?: Scan<RdsDb>;
  eks?: Scan<EksCluster>;
  ec2?: Scan<Ec2Instance>;
}

export async function runAwsInventory(input: InventoryInput, deps: InventoryDeps = {}): Promise<InventoryResult> {
  const cfg = loadAwsConfig(deps.env ?? process.env);
  const now = deps.now ?? Date.now;
  const regions = [...new Set(input.regions ?? cfg.regions)];
  if (regions.length > MAX_REGIONS || regions.some((r) => !REGION_RE.test(r))) throw new RangeError('Invalid regions.');
  const services = [...new Set(input.services ?? SERVICES)] as Service[];

  const creds = await (deps.getCredentials ? deps.getCredentials(cfg) : assumeReadOnlyRole(cfg, deps.assume));
  const startMs = now();
  const ctx: ScanContext = { now, deadline: startMs + (deps.budgetMs ?? BUDGET_MS), cap: deps.cap ?? MAX_RESOURCES_PER_SERVICE };
  const eolSource = deps.eol ?? new AwsEolSource(new EolClient({ fetchFn: deps.fetchFn, now }));
  const makeClients = deps.clients ?? makeRegionClients;

  const notChecked: NotChecked[] = [];
  const limits: string[] = [];
  const data = new Map<string, RegionData>();

  await Promise.all(
    regions.map(async (region) => {
      let clients: RegionClients;
      try {
        clients = makeClients(region, creds);
      } catch (e) {
        notChecked.push({ service: 'lambda', region, code: errorCode(e) });
        return;
      }
      const rd: RegionData = {};
      data.set(region, rd);
      const run = async <K extends keyof RegionData>(svc: K, fn: () => Promise<NonNullable<RegionData[K]>>) => {
        if (!services.includes(svc)) return;
        try {
          const scan = await fn();
          (rd as Record<string, unknown>)[svc] = scan;
          for (const code of scan.partialCodes) notChecked.push({ service: svc, region, code, note: 'some resources could not be read' });
          if (scan.capped) limits.push(`${svc} ${region}: checked ${scan.items.length}, more exist (cap ${ctx.cap})`);
          if (scan.budgetHit) limits.push(`${svc} ${region}: time budget reached after ${scan.items.length}`);
        } catch (e) {
          notChecked.push({ service: svc, region, code: errorCode(e) });
        }
      };
      await run('lambda', () => scanLambda(clients, ctx));
      await run('rds', () => scanRds(clients, ctx));
      await run('eks', () => scanEks(clients, ctx));
      await run('ec2', () => scanEc2(clients, ctx));
    })
  );

  if (services.includes('beanstalk')) {
    notChecked.push({ service: 'beanstalk', code: 'NoVerifiedEolSource', note: 'no verified end-of-life data source for Elastic Beanstalk platform branches' });
  }

  const nowMs = now();
  const found: Finding[] = [];
  const counts: Partial<Record<Service, number>> = {};
  const sum = (svc: Service, n: number) => (counts[svc] = (counts[svc] ?? 0) + n);
  const eolMissing = (svc: Service, product: string) => notChecked.push({ service: svc, code: 'EolSourceUnavailable', note: `no end-of-life data for ${product}; nothing guessed` });
  let unknownRuntimes = 0;
  let unsupportedEngines = 0;

  const regionList = [...data.keys()].sort();
  const lambdaEol = services.includes('lambda') ? await eolSource.product('aws-lambda') : undefined;
  const eksEol = services.includes('eks') ? await eolSource.product('amazon-eks') : undefined;
  const alEol = services.includes('ec2') ? await eolSource.product('amazon-linux') : undefined;
  const rdsEol: Record<string, Awaited<ReturnType<AwsEolSource['product']>>> = {};
  if (services.includes('rds')) for (const p of Object.values(RDS_PRODUCTS)) rdsEol[p] = await eolSource.product(p);

  const seen = { lambda: false, rds: false, eks: false, ec2: false };
  for (const region of regionList) {
    const rd = data.get(region) as RegionData;
    if (rd.lambda) {
      seen.lambda = true;
      sum('lambda', rd.lambda.items.length);
      if (lambdaEol) {
        const r = lambdaFindings(rd.lambda.items, region, lambdaEol, nowMs);
        found.push(...r.findings);
        unknownRuntimes += r.unknownRuntimes;
      }
    }
    if (rd.rds) {
      seen.rds = true;
      sum('rds', rd.rds.items.length);
      for (const [engine, product] of Object.entries(RDS_PRODUCTS)) {
        const e = rdsEol[product];
        if (e) found.push(...rdsFindings(rd.rds.items.filter((d) => d.engine === engine), region, e, engine, nowMs));
      }
      unsupportedEngines += rd.rds.items.filter((d) => !(d.engine in RDS_PRODUCTS)).length;
    }
    if (rd.eks) {
      seen.eks = true;
      sum('eks', rd.eks.items.length);
      if (eksEol) found.push(...eksFindings(rd.eks.items, region, eksEol, nowMs));
    }
    if (rd.ec2) {
      seen.ec2 = true;
      sum('ec2', rd.ec2.items.length);
      if (alEol) found.push(...ec2Findings(rd.ec2.items, region, alEol, nowMs));
    }
  }
  if (seen.lambda && !lambdaEol) eolMissing('lambda', 'aws-lambda');
  if (seen.eks && !eksEol) eolMissing('eks', 'amazon-eks');
  if (seen.ec2 && !alEol) eolMissing('ec2', 'amazon-linux');
  if (seen.rds) for (const [engine, product] of Object.entries(RDS_PRODUCTS)) if (!rdsEol[product]) eolMissing('rds', `${engine} (${product})`);
  if (unknownRuntimes > 0) notChecked.push({ service: 'lambda', code: 'UnknownRuntime', note: `${unknownRuntimes} function(s) use a runtime id with no end-of-life entry` });
  if (unsupportedEngines > 0) notChecked.push({ service: 'rds', code: 'NoEolSource', note: `${unsupportedEngines} database(s) on engines without a data source (only mysql, postgres, mariadb are checked)` });
  if (seen.ec2) notChecked.push({ service: 'ec2', code: 'PartialCoverage', note: 'only Amazon Linux AMIs are checked; instance generations are not' });

  const ranked = rankFindings(found);
  const severityCounts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of ranked) severityCounts[f.severity]++;

  return {
    provider: 'aws',
    account: accountHint(cfg.roleArn),
    regions,
    services,
    counts,
    limits: limits.sort().slice(0, 12),
    severityCounts,
    findingsTotal: ranked.length,
    findings: ranked.slice(0, MAX_FINDINGS),
    moreFindings: Math.max(0, ranked.length - MAX_FINDINGS),
    notChecked: notChecked.sort((a, b) => `${a.service}${a.region ?? ''}${a.code}`.localeCompare(`${b.service}${b.region ?? ''}${b.code}`)).slice(0, MAX_NOT_CHECKED),
    generatedAt: new Date(nowMs).toISOString(),
    note: READ_ONLY_NOTE
  };
}
