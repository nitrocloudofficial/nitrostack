// Read-only listing of AWS resources with the SDK paginators. Hard limits: a per-service resource cap and an overall time
// budget shared by the whole run. Names are untrusted: only plain identifier characters survive (see safeName).
import { createHash } from 'node:crypto';
import { paginateDescribeInstances, DescribeImagesCommand, type DescribeInstancesCommandOutput } from '@aws-sdk/client-ec2';
import { paginateListClusters, DescribeClusterCommand } from '@aws-sdk/client-eks';
import { paginateListFunctions } from '@aws-sdk/client-lambda';
import { paginateDescribeDBInstances } from '@aws-sdk/client-rds';
import { errorCode } from './aws-config.js';
import type { RegionClients } from './aws-session.js';

export const MAX_RESOURCES_PER_SERVICE = 2000;
export const BUDGET_MS = 60_000;

export interface ScanContext {
  now: () => number;
  deadline: number;
  cap: number;
}

export interface Scan<T> {
  items: T[];
  /** More resources existed than the cap allowed; `items.length` were checked. */
  capped: boolean;
  /** The time budget ran out before every page was read. */
  budgetHit: boolean;
  /** Error codes of partial failures (for example one cluster that could not be described). */
  partialCodes: string[];
}

const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,139}$/;

/** Identifier characters only; anything else (spaces, newlines, prose) becomes an inert placeholder. */
export function safeName(raw: unknown): string {
  const s = typeof raw === 'string' ? raw : '';
  if (NAME_RE.test(s)) return s;
  return `unusual-name-${createHash('sha256').update(s).digest('hex').slice(0, 8)}`;
}

async function drain<P, T>(pages: AsyncIterable<P>, pick: (p: P) => T[], ctx: ScanContext): Promise<Scan<T>> {
  const items: T[] = [];
  const scan: Scan<T> = { items, capped: false, budgetHit: false, partialCodes: [] };
  if (ctx.now() >= ctx.deadline) return { ...scan, budgetHit: true };
  outer: for await (const page of pages) {
    for (const it of pick(page)) {
      if (items.length >= ctx.cap) {
        scan.capped = true;
        break outer;
      }
      items.push(it);
    }
    if (ctx.now() >= ctx.deadline) {
      scan.budgetHit = true;
      break;
    }
  }
  return scan;
}

const abortFor = (ctx: ScanContext) => ({ abortSignal: AbortSignal.timeout(Math.max(1, ctx.deadline - ctx.now())) });

export interface LambdaFn {
  name: string;
  runtime?: string;
  image: boolean;
}
export async function scanLambda(c: RegionClients, ctx: ScanContext): Promise<Scan<LambdaFn>> {
  return drain(
    paginateListFunctions({ client: c.lambda, pageSize: 50 }, {}, abortFor(ctx)),
    (p) => (p.Functions ?? []).map((f) => ({ name: safeName(f.FunctionName), runtime: typeof f.Runtime === 'string' ? f.Runtime : undefined, image: f.PackageType === 'Image' })),
    ctx
  );
}

export interface RdsDb {
  id: string;
  engine: string;
  version: string;
}
export async function scanRds(c: RegionClients, ctx: ScanContext): Promise<Scan<RdsDb>> {
  return drain(
    paginateDescribeDBInstances({ client: c.rds, pageSize: 100 }, {}, abortFor(ctx)),
    (p) => (p.DBInstances ?? []).map((d) => ({ id: safeName(d.DBInstanceIdentifier), engine: String(d.Engine ?? '').slice(0, 40), version: String(d.EngineVersion ?? '').slice(0, 40) })),
    ctx
  );
}

export interface EksCluster {
  name: string;
  version: string;
}
export async function scanEks(c: RegionClients, ctx: ScanContext): Promise<Scan<EksCluster>> {
  const names = await drain(paginateListClusters({ client: c.eks, pageSize: 100 }, {}, abortFor(ctx)), (p) => p.clusters ?? [], ctx);
  const out: Scan<EksCluster> = { items: [], capped: names.capped, budgetHit: names.budgetHit, partialCodes: [] };
  for (const raw of names.items) {
    if (ctx.now() >= ctx.deadline) {
      out.budgetHit = true;
      break;
    }
    try {
      const r = await c.eks.send(new DescribeClusterCommand({ name: raw }), abortFor(ctx));
      out.items.push({ name: safeName(r.cluster?.name ?? raw), version: String(r.cluster?.version ?? '').slice(0, 16) });
    } catch (e) {
      const code = errorCode(e);
      if (!out.partialCodes.includes(code)) out.partialCodes.push(code);
    }
  }
  return out;
}

export interface Ec2Instance {
  id: string;
  imageId: string;
  type: string;
  /** Image name when it could be looked up (used to recognise Amazon Linux). */
  imageName?: string;
}
export async function scanEc2(c: RegionClients, ctx: ScanContext): Promise<Scan<Ec2Instance>> {
  const scan: Scan<Ec2Instance> = await drain<DescribeInstancesCommandOutput, Ec2Instance>(
    paginateDescribeInstances({ client: c.ec2, pageSize: 500 }, { Filters: [{ Name: 'instance-state-name', Values: ['pending', 'running', 'stopping', 'stopped'] }] }, abortFor(ctx)),
    (p) => (p.Reservations ?? []).flatMap((r) => r.Instances ?? []).map((i) => ({ id: safeName(i.InstanceId), imageId: /^ami-[0-9a-f]{8,17}$/.test(i.ImageId ?? '') ? (i.ImageId as string) : '', type: String(i.InstanceType ?? '').slice(0, 30) })),
    ctx
  );
  const ids = [...new Set(scan.items.map((i) => i.imageId).filter(Boolean))];
  const names = new Map<string, string>();
  for (let i = 0; i < ids.length; i += 100) {
    if (ctx.now() >= ctx.deadline) {
      scan.budgetHit = true;
      break;
    }
    try {
      const r = await c.ec2.send(new DescribeImagesCommand({ ImageIds: ids.slice(i, i + 100) }), abortFor(ctx));
      for (const im of r.Images ?? []) if (im.ImageId) names.set(im.ImageId, String(im.Name ?? '').slice(0, 120));
    } catch (e) {
      const code = errorCode(e);
      if (!scan.partialCodes.includes(code)) scan.partialCodes.push(code);
    }
  }
  for (const it of scan.items) it.imageName = names.get(it.imageId);
  return scan;
}
