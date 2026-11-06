import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AssessmentTools } from '../../src/modules/assessment/assessment.tools.js';
import { PlanningTools } from '../../src/modules/planning/planning.tools.js';
import { ReportTools } from '../../src/modules/report/report.tools.js';
import { VerifyTools } from '../../src/modules/verify/verify.tools.js';
import { lookupResource } from '../../src/modules/report/report.js';
import { CONFIG, FakeGithub, TOKEN, resultZip } from '../helpers/fake-github.js';
import { installOfflineFetch, loggedCtx, repoTarball, watchConsole, type Offline } from '../helpers/offline.js';

// Secrets planted in a fixture repository (all synthetic). None of them may appear in any tool output, any log line,
// SARIF, SBOM or the text of the PDF. The planting covers env files, source, key material, lockfile URLs with credentials,
// and a dependency spec with credentials in package.json.
const S = {
  env: 'Zq9-planted-env-password-7731',
  aws: 'AKIAZ7Q3PLANTED0000K',
  gh: 'ghp_' + 'Pl4nted'.repeat(6),
  urlPw: 'Sup3rS3cretUrlPw9',
  lockPw: 'L0ckfileRegistryPw42',
  composerPw: 'C0mposerDistPw77',
  npm: 'npm_PlantedNpmToken0123456789abcdefABCD',
  key: 'MIIPLANTEDKEYMATERIAL0123456789',
  php: 'PlantedPhpDbPass42',
  docker: 'PlantedDockerEnvToken99',
  sk: ['sk', 'live', 'PlantedStripeStyleKey0001'].join('_')
};
const SECRETS = Object.values(S);

const FILES: Record<string, string> = {
  'package.json': JSON.stringify({
    name: 'leaky-app',
    version: '1.0.0',
    engines: { node: '>=10' },
    scripts: { start: 'node index.js' },
    dependencies: { lodash: '4.17.15', 'internal-lib': `git+https://deploy:${S.urlPw}@git.example.com/org/internal-lib.git` }
  }),
  'package-lock.json': JSON.stringify({
    lockfileVersion: 3,
    packages: {
      '': { name: 'leaky-app' },
      'node_modules/lodash': { version: '4.17.15', resolved: `https://ci:${S.lockPw}@registry.example.com/lodash/-/lodash-4.17.15.tgz` }
    }
  }),
  'composer.json': JSON.stringify({ name: 'leaky/php', require: { php: '>=7.2', 'guzzlehttp/guzzle': '6.5.0' } }),
  'composer.lock': JSON.stringify({ packages: [{ name: 'guzzlehttp/guzzle', version: '6.5.0', dist: { type: 'zip', url: `https://u:${S.composerPw}@packages.example.com/guzzle.zip` } }] }),
  '.nvmrc': '10\n',
  '.env': `DB_PASSWORD=${S.env}\nAWS_ACCESS_KEY_ID=${S.aws}\nSTRIPE=${S.sk}\nPORT=3000\n`,
  '.npmrc': `//registry.npmjs.org/:_authToken=${S.npm}\n`,
  'config.js': `const token = '${S.gh}';\nmodule.exports = { token };\n`,
  'deploy/id.pem': `-----BEGIN RSA PRIVATE KEY-----\n${S.key}\n-----END RSA PRIVATE KEY-----\n`,
  'Dockerfile': `FROM node:10\nENV API_TOKEN=${S.docker}\nCOPY . .\n`,
  'index.php': `<?php\n$db_password = '${S.php}';\n$db = mysql_connect('localhost', 'root', '${S.php}');\n$r = mysql_query("SELECT * FROM t WHERE id = " . $_GET['id']);\n`,
  '.github/workflows/ci.yml': 'on: push\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@main\n'
};

// A Node-only copy: the mixed repository above has nothing to patch for the dependency stage, this one does (lodash).
const NODE_ONLY: Record<string, string> = Object.fromEntries(Object.entries(FILES).filter(([k]) => ['package.json', 'package-lock.json', '.nvmrc', '.env', 'config.js', '.npmrc'].includes(k)));
const NODE_TAR = repoTarball(NODE_ONLY);
const MIXED_TAR = repoTarball(FILES);
const have = (cmd: string) => spawnSync(cmd, ['-v'], { encoding: 'utf8' }).error === undefined;
const REPO = 'https://github.com/acme/leaky';
const REPO2 = 'https://github.com/acme/nodeonly';

const outputs: Record<string, string> = {};
const logs: string[] = [];
let offline: Offline;
let restoreConsole: () => void;
let work: string;
const saved: Record<string, string | undefined> = {};
const ENV = { METAMORPH_AUTH: 'off', METAMORPH_TOKEN_SECRET: 'redaction-test-secret-'.padEnd(40, 'x'), METAMORPH_GITHUB_TOKEN: TOKEN, METAMORPH_RUNNER_REPO: CONFIG.repo, METAMORPH_PUBLIC_URL: 'https://metamorph.example.com' };

