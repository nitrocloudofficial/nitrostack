import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { discoverSkills } from '../skills/discover.js';
import { AGENTS, detectAgents } from '../skills/detect-agents.js';
import { installSkillsForAgent } from '../skills/installer.js';
import type { AgentDescriptor, Skill } from '../skills/types.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Creates a temporary directory tree and returns its root path. */
async function makeTempDir(
  structure: Record<string, string | null>,
): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'nitro-skills-test-'));
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

// ── discoverSkills ───────────────────────────────────────────────────────────

describe('discoverSkills', () => {
  it('returns a Skill for every non-hidden subdirectory of skills/', async () => {
    const cloneDir = await makeTempDir({
      'skills/nitrostack-sdk': null,
      'skills/mcp-best-practices': null,
      'skills/oauth-guide': null,
      'src/index.ts': 'export {}',
      'README.md': '# hello',
    });

    try {
      const skills = await discoverSkills(cloneDir);
      const names = skills.map((s) => s.name);
      expect(names).toHaveLength(3);
      expect(names).toContain('nitrostack-sdk');
      expect(names).toContain('mcp-best-practices');
      expect(names).toContain('oauth-guide');
    } finally {
      await fs.remove(cloneDir);
    }
  });

  it('ignores hidden entries inside skills/', async () => {
    const cloneDir = await makeTempDir({
      'skills/real-skill': null,
      'skills/.hidden': null,
      'skills/.DS_Store': 'binary',
    });

    try {
      const skills = await discoverSkills(cloneDir);
      expect(skills.map((s) => s.name)).toEqual(['real-skill']);
    } finally {
      await fs.remove(cloneDir);
    }
  });

  it('ignores plain files inside skills/', async () => {
    const cloneDir = await makeTempDir({
      'skills/real-skill': null,
      'skills/README.md': '# ignored',
    });

    try {
      const skills = await discoverSkills(cloneDir);
      expect(skills.map((s) => s.name)).toEqual(['real-skill']);
    } finally {
      await fs.remove(cloneDir);
    }
  });

  it('returns an empty array when the skills/ directory does not exist', async () => {
    const cloneDir = await makeTempDir({ 'README.md': '# empty' });

    try {
      const skills = await discoverSkills(cloneDir);
      expect(skills).toHaveLength(0);
    } finally {
      await fs.remove(cloneDir);
    }
  });

  it('returns skills sorted alphabetically', async () => {
    const cloneDir = await makeTempDir({
      'skills/zebra': null,
      'skills/alpha': null,
      'skills/mango': null,
    });

    try {
      const skills = await discoverSkills(cloneDir);
      expect(skills.map((s) => s.name)).toEqual(['alpha', 'mango', 'zebra']);
    } finally {
      await fs.remove(cloneDir);
    }
  });

  it('populates sourcePath correctly', async () => {
    const cloneDir = await makeTempDir({ 'skills/my-skill': null });

    try {
      const [skill] = await discoverSkills(cloneDir);
      expect(skill.sourcePath).toBe(path.join(cloneDir, 'skills', 'my-skill'));
    } finally {
      await fs.remove(cloneDir);
    }
  });
});

// ── detectAgents ─────────────────────────────────────────────────────────────

describe('detectAgents', () => {
  it('returns only agents whose detect() resolves to true', async () => {
    // Temporarily override detect() for all agents in the registry
    const originals = AGENTS.map((a) => a.detect.bind(a));

    AGENTS[0].detect = async () => true;   // cursor  → present
    AGENTS[1].detect = async () => false;  // codex   → absent
    AGENTS[2].detect = async () => true;   // claude  → present
    AGENTS[3].detect = async () => false;  // gemini  → absent
    AGENTS[4].detect = async () => false;  // antigravity → absent

    try {
      const detected = await detectAgents();
      const ids = detected.map((a) => a.id);
      expect(ids).toContain('cursor');
      expect(ids).toContain('claude-code');
      expect(ids).not.toContain('codex');
      expect(ids).not.toContain('gemini-cli');
      expect(ids).not.toContain('antigravity');
    } finally {
      // Restore original detect() functions
      AGENTS.forEach((a, i) => { a.detect = originals[i]; });
    }
  });

  it('handles a detect() that throws without crashing', async () => {
    const orig = AGENTS[0].detect.bind(AGENTS[0]);
    AGENTS[0].detect = async () => { throw new Error('boom'); };

    try {
      // Should not throw; the agent is simply excluded
      const detected = await detectAgents();
      expect(detected.map((a) => a.id)).not.toContain(AGENTS[0].id);
    } finally {
      AGENTS[0].detect = orig;
    }
  });
});

