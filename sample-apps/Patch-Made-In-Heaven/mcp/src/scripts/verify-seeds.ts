import { createTwoFilesPatch } from 'diff';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';
import { ALL_SEED_FIXTURES, type SeedFixtureDefinition } from '../services/seeds/index.js';
import { SandboxClient, resolveSandboxImage } from '../services/sandbox.client.js';
import { knowledgeCardSchema, type KnowledgeCard } from '../domain/knowledge-card.js';
import { getEnv } from '../config/env.js';

const execFileAsync = promisify(execFile);
const CONTAINER_RUNTIME = getEnv().sandbox.containerRuntime;

/**
 * Pre-pulls every distinct image the fixtures need, with a generous timeout.
 * Without this, the FIRST fixture using a not-yet-cached image (guaranteed on
 * every cold CI runner) can spend its entire sandbox timeout budget pulling
 * the image rather than executing the test command — producing a captured
 * "stacktrace" that's actually an image-pull log, not the real error.
 */
async function warmUpImages(fixtures: SeedFixtureDefinition[]): Promise<void> {
  const runtime = getEnv().sandbox.containerRuntime;
  const images = new Set(
    fixtures
      .map((fixture) => resolveSandboxImage(fixture.environment.language))
      .filter((image): image is string => Boolean(image))
  );

  for (const image of images) {
    process.stdout.write(`Pulling ${image} ... `);
    await execFileAsync(runtime, ['pull', image], { timeout: 120000 });
    console.log('done');
  }
}

/**
 * Structural checks only (unique ids, unique problems, broken != fixed).
 * No Docker required, no network writes — safe to run in any environment.
 */
function validateFixtureShape(fixtures: SeedFixtureDefinition[]): string[] {
  const errors: string[] = [];
  const seenIds = new Set<string>();
  const seenProblems = new Set<string>();

  for (const fixture of fixtures) {
    if (seenIds.has(fixture.id)) {
      errors.push(`Duplicate id: ${fixture.id}`);
    }
    seenIds.add(fixture.id);

    if (seenProblems.has(fixture.problem)) {
      errors.push(`Duplicate problem description on ${fixture.id}`);
    }
    seenProblems.add(fixture.problem);

    if (fixture.brokenCode.trim() === fixture.fixedCode.trim()) {
      errors.push(`${fixture.id}: brokenCode and fixedCode are identical`);
    }
    const method = fixture.verificationMethod ?? 'sandbox';
    if (method === 'sandbox' && !fixture.testCommand.trim()) {
      errors.push(`${fixture.id}: missing testCommand`);
    }
  }

  return errors;
}

interface RunResult {
  status: 'PASS' | 'FAIL';
  exitCode: number;
  stdout: string;
  stderr: string;
  executionTimeMs: number;
}

/**
 * Runs a Dockerfile/compose file directly against the host container runtime
 * — never nested inside a SandboxClient-spawned container. This is the same
 * trust level `verify-seeds.ts` already uses to pull images; it never mounts
 * the Docker socket into an untrusted container.
 */
