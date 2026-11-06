// Keeps the CloudFormation role and the code in step: every IAM action in the template must be used by the scan code, and every
// SDK operation the scan code uses must be in the template. A new SDK call without a template change (or the reverse) fails here.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const dir = fileURLToPath(new URL('../../src/modules/cloud/', import.meta.url));
const template = readFileSync(fileURLToPath(new URL('../../docs/aws/metamorph-readonly-role.yaml', import.meta.url)), 'utf8');
const doc = parse(template, { logLevel: 'error', customTags: [{ tag: '!Ref', resolve: (s: string) => ({ Ref: s }) }, { tag: '!GetAtt', resolve: (s: string) => ({ 'Fn::GetAtt': s }) }] }) as {
  Resources: Record<string, { Type: string; Properties: Record<string, any> }>;
};
const role = Object.values(doc.Resources).find((r) => r.Type === 'AWS::IAM::Role')!;
const templateActions = role.Properties.Policies.flatMap((p: any) => p.PolicyDocument.Statement.flatMap((s: any) => [s.Action].flat())) as string[];

const SERVICE_PACKAGES: Record<string, string> = { 'client-ec2': 'ec2', 'client-eks': 'eks', 'client-lambda': 'lambda', 'client-rds': 'rds' };

/** IAM actions implied by SDK command/paginator imports that the cloud module really references. STS AssumeRole belongs to the base identity. */
function usedActions(): { actions: Set<string>; packages: Set<string> } {
  const actions = new Set<string>();
  const packages = new Set<string>();
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.ts'))) {
    const src = readFileSync(dir + f, 'utf8');
    for (const m of src.matchAll(/import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*'@aws-sdk\/(client-[a-z0-9-]+)'/g)) {
      packages.add(m[2]);
      const svc = SERVICE_PACKAGES[m[2]];
      if (!svc) continue;
      const body = src.replace(m[0], '');
      for (const raw of m[1].split(',').map((x) => x.trim().replace(/^type\s+/, ''))) {
        const op = raw.match(/^(.+)Command$/)?.[1] ?? raw.match(/^paginate(.+)$/)?.[1];
        if (op && new RegExp(`\\b${raw}\\b`).test(body)) actions.add(`${svc}:${op}`);
      }
    }
  }
  return { actions, packages };
}

describe('IAM actions in the CloudFormation role', () => {
  const used = usedActions();

  it('finds the SDK operations by reading the source (guards the scanner itself)', () => {
    expect(used.actions.size).toBeGreaterThanOrEqual(6);
    expect(used.actions.has('lambda:ListFunctions')).toBe(true);
  });
  it('every action in the template is used by the code', () => {
    for (const a of templateActions) expect(used.actions.has(a), `${a} is granted but no code calls it`).toBe(true);
  });
  it('every SDK operation the code uses is granted, and nothing else', () => {
    expect([...used.actions].sort()).toEqual([...templateActions].sort());
  });
  it('the code only imports the AWS clients this test knows about', () => {
    expect([...used.packages].sort()).toEqual(['client-ec2', 'client-eks', 'client-lambda', 'client-rds', 'client-sts']);
  });
});
