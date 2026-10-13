import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { describe, it, expect } from '@jest/globals';
import {
  buildIgnoreMatcher,
  collectFilesToPack,
  createIgnoreMatcher,
  createOptimizedZip,
  formatPackTree,
  mergeGitignoreRules,
  packProject,
  PackValidationError,
  validateNitrostackProject,
} from '../pack/index.js';

async function makeTempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function createProject(structure: Record<string, string | null>): Promise<string> {
  const root = await makeTempDir('nitro-pack-test-');

  for (const [rel, content] of Object.entries(structure)) {
    const abs = path.join(root, rel);
    if (content === null) {
      await fs.mkdirp(abs);
    } else {
      await fs.mkdirp(path.dirname(abs));
      await fs.writeFile(abs, content, 'utf-8');
    }
  }

  return root;
}

const ZIP_EOCD_SIGNATURE = 0x06054b50;
const ZIP_CENTRAL_FILE_HEADER_SIGNATURE = 0x02014b50;

/**
 * List zip entry names by parsing the central directory (no system unzip binary).
 */
function listZipEntries(zipPath: string): string[] {
  const buffer = fs.readFileSync(zipPath);
  const minEocdSize = 22;
  const maxComment = 0xffff;
  const searchStart = Math.max(0, buffer.length - (minEocdSize + maxComment));

  let eocdOffset = -1;
  for (let i = buffer.length - minEocdSize; i >= searchStart; i--) {
    if (buffer.readUInt32LE(i) === ZIP_EOCD_SIGNATURE) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error(`Invalid zip: end of central directory not found (${zipPath})`);
  }

  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  let offset = buffer.readUInt32LE(eocdOffset + 16);
  const entries: string[] = [];

  for (let i = 0; i < entryCount; i++) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== ZIP_CENTRAL_FILE_HEADER_SIGNATURE) {
      throw new Error(`Invalid zip: bad central directory header at offset ${offset}`);
    }

    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const nameStart = offset + 46;
    const nameEnd = nameStart + fileNameLength;
    entries.push(buffer.toString('utf8', nameStart, nameEnd));
    offset = nameEnd + extraLength + commentLength;
  }

  return entries;
}

describe('createIgnoreMatcher', () => {
  it('matches basename directory patterns at any depth', () => {
    const matcher = createIgnoreMatcher(['dist/', 'node_modules/', '.next/', 'out/']);

    expect(matcher.ignores('dist/index.js')).toBe(true);
    expect(matcher.ignores('packages/foo/dist/index.js')).toBe(true);
    expect(matcher.ignores('src/widgets/node_modules/react/index.js')).toBe(true);
    expect(matcher.ignores('src/widgets/.next/server.js')).toBe(true);
    expect(matcher.ignores('src/widgets/out/page.html')).toBe(true);
    expect(matcher.ignores('src/index.ts')).toBe(false);
  });

  it('does not exclude a plain file that shares a directory-only pattern name', () => {
    const matcher = createIgnoreMatcher(['dist/']);

    expect(matcher.ignores('dist', false)).toBe(false); // file named "dist"
    expect(matcher.ignores('dist', true)).toBe(true); // directory named "dist"
    expect(matcher.ignores('packages/foo/dist', false)).toBe(false);
    expect(matcher.ignores('packages/foo/dist', true)).toBe(true);
    expect(matcher.ignores('dist/index.js', false)).toBe(true);
  });

  it('matches **/ recursive directory patterns', () => {
    const matcher = createIgnoreMatcher(['**/build/', '**/dist/']);

    expect(matcher.ignores('apps/web/build/x.js')).toBe(true);
    expect(matcher.ignores('packages/foo/dist/index.js')).toBe(true);
    expect(matcher.ignores('src/app.ts')).toBe(false);
  });

  it('matches simple globs and exact env files', () => {
    const matcher = createIgnoreMatcher(['*.log', '.env', '.env.*.local']);

    expect(matcher.ignores('error.log')).toBe(true);
    expect(matcher.ignores('logs/error.log')).toBe(true);
    expect(matcher.ignores('.env')).toBe(true);
    expect(matcher.ignores('.env.production.local')).toBe(true);
    expect(matcher.ignores('src/index.ts')).toBe(false);
  });

  it('supports negation with last-match-wins', () => {
    const matcher = createIgnoreMatcher(['*.log', '!keep.log']);

    expect(matcher.ignores('error.log')).toBe(true);
    expect(matcher.ignores('keep.log')).toBe(false);
  });
});

