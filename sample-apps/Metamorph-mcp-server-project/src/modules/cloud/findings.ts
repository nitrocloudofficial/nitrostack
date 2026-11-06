// Deterministic, explainable AWS findings. Severity from the end-of-life date (thresholds are documented in docs/AWS_SETUP.md):
//   already past the date: high | within 90 days: medium | within 180 days: low | later: no finding.
// Evidence is the resource identifier and region only (no account id, no secrets, no tags).
import type { Finding, Severity } from '../assessment/types.js';
import type { ProductEol } from './eol-source.js';
import type { Ec2Instance, EksCluster, LambdaFn, RdsDb } from './aws-scan.js';

const DAY_MS = 86_400_000;

export function severityForEol(dateIso: string | undefined, nowMs: number): { severity: Severity; days: number } | undefined {
  if (!dateIso) return undefined;
  const t = Date.parse(`${dateIso}T00:00:00Z`);
  if (!Number.isFinite(t)) return undefined;
  if (t <= nowMs) return { severity: 'high', days: -Math.floor((nowMs - t) / DAY_MS) };
  const days = Math.ceil((t - nowMs) / DAY_MS);
  if (days <= 90) return { severity: 'medium', days };
  if (days <= 180) return { severity: 'low', days };
  return undefined;
}

const when = (days: number, date: string) => (days <= 0 ? `ended ${date}` : `ends ${date}`);
const sourceOf = (p: ProductEol) => `${p.provenance === 'endoflife.date' ? `endoflife.date/${p.product}` : `built-in table (${p.url})`}, ${p.provenance === 'endoflife.date' ? 'fetched' : 'checked'} ${p.asOf.slice(0, 10)}`.slice(0, 200);
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

// Newest supported runtime per family. Checked against the deprecation table by a test.
export const LAMBDA_TARGETS: Record<string, string> = {
  nodejs: 'nodejs24.x',
  python: 'python3.13',
  java: 'java21',
  dotnetcore: 'dotnet10',
  dotnet: 'dotnet10',
  ruby: 'ruby3.4',
  go: 'provided.al2023',
  provided: 'provided.al2023'
};
export function lambdaFamily(runtime: string): string | undefined {
  const m = runtime.match(/^(nodejs|python|java|dotnetcore|dotnet|ruby|go|provided)/);
  return m?.[1];
}

export function lambdaFindings(fns: LambdaFn[], region: string, eol: ProductEol, nowMs: number): { findings: Finding[]; unknownRuntimes: number } {
  const findings: Finding[] = [];
  let unknown = 0;
  for (const f of fns) {
    if (!f.runtime) continue; // container image: no managed runtime
    const info = eol.cycles.get(f.runtime);
    if (!info) {
      unknown++;
      continue;
    }
    const date = info.support ?? (typeof info.eol === 'string' ? info.eol : undefined);
    const sev = info.support || typeof info.eol === 'string' ? severityForEol(date, nowMs) : info.eol === true ? { severity: 'high' as Severity, days: 0 } : undefined;
    if (!sev) continue;
    const target = LAMBDA_TARGETS[lambdaFamily(f.runtime) ?? ''] ?? 'a currently supported runtime';
    findings.push({
      id: `aws-lambda-runtime-eol:${f.name}`,
      category: 'cloud',
      severity: sev.severity,
      title: cut(`Lambda function ${f.name} runs ${f.runtime}; support ${date ? when(sev.days, date) : 'has ended'}`, 160),
      evidence: cut(`lambda ${region} ${f.name} runtime=${f.runtime}`, 140),
      recommendation: cut(`Move this function to ${target}, then test and redeploy it.`, 160),
      source: sourceOf(eol)
    });
  }
  return { findings, unknownRuntimes: unknown };
}

/** 8.0.35 -> 8.0 (MySQL, MariaDB), 14.10 -> 14 (PostgreSQL 10 and later), 9.6.24 -> 9.6. */
export function rdsCycle(engine: string, version: string): string | undefined {
  const m = version.match(/^(\d+)\.(\d+)/);
  if (!m) return undefined;
  if (engine === 'postgres') return Number(m[1]) >= 10 ? m[1] : `${m[1]}.${m[2]}`;
  return `${m[1]}.${m[2]}`;
}
export const RDS_PRODUCTS: Record<string, string> = { mysql: 'amazon-rds-mysql', postgres: 'amazon-rds-postgresql', mariadb: 'amazon-rds-mariadb' };