beforeAll(async () => {
  for (const [k, v] of Object.entries(ENV)) {
    saved[k] = process.env[k];
    process.env[k] = v;
  }
  work = await mkdtemp(join(tmpdir(), 'metamorph-sec-redaction-'));
  const gh = new FakeGithub();
  const after = readFileSync(new URL('../fixtures/runner/php-shop-after.json', import.meta.url), 'utf8');
  const before = readFileSync(new URL('../fixtures/runner/php-shop-before.json', import.meta.url), 'utf8');
  gh.scriptFor = (inputs) => ({ states: [{ status: 'completed', conclusion: 'success' }], artifact: resultZip(inputs.patch_gz_b64 ? after : before) });
  offline = installOfflineFetch({
    osvFixed: '4.17.21',
    extra: (url, init) => {
      if (url.hostname === 'api.github.com' || url.hostname.endsWith('.blob.core.windows.net')) return gh.fetch(url.href, init);
      if (url.hostname === 'codeload.github.com') return new Response(url.pathname.startsWith('/acme/nodeonly/') ? NODE_TAR : MIXED_TAR, { status: 200 });
      return undefined;
    }
  });
  const l = loggedCtx();
  restoreConsole = watchConsole(l.lines);
  logs.push(...[]); // lines are shared through l.lines below
  const run = async (name: string, fn: (c: typeof l.ctx) => Promise<unknown>) => {
    try {
      outputs[name] = JSON.stringify(await fn(l.ctx));
    } catch (e) {
      outputs[name] = `ERROR ${(e as Error).message}`;
    }
  };
  await run('assess_project', (c) => new AssessmentTools().assessProject({ repo_url: REPO }, c));
  await run('plan_modernization', (c) => new PlanningTools().planModernization({ repo_url: REPO }, c));
  for (const [repo, stage] of [[REPO2, 'patch-dependencies'], [REPO, 'remove-committed-env'], [REPO, 'upgrade-runtime'], [REPO, 'add-packaging']]) {
    let token = '';
    await run(`preview_changes:${stage}`, async (c) => {
      const p = (await new PlanningTools().previewChanges({ repo_url: repo, stage }, c)) as { approvalToken?: string };
      token = p.approvalToken ?? '';
      return p;
    });
    if (token) {
      await run(`apply_stage:${stage}`, (c) => new PlanningTools().applyStage({ repo_url: repo, stage, approval_token: token }, c));
      if (stage === 'patch-dependencies') await run('verify_patch', (c) => new VerifyTools().verifyPatch({ repo_url: repo, stage, approval_token: token }, c));
    }
  }
  let reportFiles: Array<{ format: string; uri: string }> = [];
  await run('generate_report', async (c) => {
    const r = (await new ReportTools().generateReport({ repo_url: REPO }, c)) as { files: Array<{ format: string; uri: string }> };
    reportFiles = r.files;
    return r;
  });
  for (const f of reportFiles) {
    const a = lookupResource(f.uri);
    if (!a) continue;
    if (f.format === 'pdf') {
      const file = join(work, 'report.pdf');
      await writeFile(file, a.data);
      const r = spawnSync('pdftotext', [file, '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
      if (r.status === 0) outputs['report.pdf (text)'] = r.stdout;
    } else outputs[`report.${f.format}`] = a.data.toString('utf8');
  }
  logs.push(...l.lines);
  if (process.env.SEC_DUMP) await writeFile(process.env.SEC_DUMP, JSON.stringify({ outputs, logs }, null, 1));
}, 240_000);

afterAll(async () => {
  restoreConsole?.();
  offline?.restore();
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  await rm(work, { recursive: true, force: true });
});

describe('secret redaction across every tool output', () => {
  it('actually ran the whole flow (guards against a vacuous pass)', () => {
    for (const name of ['assess_project', 'plan_modernization', 'preview_changes:patch-dependencies', 'apply_stage:patch-dependencies', 'verify_patch', 'generate_report', 'report.sarif', 'report.sbom']) {
      expect(outputs[name], name).toBeDefined();
      expect(outputs[name], name).not.toMatch(/^ERROR/);
      expect(outputs[name].length, name).toBeGreaterThan(50);
    }
    expect(logs.length).toBeGreaterThan(3);
  });

  it('assess_project found the planted problems (so the scan really read the files)', () => {
    const out = outputs['assess_project'];
    expect(out).toContain('hardcoded-secret-in-source');
    expect(out).toContain('env-file-committed');
  });

  for (const [label, value] of Object.entries(S)) {
    it(`never outputs the planted ${label} secret`, () => {
      for (const [name, text] of Object.entries(outputs)) expect(text.includes(value), `${name} contains the ${label} secret`).toBe(false);
      for (const line of logs) expect(line.includes(value), `a log line contains the ${label} secret: ${line.slice(0, 120)}`).toBe(false);
    });
  }

  it('never outputs the runner token or the token secret', () => {
    for (const [name, text] of Object.entries(outputs)) {
      expect(text.includes(TOKEN), `${name} has the GitHub token`).toBe(false);
      expect(text.includes(ENV.METAMORPH_TOKEN_SECRET), `${name} has the HMAC secret`).toBe(false);
    }
    for (const line of logs) {
      expect(line.includes(TOKEN)).toBe(false);
      expect(line.includes(ENV.METAMORPH_TOKEN_SECRET)).toBe(false);
    }
  });

  it('never outputs a credential embedded in any URL, whatever the secret value', () => {
    for (const [name, text] of Object.entries(outputs)) expect(/https?:\/\/[^\s"'/@]+:[^\s"'/@]+@/.test(text), `${name} has a URL with userinfo`).toBe(false);
  });

  it.skipIf(!have('pdftotext'))('extracted the text of the PDF (so the PDF check is not vacuous)', () => {
    expect(outputs['report.pdf (text)']).toBeDefined();
    expect(outputs['report.pdf (text)'].length).toBeGreaterThan(500);
  });

  it('logs hold counts and ids, not repository content', () => {
    expect(logs.some((l) => l.includes('acme'))).toBe(true); // owner/repo are logged on purpose
    for (const l of logs) expect(l.length, l.slice(0, 80)).toBeLessThan(600);
  });
});