describe('validateNitrostackProject', () => {
  it('passes when @nitrostack/core is present', async () => {
    const projectDir = await createProject({
      'package.json': JSON.stringify({
        name: 'demo-app',
        dependencies: { '@nitrostack/core': '^1.0.0' },
      }),
    });

    try {
      const info = await validateNitrostackProject(projectDir);
      expect(info.projectName).toBe('demo-app');
      expect(info.nitrostackPackages).toContain('@nitrostack/core');
    } finally {
      await fs.remove(projectDir);
    }
  });

  it('throws when package.json is missing', async () => {
    const projectDir = await makeTempDir('nitro-pack-empty-');

    try {
      await expect(validateNitrostackProject(projectDir)).rejects.toBeInstanceOf(PackValidationError);
    } finally {
      await fs.remove(projectDir);
    }
  });

  it('throws when no @nitrostack/* dependencies exist', async () => {
    const projectDir = await createProject({
      'package.json': JSON.stringify({
        name: 'plain-app',
        dependencies: { express: '^4.0.0' },
      }),
    });

    try {
      await expect(validateNitrostackProject(projectDir)).rejects.toBeInstanceOf(PackValidationError);
    } finally {
      await fs.remove(projectDir);
    }
  });
});

describe('mergeGitignoreRules', () => {
  it('adds missing canonical rules without removing local rules', () => {
    const local = 'custom/\nnode_modules/\n';
    const canonical = 'node_modules/\ndist/\n.env\n';

    const result = mergeGitignoreRules(local, canonical);

    expect(result.updated).toBe(true);
    expect(result.mergedContent).toContain('custom/');
    expect(result.mergedContent).toContain('dist/');
    expect(result.mergedContent).toContain('.env');
    expect(result.addedRules).toEqual(expect.arrayContaining(['dist/', '.env', '.git/']));
  });

  it('injects .git/ when missing', () => {
    const result = mergeGitignoreRules('node_modules/\n', 'node_modules/\n');

    expect(result.mergedContent).toContain('.git/');
    expect(result.addedRules).toContain('.git/');
  });

  it('does not update when all canonical rules already exist', () => {
    const local = 'node_modules/\ndist/\n.git/\n';
    const canonical = 'node_modules/\ndist/\n';

    const result = mergeGitignoreRules(local, canonical);

    expect(result.updated).toBe(false);
    expect(result.addedRules).toHaveLength(0);
  });
});

describe('buildIgnoreMatcher', () => {
  it('excludes build artifacts and .git at any depth', () => {
    const matcher = buildIgnoreMatcher('node_modules/\ndist/\n');

    expect(matcher.ignores('node_modules/pkg/index.js')).toBe(true);
    expect(matcher.ignores('src/widgets/node_modules/react/index.js')).toBe(true);
    expect(matcher.ignores('.git/config')).toBe(true);
    expect(matcher.ignores('dist/index.js')).toBe(true);
    expect(matcher.ignores('packages/foo/dist/index.js')).toBe(true);
    expect(matcher.ignores('apps/web/build/x.js')).toBe(true);
    expect(matcher.ignores('src/widgets/.next/server.js')).toBe(true);
    expect(matcher.ignores('src/widgets/out/page.html')).toBe(true);
    expect(matcher.ignores('nested/deep/out/asset.js')).toBe(true);
    expect(matcher.ignores('src/index.ts')).toBe(false);
  });

  it('excludes .env by default and includes when includeEnv is true', () => {
    const defaultMatcher = buildIgnoreMatcher('.env\n.env.local\n');
    expect(defaultMatcher.ignores('.env')).toBe(true);
    expect(defaultMatcher.ignores('.env.local')).toBe(true);

    const includeMatcher = buildIgnoreMatcher('.env\n.env.local\n', { includeEnv: true });
    expect(includeMatcher.ignores('.env')).toBe(false);
    expect(includeMatcher.ignores('.env.local')).toBe(false);
    expect(includeMatcher.ignores('dist/index.js')).toBe(true);
  });
});

