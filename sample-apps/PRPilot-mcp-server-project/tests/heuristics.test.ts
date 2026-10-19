import test from 'node:test';
import assert from 'node:assert/strict';
import { HeuristicsService } from '../src/modules/pull-request/heuristics.service.js';

test('HeuristicsService: correctly classifies files', () => {
  const service = new HeuristicsService();

  assert.equal(service.classifyFile('src/auth/jwt.service.ts'), 'application_logic');
  assert.equal(service.classifyFile('src/components/Button.tsx'), 'application_logic');
  assert.equal(service.classifyFile('backend/main.py'), 'application_logic');

  assert.equal(service.classifyFile('tests/auth.test.ts'), 'tests');
  assert.equal(service.classifyFile('src/__tests__/app.spec.js'), 'tests');
  assert.equal(service.classifyFile('pkg/service_test.go'), 'tests');

  assert.equal(service.classifyFile('package.json'), 'config_dependencies');
  assert.equal(service.classifyFile('.github/workflows/ci.yml'), 'config_dependencies');
  assert.equal(service.classifyFile('Dockerfile'), 'config_dependencies');
  assert.equal(service.classifyFile('tsconfig.json'), 'config_dependencies');

  assert.equal(service.classifyFile('README.md'), 'documentation');
  assert.equal(service.classifyFile('docs/architecture.md'), 'documentation');

  assert.equal(service.classifyFile('public/logo.png'), 'other');
  assert.equal(service.classifyFile('styles/theme.css'), 'other');
});

test('HeuristicsService: diff truncation bounds patch to MAX_PATCH_CHARS', () => {
  const service = new HeuristicsService();
  const hugePatch = 'a'.repeat(3000);

  const rawFiles = [
    {
      filename: 'src/big.ts',
      status: 'modified',
      additions: 100,
      deletions: 0,
      patch: hugePatch,
    },
  ];

  const { files, isTruncated } = service.processFiles(rawFiles);
  assert.equal(isTruncated, false);
  assert.equal(files[0].is_truncated, true);
  assert.match(files[0].patch_excerpt!, /\[truncated 1000 characters\]/);
});

test('HeuristicsService: flags authentication and security boundaries', () => {
  const service = new HeuristicsService();
  const rawFiles = [
    {
      filename: 'src/modules/auth/token.handler.ts',
      status: 'modified',
      additions: 25,
      deletions: 2,
      patch: 'const token = createJwt(user);',
    },
  ];

  const map = service.buildChangeMap(rawFiles, 25, 2);
  const authSignal = map.investigation_signals.find((s) => s.code === 'SIG_AUTH_SECURITY');
  assert.ok(authSignal, 'Should detect authentication security signal');
  assert.equal(authSignal?.severity, 'high');
});

test('HeuristicsService: flags untested application logic changes', () => {
  const service = new HeuristicsService();
  const rawFiles = [
    { filename: 'src/controller.ts', status: 'modified', additions: 10, deletions: 5 },
    { filename: 'src/service.ts', status: 'modified', additions: 20, deletions: 10 },
  ];

  const map = service.buildChangeMap(rawFiles, 30, 15);
  const untestedSignal = map.investigation_signals.find((s) => s.code === 'SIG_UNTESTED_LOGIC');
  assert.ok(untestedSignal, 'Should detect untested logic when tests are missing');
  assert.equal(untestedSignal?.severity, 'high');
});

test('HeuristicsService: flags database migration modifications', () => {
  const service = new HeuristicsService();
  const rawFiles = [
    { filename: 'prisma/migrations/20261017_users/migration.sql', status: 'added', additions: 30, deletions: 0 },
  ];

  const map = service.buildChangeMap(rawFiles, 30, 0);
  const migSignal = map.investigation_signals.find((s) => s.code === 'SIG_DB_MIGRATION');
  assert.ok(migSignal, 'Should detect database migration');
  assert.equal(migSignal?.severity, 'high');
});
