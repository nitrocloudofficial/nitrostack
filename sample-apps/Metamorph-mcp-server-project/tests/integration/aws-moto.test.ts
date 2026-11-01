// OPTIONAL wire-level check of the real AWS SDK calls against the moto emulator (open source, no account, no token).
// Skipped unless METAMORPH_MOTO=1 and METAMORPH_MOTO_ENDPOINT are set (and never in CI). It starts nothing itself. Start moto with:
//   docker run -d --rm --name metamorph-moto -p 127.0.0.1:5057:5000 motoserver/moto:5.2.5
//   METAMORPH_MOTO=1 METAMORPH_MOTO_ENDPOINT=http://127.0.0.1:5057 npx vitest run tests/integration/aws-moto.test.ts
// This is NOT a check against a real AWS account. The endpoint is injected through the client factory and STS client that the
// tests pass to runAwsInventory; production code reads no endpoint setting. All credentials here are random dummy values.
import { describe, it, expect, beforeAll } from 'vitest';
import { randomBytes } from 'node:crypto';
import { crc32 } from 'node:zlib';
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { LambdaClient, CreateFunctionCommand } from '@aws-sdk/client-lambda';
import { RDSClient, CreateDBInstanceCommand } from '@aws-sdk/client-rds';
import { EKSClient, CreateClusterCommand } from '@aws-sdk/client-eks';
import { EC2Client, RunInstancesCommand, DescribeImagesCommand } from '@aws-sdk/client-ec2';
import { runAwsInventory, type InventoryDeps } from '../../src/modules/cloud/inventory.js';
import { assumeReadOnlyRole } from '../../src/modules/cloud/aws-session.js';
import { AwsEolSource } from '../../src/modules/cloud/eol-source.js';
import { EolClient } from '../../src/modules/feeds/eol.js';
import type { RegionClients, SessionCredentials } from '../../src/modules/cloud/aws-session.js';

const ENDPOINT = process.env.METAMORPH_MOTO_ENDPOINT ?? '';
const ENABLED = process.env.METAMORPH_MOTO === '1' && !process.env.CI && ENDPOINT !== '';
if (!ENABLED) console.info('[aws-moto] skipped: set METAMORPH_MOTO=1 and METAMORPH_MOTO_ENDPOINT (see the header of this file); never runs in CI');

const NOW = Date.parse('2026-10-31T12:00:00Z');
const A = 'eu-west-1';
const B = 'us-east-1';
const DEAD = 'http://127.0.0.1:9';
const ROLE = 'arn:aws:iam::123456789012:role/MetamorphReadOnly';
const rand = (n = 12) => randomBytes(n).toString('hex');
const dummy = (): SessionCredentials => ({ accessKeyId: `AKIA${rand(8).toUpperCase()}`, secretAccessKey: rand(20), sessionToken: rand(24) });
const env = { METAMORPH_AWS_ROLE_ARN: ROLE, METAMORPH_AWS_EXTERNAL_ID: rand(10), METAMORPH_AWS_REGIONS: `${A},${B}` };

// Dates for the findings come from a fixed, offline endoflife.date stand-in so only AWS calls cross the wire.
const EOL: Record<string, unknown[]> = {
  'aws-lambda': [
    { cycle: 'nodejs18.x', eol: '2027-08-31', support: '2025-09-01' },
    { cycle: 'python3.12', eol: '2028-10-31', support: '2028-10-31' }
  ],
  'amazon-eks': [{ cycle: '1.29', eol: '2025-03-23' }, { cycle: '1.37', eol: '2027-12-01' }],
  'amazon-rds-mysql': [{ cycle: '8.0', eol: '2026-07-31' }, { cycle: '8.4', eol: '2029-07-31' }],
  'amazon-rds-postgresql': [{ cycle: '14', eol: '2027-02-28' }, { cycle: '18', eol: '2031-02-28' }],
  'amazon-rds-mariadb': [{ cycle: '11.8', eol: '2028-06-30' }],
  'amazon-linux': [{ cycle: '2023', eol: '2029-06-30' }, { cycle: '2', eol: '2026-06-30' }]
};
const eol = () =>
  new AwsEolSource(
    new EolClient({
      now: () => NOW,
      fetchFn: (async (url: string) => {
        const d = EOL[String(url).match(/api\/([a-z0-9-]+)\.json$/)?.[1] ?? ''];
        return d ? new Response(JSON.stringify(d), { status: 200, headers: { 'content-type': 'application/json' } }) : new Response('', { status: 404 });
      }) as unknown as typeof fetch
    })
  );