/** Newest plain release line (no patch part) whose end of life is still in the future. */
export function newestSupported(eol: ProductEol, nowMs: number): string | undefined {
  let best: { key: number[]; cycle: string } | undefined;
  for (const [cycle, info] of eol.cycles) {
    if (!/^\d+(\.\d+)?$/.test(cycle)) continue;
    const alive = info.eol === false || (typeof info.eol === 'string' && Date.parse(`${info.eol}T00:00:00Z`) > nowMs);
    if (!alive) continue;
    const key = cycle.split('.').map(Number);
    if (!best || key[0] > best.key[0] || (key[0] === best.key[0] && (key[1] ?? 0) > (best.key[1] ?? 0))) best = { key, cycle };
  }
  return best?.cycle;
}

function cycleFinding(opts: { id: string; label: string; evidence: string; cycle: string; info: { eol?: string | boolean }; eol: ProductEol; nowMs: number; what: string; advice: string }): Finding | undefined {
  const { info, nowMs } = opts;
  const date = typeof info.eol === 'string' ? info.eol : undefined;
  const sev = date ? severityForEol(date, nowMs) : info.eol === true ? { severity: 'high' as Severity, days: 0 } : undefined;
  if (!sev) return undefined;
  const target = newestSupported(opts.eol, nowMs);
  return {
    id: opts.id,
    category: 'cloud',
    severity: sev.severity,
    title: cut(`${opts.label} ${opts.what} ${opts.cycle}; standard support ${date ? when(sev.days, date) : 'has ended'}`, 160),
    evidence: cut(opts.evidence, 140),
    recommendation: cut(target ? `${opts.advice} ${target}, which is still supported.` : `${opts.advice} a version that is still supported.`, 200),
    source: sourceOf(opts.eol)
  };
}

export function rdsFindings(dbs: RdsDb[], region: string, eol: ProductEol, engine: string, nowMs: number): Finding[] {
  const out: Finding[] = [];
  for (const d of dbs) {
    const cycle = rdsCycle(engine, d.version);
    const info = cycle ? eol.cycles.get(cycle) : undefined;
    if (!cycle || !info) continue;
    const f = cycleFinding({ id: `aws-rds-engine-eol:${d.id}`, label: `RDS ${d.engine} database ${d.id}`, evidence: `rds ${region} ${d.id} ${d.engine} ${d.version}`, cycle, info, eol, nowMs, what: 'runs version', advice: 'Upgrade the engine to' });
    if (f) out.push(f);
  }
  return out;
}

export function eksFindings(clusters: EksCluster[], region: string, eol: ProductEol, nowMs: number): Finding[] {
  const out: Finding[] = [];
  for (const c of clusters) {
    const info = eol.cycles.get(c.version);
    if (!info) continue;
    const f = cycleFinding({ id: `aws-eks-version-eol:${c.name}`, label: `EKS cluster ${c.name}`, evidence: `eks ${region} ${c.name} kubernetes ${c.version}`, cycle: c.version, info, eol, nowMs, what: 'runs Kubernetes', advice: 'Upgrade one minor version at a time to' });
    if (f) out.push(f);
  }
  return out;
}

/** Amazon Linux generation from the AMI name: amzn2-ami-* is Amazon Linux 2, amzn-ami-* is the original Amazon Linux. */
export function amazonLinuxCycle(imageName: string | undefined): { cycle: string; label: string } | undefined {
  if (!imageName) return undefined;
  if (/^amzn2-ami-/.test(imageName)) return { cycle: '2', label: 'Amazon Linux 2' };
  if (/^amzn-ami-/.test(imageName)) return { cycle: '2018.03', label: 'Amazon Linux (original)' };
  return undefined;
}

export function ec2Findings(instances: Ec2Instance[], region: string, eol: ProductEol, nowMs: number): Finding[] {
  const out: Finding[] = [];
  for (const i of instances) {
    const al = amazonLinuxCycle(i.imageName);
    const info = al ? eol.cycles.get(al.cycle) : undefined;
    if (!al || !info) continue;
    const f = cycleFinding({ id: `aws-ec2-ami-eol:${i.id}`, label: `EC2 instance ${i.id} uses`, evidence: `ec2 ${region} ${i.id} ${i.imageId}`, cycle: al.label, info, eol, nowMs, what: 'image', advice: 'Rebuild on Amazon Linux 2023 or' });
    if (f) {
      f.recommendation = cut('Rebuild the instance from a current Amazon Linux 2023 image, test, then replace it.', 160);
      out.push(f);
    }
  }
  return out;
}