async function runHostVerification(
  fixture: SeedFixtureDefinition,
  content: string,
  method: 'docker-build' | 'compose-config'
): Promise<RunResult> {
  const startTime = Date.now();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hm-docker-fixture-'));
  const fileName = method === 'docker-build' ? 'Dockerfile' : 'compose.yml';
  const filePath = path.join(tempDir, fileName);
  fs.writeFileSync(filePath, content);

  const tag = `hm-seed-verify-${crypto.randomBytes(6).toString('hex')}`;

  try {
    const args =
      method === 'docker-build'
        ? ['build', '--no-cache', '-t', tag, '-f', filePath, tempDir]
        : ['compose', '-f', filePath, 'config'];

    const { exitCode, stdout, stderr } = await new Promise<{ exitCode: number; stdout: string; stderr: string }>(
      (resolve) => {
        execFile(
          CONTAINER_RUNTIME,
          args,
          { timeout: 60000, cwd: tempDir, encoding: 'utf8' },
          (error, stdout, stderr) => {
            const exitCode = typeof error?.code === 'number' ? error.code : error ? 1 : 0;
            resolve({ exitCode, stdout, stderr });
          }
        );
      }
    );

    return {
      status: exitCode === 0 ? 'PASS' : 'FAIL',
      exitCode,
      stdout,
      stderr,
      executionTimeMs: Date.now() - startTime,
    };
  } finally {
    if (method === 'docker-build') {
      await execFileAsync(CONTAINER_RUNTIME, ['rmi', '-f', tag]).catch(() => {});
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

interface VerifyOutcome {
  card?: KnowledgeCard;
  errors: string[];
}

/** Actually reproduces the fixture: broken must FAIL, fixed must PASS. */
async function verifyFixture(fixture: SeedFixtureDefinition): Promise<VerifyOutcome> {
  const method = fixture.verificationMethod ?? 'sandbox';
  const errors: string[] = [];

  let failRun: RunResult;
  let passRun: RunResult;

  if (method === 'sandbox') {
    const client = new SandboxClient();
    failRun = await client.runVerification({
      code: fixture.brokenCode,
      testCommand: fixture.testCommand,
      environment: fixture.environment,
    });
    passRun = await client.runVerification({
      code: fixture.fixedCode,
      testCommand: fixture.testCommand,
      environment: fixture.environment,
    });
  } else {
    failRun = await runHostVerification(fixture, fixture.brokenCode, method);
    passRun = await runHostVerification(fixture, fixture.fixedCode, method);
  }

  if (failRun.status !== 'FAIL') {
    errors.push(`${fixture.id}: brokenCode unexpectedly PASSED — the fixture does not actually reproduce a bug.`);
  }
  if (passRun.status !== 'PASS') {
    errors.push(`${fixture.id}: fixedCode did not PASS. exitCode=${passRun.exitCode} stderr=${passRun.stderr}`);
  }

  if (errors.length > 0) {
    return { errors };
  }

  const patchFileName = method === 'docker-build' ? 'Dockerfile' : method === 'compose-config' ? 'docker-compose.yml' : `main.${fixture.fileExtension}`;
  const patch = createTwoFilesPatch(`a/${patchFileName}`, `b/${patchFileName}`, fixture.brokenCode, fixture.fixedCode);

  const candidate = {
    id: fixture.id,
    problem: fixture.problem,
    errorType: fixture.errorType,
    stacktrace: (failRun.stderr || failRun.stdout).trim(),
    environment: fixture.environment,
    patch,
    verification: {
      status: 'PASS' as const,
      score: 0.9,
      lastVerified: new Date().toISOString(),
      sandbox: 'docker' as const,
      exitCode: passRun.exitCode,
      durationMs: passRun.executionTimeMs,
      stdout: passRun.stdout,
      stderr: passRun.stderr,
    },
    metrics: { reuseCount: 0 },
    provenance: {
      source: 'seed' as const,
      category: fixture.category,
      addedAt: new Date().toISOString(),
    },
  };

  const parsed = knowledgeCardSchema.safeParse(candidate);
  if (!parsed.success) {
    errors.push(`${fixture.id}: constructed card failed hm.v1 schema validation: ${parsed.error.message}`);
    return { errors };
  }

  return { card: parsed.data, errors: [] };
}

function renderSeedDataModule(cards: KnowledgeCard[]): string {
  const header = `import type { KnowledgeCard } from './elastic.client.js';\n\n// GENERATED by \`npm run seed:verify\`. Every card here was produced from a\n// real Docker sandbox run (see src/services/seeds/*.ts for the source\n// fixtures and src/scripts/verify-seeds.ts for how). Do not hand-edit —\n// re-run \`npm run seed:verify\` instead.\nexport const SEED_KNOWLEDGE_CARDS: KnowledgeCard[] = `;
  return `${header}${JSON.stringify(cards, null, 2)};\n`;
}

async function main() {
  const validateOnly = process.argv.includes('--validate-only');

  const shapeErrors = validateFixtureShape(ALL_SEED_FIXTURES);
  if (shapeErrors.length > 0) {
    console.error(`Fixture validation failed (${shapeErrors.length} issue(s)):`);
    shapeErrors.forEach((error) => console.error(`  - ${error}`));
    process.exit(1);
  }
  console.log(
    `Structural validation passed: ${ALL_SEED_FIXTURES.length} fixture(s), unique ids, unique problems, broken != fixed.`
  );

  if (validateOnly) {
    process.exit(0);
  }

  await warmUpImages(ALL_SEED_FIXTURES);

  const cards: KnowledgeCard[] = [];
  let failures = 0;

  for (const fixture of ALL_SEED_FIXTURES) {
    process.stdout.write(`Verifying ${fixture.id} ... `);
    const outcome = await verifyFixture(fixture);
    if (outcome.errors.length > 0) {
      console.log('FAIL');
      outcome.errors.forEach((error) => console.error(`  - ${error}`));
      failures += 1;
    } else {
      console.log('PASS');
      cards.push(outcome.card!);
    }
  }

  console.log(`\n${cards.length}/${ALL_SEED_FIXTURES.length} fixtures verified.`);

  if (failures > 0) {
    console.error(`${failures} fixture(s) failed verification. seed.data.ts was NOT regenerated.`);
    process.exit(1);
  }

  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const seedDataPath = path.join(currentDir, '../services/seed.data.ts');
  fs.writeFileSync(seedDataPath, renderSeedDataModule(cards));
  console.log(`Wrote ${cards.length} verified card(s) to ${seedDataPath}`);
}

main().catch((error) => {
  console.error('verify-seeds failed:', error);
  process.exit(1);
});