// ── installSkillsForAgent ─────────────────────────────────────────────────────

describe('installSkillsForAgent', () => {
  /** Build a minimal agent descriptor pointing to a temp directory. */
  function makeAgent(skillsDir: string): AgentDescriptor {
    return {
      id: 'test-agent',
      name: 'Test Agent',
      displayPath: skillsDir,
      async detect() { return true; },
      getSkillsDir() { return skillsDir; },
    };
  }

  /** Build a set of Skill objects from a list of temp source directories. */
  function makeSkills(sources: Record<string, string>): Skill[] {
    return Object.entries(sources).map(([name, sourcePath]) => ({ name, sourcePath }));
  }

  it('copies skills into the agent skills directory', async () => {
    const srcRoot = await makeTempDir({
      'skill-a/SKILL.md': '# A',
      'skill-b/SKILL.md': '# B',
    });
    const destRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'nitro-dest-'));

    try {
      const skills = makeSkills({
        'skill-a': path.join(srcRoot, 'skill-a'),
        'skill-b': path.join(srcRoot, 'skill-b'),
      });

      const agent = makeAgent(destRoot);
      const result = await installSkillsForAgent(agent, skills, false);

      expect(result.installed).toContain('skill-a');
      expect(result.installed).toContain('skill-b');
      expect(result.skipped).toHaveLength(0);
      expect(result.error).toBeUndefined();

      expect(await fs.pathExists(path.join(destRoot, 'skill-a', 'SKILL.md'))).toBe(true);
      expect(await fs.pathExists(path.join(destRoot, 'skill-b', 'SKILL.md'))).toBe(true);
    } finally {
      await fs.remove(srcRoot);
      await fs.remove(destRoot);
    }
  });

  it('skips an existing skill when force is false', async () => {
    const srcRoot = await makeTempDir({ 'skill-a/SKILL.md': '# new' });
    const destRoot = await makeTempDir({ 'skill-a/SKILL.md': '# existing' });

    try {
      const skills = makeSkills({ 'skill-a': path.join(srcRoot, 'skill-a') });
      const agent = makeAgent(destRoot);

      const result = await installSkillsForAgent(agent, skills, false);

      expect(result.skipped).toContain('skill-a');
      expect(result.installed).toHaveLength(0);

      // Original file should be untouched
      const content = await fs.readFile(path.join(destRoot, 'skill-a', 'SKILL.md'), 'utf-8');
      expect(content).toBe('# existing');
    } finally {
      await fs.remove(srcRoot);
      await fs.remove(destRoot);
    }
  });

  it('overwrites an existing skill when force is true', async () => {
    const srcRoot = await makeTempDir({ 'skill-a/SKILL.md': '# new' });
    const destRoot = await makeTempDir({ 'skill-a/SKILL.md': '# existing' });

    try {
      const skills = makeSkills({ 'skill-a': path.join(srcRoot, 'skill-a') });
      const agent = makeAgent(destRoot);

      const result = await installSkillsForAgent(agent, skills, true);

      expect(result.installed).toContain('skill-a');
      expect(result.skipped).toHaveLength(0);

      const content = await fs.readFile(path.join(destRoot, 'skill-a', 'SKILL.md'), 'utf-8');
      expect(content).toBe('# new');
    } finally {
      await fs.remove(srcRoot);
      await fs.remove(destRoot);
    }
  });

  it('creates the skills directory when it does not exist', async () => {
    const srcRoot = await makeTempDir({ 'skill-x/SKILL.md': '# x' });
    const destRoot = path.join(os.tmpdir(), `nitro-new-${Date.now()}`);

    try {
      const skills = makeSkills({ 'skill-x': path.join(srcRoot, 'skill-x') });
      const agent = makeAgent(destRoot);

      const result = await installSkillsForAgent(agent, skills, false);

      expect(result.installed).toContain('skill-x');
      expect(await fs.pathExists(path.join(destRoot, 'skill-x', 'SKILL.md'))).toBe(true);
    } finally {
      await fs.remove(srcRoot);
      await fs.remove(destRoot);
    }
  });

  it('reports an error without throwing when the source path is invalid', async () => {
    const destRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'nitro-dest-'));

    try {
      const skills: Skill[] = [{ name: 'ghost', sourcePath: '/nonexistent/path/ghost' }];
      const agent = makeAgent(destRoot);

      const result = await installSkillsForAgent(agent, skills, false);

      expect(result.error).toBeDefined();
      expect(result.installed).toHaveLength(0);
    } finally {
      await fs.remove(destRoot);
    }
  });
});
