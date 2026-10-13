import { jest, describe, it, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';

// Mock https.get
const mockHttpsGet = jest.fn<any>();
jest.unstable_mockModule('https', () => ({
  default: {
    get: mockHttpsGet
  },
  get: mockHttpsGet
}));

// Mock the skills modules using unstable_mockModule before importing upgrade.js
const mockCloneSkillsRepo = jest.fn<() => Promise<string>>();
const mockDiscoverSkills = jest.fn<(cloneDir: string) => Promise<any[]>>();
const mockInstallSkills = jest.fn<(agents: any, skills: any, force: boolean, scope: string, projectDir: string) => Promise<any[]>>();

jest.unstable_mockModule('../skills/clone.js', () => ({
  cloneSkillsRepo: mockCloneSkillsRepo,
  SkillsCloneError: class SkillsCloneError extends Error {}
}));
jest.unstable_mockModule('../skills/discover.js', () => ({
  discoverSkills: mockDiscoverSkills,
}));
jest.unstable_mockModule('../skills/installer.js', () => ({
  installSkills: mockInstallSkills,
}));

// We'll import these dynamically in beforeAll
let isLocalDependency: any;
let compareVersions: any;
let upgradeCommand: any;

describe('Upgrade Command', () => {
  beforeAll(async () => {
    const module = await import('../commands/upgrade.js');
    isLocalDependency = module.isLocalDependency;
    compareVersions = module.compareVersions;
    upgradeCommand = module.upgradeCommand;
  });

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('should export upgradeCommand function', () => {
    expect(typeof upgradeCommand).toBe('function');
  });

  describe('isLocalDependency', () => {
    it('should identify local workspace dependency patterns', () => {
      expect(isLocalDependency('file:../../core')).toBe(true);
      expect(isLocalDependency('link:../core')).toBe(true);
      expect(isLocalDependency('workspace:*')).toBe(true);
      expect(isLocalDependency('./local/folder')).toBe(true);
      expect(isLocalDependency('/absolute/path')).toBe(true);
    });

    it('should return false for registry semver versions', () => {
      expect(isLocalDependency('^1.0.8')).toBe(false);
      expect(isLocalDependency('~1.0.8')).toBe(false);
      expect(isLocalDependency('1.0.8')).toBe(false);
    });
  });

  describe('compareVersions', () => {
    it('should return 1 when v1 is greater than v2', () => {
      expect(compareVersions('1.0.12', '1.0.8')).toBe(1);
      expect(compareVersions('^1.1.0', '1.0.8')).toBe(1);
    });

    it('should return -1 when v1 is less than v2', () => {
      expect(compareVersions('1.0.6', '1.0.11')).toBe(-1);
      expect(compareVersions('^1.0.6', '1.0.11')).toBe(-1);
    });

    it('should return 0 when versions are equal', () => {
      expect(compareVersions('1.0.11', '1.0.11')).toBe(0);
      expect(compareVersions('^1.0.11', '1.0.11')).toBe(0);
    });

    it('should handle pre-release identifiers without producing NaN', () => {
      // Pre-release suffixes are stripped, so comparison is on the base version.
      expect(compareVersions('1.0.0-beta.1', '1.0.0')).toBe(0);
      expect(compareVersions('1.0.0-alpha.3', '1.0.0-beta.1')).toBe(0);
      expect(compareVersions('1.2.0-rc.1', '1.1.0')).toBe(1);
      expect(compareVersions('^1.0.0-beta.1', '1.1.0')).toBe(-1);
    });
  });

  describe('upgradeCommand skills upgrading', () => {
    let tempProjectDir: string;
    let tempClonedSkillsDir: string;
    let originalCwd: () => string;

    beforeEach(async () => {
      originalCwd = process.cwd;
    });

    afterEach(async () => {
      process.cwd = originalCwd;
      if (tempProjectDir) {
        await fs.remove(tempProjectDir);
      }
      if (tempClonedSkillsDir) {
        await fs.remove(tempClonedSkillsDir);
      }
    });

    it('should upgrade agent skills when a newer version is available', async () => {
      tempProjectDir = await makeTempDir({
        'package.json': JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          dependencies: {
            '@nitrostack/core': '^1.0.0'
          },
          nitrostack: {
            skillsVersion: '0.9.0'
          }
        })
      });

      tempClonedSkillsDir = await makeTempDir({
        'package.json': JSON.stringify({
          name: '@nitrostack/skills',
          version: '1.1.0'
        }),
        'skills/mock-skill/SKILL.md': '# Mock Skill'
      });

      process.cwd = () => tempProjectDir;

      mockCloneSkillsRepo.mockResolvedValue(tempClonedSkillsDir);
      mockDiscoverSkills.mockResolvedValue([{ name: 'mock-skill', sourcePath: path.join(tempClonedSkillsDir, 'skills', 'mock-skill') }]);
      mockInstallSkills.mockImplementation(async (agents: any, skills: any, force: boolean, scope: string, projectDir: string) => {
        // Simulate installation by copying files
        for (const skill of skills) {
          const dest = path.join(projectDir, '.agents', 'skills', skill.name);
          await fs.copy(skill.sourcePath, dest);
        }
        return [];
      });

      // Mock https.get for @nitrostack/core NPM check
      mockHttpsGet.mockImplementation((url: string, options: any, callback: any) => {
        const cb = typeof options === 'function' ? options : callback;
        const mockResponse: any = {
          statusCode: 200,
          on: (event: string, handler: Function) => {
            if (event === 'data') {
              handler(Buffer.from(JSON.stringify({ version: '1.0.0' }))); // same as package.json
            }
            if (event === 'end') {
              handler();
            }
            return mockResponse;
          }
        };
        if (cb) cb(mockResponse);
        const mockRequest: any = {
          on: () => mockRequest,
          destroy: () => {}
        };
        return mockRequest;
      });

      await upgradeCommand({});

      // Verify that skillsVersion was updated in package.json
      const updatedPkg = fs.readJSONSync(path.join(tempProjectDir, 'package.json'));
      expect(updatedPkg.nitrostack?.skillsVersion).toBe('1.1.0');

      // Verify that the skill files were copied into agent directories
      const skillPath = path.join(tempProjectDir, '.agents', 'skills', 'mock-skill', 'SKILL.md');
      expect(fs.existsSync(skillPath)).toBe(true);
      expect(fs.readFileSync(skillPath, 'utf-8')).toBe('# Mock Skill');
    });

    it('should NOT upgrade agent skills in dry-run mode', async () => {
      tempProjectDir = await makeTempDir({
        'package.json': JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          dependencies: {
            '@nitrostack/core': '^1.0.0'
          },
          nitrostack: {
            skillsVersion: '0.9.0'
          }
        })
      });

      tempClonedSkillsDir = await makeTempDir({
        'package.json': JSON.stringify({
          name: '@nitrostack/skills',
          version: '1.1.0'
        }),
        'skills/mock-skill/SKILL.md': '# Mock Skill'
      });

      process.cwd = () => tempProjectDir;

      mockCloneSkillsRepo.mockResolvedValue(tempClonedSkillsDir);
      mockDiscoverSkills.mockResolvedValue([{ name: 'mock-skill', sourcePath: path.join(tempClonedSkillsDir, 'skills', 'mock-skill') }]);
      mockInstallSkills.mockResolvedValue([]);

      mockHttpsGet.mockImplementation((url: string, options: any, callback: any) => {
        const cb = typeof options === 'function' ? options : callback;
        const mockResponse: any = {
          statusCode: 200,
          on: (event: string, handler: Function) => {
            if (event === 'data') {
              handler(Buffer.from(JSON.stringify({ version: '1.0.0' })));
            }
            if (event === 'end') {
              handler();
            }
            return mockResponse;
          }
        };
        if (cb) cb(mockResponse);
        const mockRequest: any = {
          on: () => mockRequest,
          destroy: () => {}
        };
        return mockRequest;
      });

      await upgradeCommand({ dryRun: true });

      // Verify that package.json version is still old
      const updatedPkg = fs.readJSONSync(path.join(tempProjectDir, 'package.json'));
      expect(updatedPkg.nitrostack?.skillsVersion).toBe('0.9.0');

      // Verify that skill files were NOT copied
      const skillPath = path.join(tempProjectDir, '.agents', 'skills', 'mock-skill', 'SKILL.md');
      expect(fs.existsSync(skillPath)).toBe(false);
    });
  });
});

/** Creates a temporary directory tree and returns its root path. */
async function makeTempDir(
  structure: Record<string, string | null>,
): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'nitro-upgrade-test-'));
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