describe('createOptimizedZip', () => {
  it('creates a zip without excluded folders', async () => {
    const projectDir = await createProject({
      'package.json': JSON.stringify({
        name: 'zip-test',
        dependencies: { '@nitrostack/core': '^1.0.0' },
      }),
      'src/index.ts': 'export {};',
      'node_modules/dep/index.js': 'module.exports = {};',
      'dist/bundle.js': 'console.log("x");',
      'packages/foo/dist/index.js': 'nested',
      'apps/web/build/x.js': 'nested-build',
      'src/widgets/.next/server.js': 'next',
      'src/widgets/out/page.html': '<html></html>',
      '.env': 'SECRET=1',
    });

    const zipPath = path.join(projectDir, 'archive.zip');
    const matcher = buildIgnoreMatcher('');

    try {
      await createOptimizedZip(projectDir, zipPath, matcher);
      const entries = listZipEntries(zipPath);

      expect(entries).toContain('package.json');
      expect(entries).toContain('src/index.ts');
      expect(entries.some((entry) => entry.includes('node_modules/'))).toBe(false);
      expect(entries.some((entry) => entry.includes('.git/'))).toBe(false);
      expect(entries.some((entry) => entry.includes('dist/'))).toBe(false);
      expect(entries.some((entry) => entry.includes('build/'))).toBe(false);
      expect(entries.some((entry) => entry.includes('.next/'))).toBe(false);
      expect(entries.some((entry) => entry.includes('/out/'))).toBe(false);
      expect(entries.some((entry) => entry.includes('.env'))).toBe(false);
    } finally {
      await fs.remove(projectDir);
    }
  });

  it('includes .env files when includeEnv is true', async () => {
    const projectDir = await createProject({
      'package.json': JSON.stringify({
        name: 'env-zip',
        dependencies: { '@nitrostack/core': '^1.0.0' },
      }),
      'src/index.ts': 'export {};',
      '.env': 'SECRET=1',
      '.env.local': 'LOCAL=1',
    });

    const zipPath = path.join(projectDir, 'archive.zip');
    const matcher = buildIgnoreMatcher('.env\n.env.local\n', { includeEnv: true });

    try {
      await createOptimizedZip(projectDir, zipPath, matcher);
      const entries = listZipEntries(zipPath);

      expect(entries).toContain('.env');
      expect(entries).toContain('.env.local');
      expect(entries).toContain('src/index.ts');
    } finally {
      await fs.remove(projectDir);
    }
  });
});

describe('packProject', () => {
  it('returns dry-run summary with ✅/❌ tree without creating a zip', async () => {
    const projectDir = await createProject({
      'package.json': JSON.stringify({
        name: 'dry-run-app',
        dependencies: { '@nitrostack/core': '^1.0.0' },
      }),
      'src/main.ts': 'export {};',
      'node_modules/lodash/index.js': 'module.exports = {};',
      'dist/out.js': 'compiled',
      '.env': 'SECRET=1',
    });

    try {
      const result = await packProject({
        cwd: projectDir,
        dryRun: true,
        syncGitignore: false,
      });

      expect(result.outputPath).toBeNull();
      expect(result.filesIncluded).toBeGreaterThan(0);
      expect(result.gitignoreUpdated).toBe(false);
      expect(result.addedGitignoreRules).toHaveLength(0);
      expect(result.excludedCategories.length).toBeGreaterThan(0);
      expect(result.dryRunTree).toBeDefined();
      expect(result.dryRunTree).toContain('✅');
      expect(result.dryRunTree).toContain('❌');
      expect(result.dryRunTree).toContain('package.json');
      expect(result.dryRunTree).toContain('node_modules');
      expect(await fs.pathExists(path.join(projectDir, 'dry-run-app.zip'))).toBe(false);

      const secretsCategory = result.excludedCategories.find((c) => c.category === 'Secrets');
      expect(secretsCategory).toBeDefined();
    } finally {
      await fs.remove(projectDir);
    }
  });

  it('omits Secrets category and includes .env when includeEnv is true', async () => {
    const projectDir = await createProject({
      'package.json': JSON.stringify({
        name: 'env-app',
        dependencies: { '@nitrostack/core': '^1.0.0' },
      }),
      'src/app.ts': 'export {};',
      '.env': 'SECRET=1',
    });

    try {
      const result = await packProject({
        cwd: projectDir,
        output: 'env-app.zip',
        syncGitignore: false,
        includeEnv: true,
      });

      expect(result.excludedCategories.some((c) => c.category === 'Secrets')).toBe(false);

      const entries = listZipEntries(result.outputPath!);
      expect(entries).toContain('.env');
      expect(entries).toContain('src/app.ts');
    } finally {
      await fs.remove(projectDir);
    }
  });

  it('merges gitignore rules and creates project zip', async () => {
    const projectDir = await createProject({
      'package.json': JSON.stringify({
        name: 'packed-app',
        dependencies: { '@nitrostack/core': '^1.0.0' },
      }),
      '.gitignore': 'custom-build/\n',
      'src/app.ts': 'console.log("ok");',
      'custom-build/cache.txt': 'skip me',
      'dist/app.js': 'compiled',
    });

    try {
      const result = await packProject({
        cwd: projectDir,
        output: 'packed-app.zip',
        syncGitignore: true,
      });

      expect(result.outputPath).toBe(path.join(projectDir, 'packed-app.zip'));
      expect(result.gitignoreUpdated).toBe(true);
      expect(result.zipSizeBytes).toBeGreaterThan(0);

      const updatedGitignore = await fs.readFile(path.join(projectDir, '.gitignore'), 'utf-8');
      expect(updatedGitignore).toContain('dist/');
      expect(updatedGitignore).toContain('.git/');

      const entries = listZipEntries(result.outputPath!);
      expect(entries).toContain('src/app.ts');
      expect(entries.some((entry) => entry.includes('dist/'))).toBe(false);
    } finally {
      await fs.remove(projectDir);
    }
  });

  it('always writes the zip into the project root even when --output has directories', async () => {
    const projectDir = await createProject({
      'package.json': JSON.stringify({
        name: 'root-zip-app',
        dependencies: { '@nitrostack/core': '^1.0.0' },
      }),
      'src/app.ts': 'export {};',
    });

    try {
      const result = await packProject({
        cwd: projectDir,
        output: '../outside/backup.zip',
        syncGitignore: false,
      });

      expect(result.outputPath).toBe(path.join(projectDir, 'backup.zip'));
      expect(await fs.pathExists(result.outputPath!)).toBe(true);
      expect(path.dirname(result.outputPath!)).toBe(projectDir);
    } finally {
      await fs.remove(projectDir);
    }
  });
});