const cfg = (region: string, endpoint = ENDPOINT) => ({ region, endpoint, credentials: dummy(), maxAttempts: 1 });
// Test-only factory: the real clients our code builds, pointed at the emulator. `broken` sends one service of one region (or a
// whole region when service is omitted) to a dead port.
function factory(broken: { region?: string; service?: keyof RegionClients } = {}) {
  return (region: string): RegionClients => {
    const ep = (svc: keyof RegionClients) => (broken.region === region && (!broken.service || broken.service === svc) ? DEAD : ENDPOINT);
    return { lambda: new LambdaClient(cfg(region, ep('lambda'))), rds: new RDSClient(cfg(region, ep('rds'))), eks: new EKSClient(cfg(region, ep('eks'))), ec2: new EC2Client(cfg(region, ep('ec2'))) };
  };
}

/** Smallest valid zip (one stored file) so moto accepts CreateFunction. */
function tinyZip(): Uint8Array {
  const name = Buffer.from('index.js');
  const data = Buffer.from('exports.handler=async()=>1');
  const crc = crc32(data);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(data.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(name.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(data.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(name.length, 28);
  const body = Buffer.concat([local, name, data]);
  const dir = Buffer.concat([central, name]);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(dir.length, 12);
  end.writeUInt32LE(body.length, 16);
  return new Uint8Array(Buffer.concat([body, dir, end]));
}

describe.skipIf(!ENABLED)('AWS connector against moto (wire level, not a real AWS account)', () => {
  beforeAll(async () => {
    // Everything is created through moto's own API. Lambda and EKS need an existing IAM role in moto; there is no IAM client
    // dependency, so the role is created with moto's IAM query endpoint directly (raw HTTP, dummy credentials, emulator only).
    const iam = await fetch(`${ENDPOINT}/`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', authorization: `AWS4-HMAC-SHA256 Credential=${dummy().accessKeyId}/20261031/us-east-1/iam/aws4_request, SignedHeaders=host, Signature=${rand(32)}` },
      body: new URLSearchParams({ Action: 'CreateRole', Version: '2010-05-08', RoleName: 'MetamorphReadOnly', AssumeRolePolicyDocument: JSON.stringify({ Version: '2012-10-17', Statement: [{ Effect: 'Allow', Principal: { Service: 'lambda.amazonaws.com' }, Action: 'sts:AssumeRole' }] }) })
    });
    expect([200, 409]).toContain(iam.status);
    for (const [region, runtime, name] of [[A, 'nodejs18.x', 'old-node'], [A, 'python3.12', 'new-python'], [B, 'nodejs18.x', 'old-node-us']] as const) {
      await new LambdaClient(cfg(region)).send(new CreateFunctionCommand({ FunctionName: name, Runtime: runtime, Role: ROLE, Handler: 'index.handler', Code: { ZipFile: tinyZip() } }));
    }
    const rds = new RDSClient(cfg(A));
    const pw = rand(12);
    for (const [id, engine, version] of [['db-old-mysql', 'mysql', '8.0.35'], ['db-new-pg', 'postgres', '18.1']] as const) {
      await rds.send(new CreateDBInstanceCommand({ DBInstanceIdentifier: id, DBInstanceClass: 'db.t3.micro', Engine: engine, EngineVersion: version, MasterUsername: 'metamorph', MasterUserPassword: pw, AllocatedStorage: 20 }));
    }
    const eks = new EKSClient(cfg(A));
    for (const [name, version] of [['old-cluster', '1.29'], ['new-cluster', '1.37']] as const) {
      await eks.send(new CreateClusterCommand({ name, version, roleArn: ROLE, resourcesVpcConfig: { subnetIds: ['subnet-0123456789abcdef0'] } }));
    }
    const ec2 = new EC2Client(cfg(A));
    const images = (await ec2.send(new DescribeImagesCommand({ Owners: ['amazon'] }))).Images ?? [];
    const al2 = images.find((i) => /^amzn2-ami-/.test(i.Name ?? ''));
    if (al2?.ImageId) await ec2.send(new RunInstancesCommand({ ImageId: al2.ImageId, MinCount: 1, MaxCount: 1, InstanceType: 't3.micro' }));
  }, 120_000);

  const run = (extra: Partial<InventoryDeps> = {}) =>
    runAwsInventory({}, { env, now: () => NOW, assume: { sts: new STSClient(cfg(A)) as never }, clients: factory(), eol: eol(), ...extra });

  it('STS AssumeRole answers and our assume code accepts the response', async () => {
    const creds = await assumeReadOnlyRole({ roleArn: ROLE, externalId: env.METAMORPH_AWS_EXTERNAL_ID, regions: [A] }, { sts: new STSClient(cfg(A)) as never });
    expect(creds.accessKeyId).toBeTruthy();
    expect(creds.secretAccessKey).toBeTruthy();
    expect(creds.sessionToken).toBeTruthy();
    const raw = await new STSClient(cfg(A)).send(new AssumeRoleCommand({ RoleArn: ROLE, RoleSessionName: 'metamorph-probe', ExternalId: env.METAMORPH_AWS_EXTERNAL_ID, DurationSeconds: 900 }));
    expect(raw.Credentials?.AccessKeyId).toBeTruthy();
  });

  it('Lambda: lists functions and flags the deprecated runtime only', async () => {
    const r = await run();
    expect(r.counts.lambda).toBe(3);
    const ids = r.findings.map((f) => f.id);
    expect(ids).toContain('aws-lambda-runtime-eol:old-node');
    expect(ids).toContain('aws-lambda-runtime-eol:old-node-us');
    expect(ids).not.toContain('aws-lambda-runtime-eol:new-python');
    const f = r.findings.find((x) => x.id === 'aws-lambda-runtime-eol:old-node')!;
    expect(f.severity).toBe('high');
    expect(f.evidence).toContain('runtime=nodejs18.x');
  });

  it('RDS: engine versions map to the right end-of-life cycle', async () => {
    const r = await run();
    expect(r.counts.rds).toBe(2);
    const old = r.findings.find((x) => x.id === 'aws-rds-engine-eol:db-old-mysql')!;
    expect(old.severity).toBe('high');
    expect(old.evidence).toContain('mysql 8.0');
    expect(r.findings.map((x) => x.id)).not.toContain('aws-rds-engine-eol:db-new-pg');
  });

  it('EKS: list and describe clusters, version mapped to the cycle', async () => {
    const r = await run();
    expect(r.counts.eks).toBe(2);
    const old = r.findings.find((x) => x.id === 'aws-eks-version-eol:old-cluster')!;
    expect(old.severity).toBe('high');
    expect(old.evidence).toContain('kubernetes 1.29');
    expect(r.findings.map((x) => x.id)).not.toContain('aws-eks-version-eol:new-cluster');
  });

  it('EC2: describes instances and looks up AMI names', async () => {
    const r = await run();
    expect(r.counts.ec2).toBeGreaterThanOrEqual(1);
    expect(r.findings.some((f) => f.id.startsWith('aws-ec2-ami-eol:'))).toBe(true);
  });

  it('isolates a failing service in one region without losing the rest', async () => {
    const r = await run({ clients: factory({ region: A, service: 'eks' }) });
    expect(r.notChecked.some((n) => n.service === 'eks' && n.region === A)).toBe(true);
    const ids = r.findings.map((f) => f.id);
    expect(ids).toContain('aws-lambda-runtime-eol:old-node');
    expect(ids).toContain('aws-rds-engine-eol:db-old-mysql');
    expect(ids).toContain('aws-lambda-runtime-eol:old-node-us');
    expect(r.counts.eks ?? 0).toBe(0);
  });

  it('isolates a whole failing region', async () => {
    const r = await run({ clients: factory({ region: B }) });
    expect(r.notChecked.filter((n) => n.region === B).length).toBe(4);
    const ids = r.findings.map((f) => f.id);
    expect(ids).toContain('aws-lambda-runtime-eol:old-node');
    expect(ids).not.toContain('aws-lambda-runtime-eol:old-node-us');
  });
});