describe('formatPackTree', () => {
  it('renders included and excluded paths with emoji markers', () => {
    const tree = formatPackTree(
      'my-app',
      ['package.json', 'src/index.ts'],
      ['node_modules/', 'dist/', '.env'],
    );

    expect(tree).toContain('my-app/');
    expect(tree).toContain('✅');
    expect(tree).toContain('❌');
    expect(tree).toContain('package.json');
    expect(tree).toContain('node_modules/');
  });
});

describe('command exports', () => {
  it('exports packCommand function', async () => {
    const module = await import('../commands/pack.js');
    expect(typeof module.packCommand).toBe('function');
  });

  it('exports standalone pack runner', async () => {
    const module = await import('../pack/standalone.js');
    expect(typeof module.runStandalonePack).toBe('function');
  });
});

describe('collectFilesToPack', () => {
  it('skips ignored directories during traversal and records them as excluded', async () => {
    const projectDir = await createProject({
      'keep.txt': 'yes',
      'node_modules/a/index.js': 'no',
      'src/widgets/out/page.html': 'no',
    });

    const matcher = buildIgnoreMatcher('');

    try {
      const collection = await collectFilesToPack(projectDir, matcher);
      expect(collection.includedPaths).toEqual(['keep.txt']);
      expect(collection.excludedPaths).toEqual(
        expect.arrayContaining(['node_modules/', 'src/widgets/out/']),
      );
    } finally {
      await fs.remove(projectDir);
    }
  });

  it('skips symlink targets outside the project and tolerates circular symlinks', async () => {
    const projectDir = await createProject({
      'package.json': JSON.stringify({
        name: 'symlink-app',
        dependencies: { '@nitrostack/core': '^1.0.0' },
      }),
      'src/keep.ts': 'export {};',
      'inside/file.txt': 'safe',
    });

    const outsideDir = await makeTempDir('nitro-pack-outside-');
    await fs.writeFile(path.join(outsideDir, 'secret.txt'), 'nope');

    try {
      await fs.symlink(outsideDir, path.join(projectDir, 'escape-link'));
      await fs.symlink(path.join(projectDir, 'loop-b'), path.join(projectDir, 'loop-a'));
      await fs.symlink(path.join(projectDir, 'loop-a'), path.join(projectDir, 'loop-b'));
      await fs.symlink(path.join(projectDir, 'inside'), path.join(projectDir, 'alias-inside'));

      const matcher = buildIgnoreMatcher('');
      const collection = await collectFilesToPack(projectDir, matcher);

      expect(collection.includedPaths).toContain('src/keep.ts');
      // Same real directory is walked once (via inside/ or alias-inside/), not duplicated
      expect(
        collection.includedPaths.includes('inside/file.txt')
        || collection.includedPaths.includes('alias-inside/file.txt'),
      ).toBe(true);
      expect(collection.includedPaths.some((p) => p.includes('secret.txt'))).toBe(false);
      expect(collection.includedPaths.some((p) => p.startsWith('escape-link'))).toBe(false);
    } finally {
      await fs.remove(projectDir);
      await fs.remove(outsideDir);
    }
  });
});
