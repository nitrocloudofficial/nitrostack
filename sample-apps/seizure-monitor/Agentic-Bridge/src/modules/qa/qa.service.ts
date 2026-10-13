/**
 * Quality Assurance Analyst — recovers the team's actual testing contract:
 * which runners are in play, where specs live, what the coverage gate is, and
 * which lint rules will bounce a PR.
 */
import { Injectable } from '@nitrostack/core';
import * as path from 'path';
import { WorkspaceService } from '../../shared/services/workspace.service.js';

export interface TestFramework {
  name: string;
  ecosystem: string;
  configFile: string;
  testMatch: string[];
  detail: string;
}

export interface TestStrategyReport {
  target: string;
  frameworks: TestFramework[];
  coverageThresholds: Record<string, number>;
  /** Directories where specs actually live, inferred from real files on disk. */
  specLocations: { directory: string; count: number; examplePath: string }[];
  namingConvention: string;
  lintRules: { file: string; rules: { rule: string; setting: string }[]; extends: string[] }[];
  formatter: { file: string; settings: Record<string, unknown> } | null;
  setupFiles: string[];
  /** Rules stated in CONTRIBUTING/docs that no config file encodes. */
  writtenPolicies: string[];
}

@Injectable({ deps: [WorkspaceService] })
export class QaService {
  constructor(private workspace: WorkspaceService) {}

  analyse(target: string): TestStrategyReport {
    const walk = this.workspace.walk(target);
    const frameworks: TestFramework[] = [];
    const lintRules: TestStrategyReport['lintRules'] = [];
    const coverageThresholds: Record<string, number> = {};
    const setupFiles: string[] = [];
    const writtenPolicies: string[] = [];
    let formatter: TestStrategyReport['formatter'] = null;

    const specFiles: string[] = [];

    for (const abs of walk.files) {
      const rel = this.workspace.rel(target, abs);
      const base = path.basename(abs);
      const content = this.workspace.read(abs);
      if (content === null) continue;

      if (/\.(spec|test)\.[jt]sx?$/.test(base) || /Test\.java$/.test(base) || /^test_.*\.py$/.test(base)) {
        specFiles.push(rel);
      }

      if (base === 'jest.config.js' || base === 'jest.config.cjs' || base === 'jest.config.ts') {
        frameworks.push({
          name: 'Jest',
          ecosystem: 'node',
          configFile: rel,
          testMatch: this.extractArray(content, 'testMatch'),
          detail: this.summariseJest(content),
        });
        Object.assign(coverageThresholds, this.extractCoverageThresholds(content));
        setupFiles.push(...this.extractArray(content, 'setupFilesAfterEach'), ...this.extractArray(content, 'setupFilesAfterEnv'));
      }

      if (base === 'vitest.config.ts' || base === 'vitest.config.js') {
        frameworks.push({
          name: 'Vitest',
          ecosystem: 'node',
          configFile: rel,
          testMatch: this.extractArray(content, 'include'),
          detail: 'Vitest configuration detected',
        });
      }

      if (base === 'pom.xml') {
        if (/<artifactId>junit<\/artifactId>/.test(content)) {
          const version = content.match(/<artifactId>junit<\/artifactId>\s*<version>([^<]+)/)?.[1] ?? 'unknown';
          frameworks.push({
            name: `JUnit ${version.startsWith('4') ? '4' : version}`,
            ecosystem: 'java',
            configFile: rel,
            testMatch: ['src/test/java/**/*Test.java'],
            detail:
              version.startsWith('4')
                ? 'JUnit 4 — use @Test(expected=...) and @Before, NOT Jupiter annotations'
                : `JUnit ${version}`,
          });
        }
        if (/<artifactId>mockito-core<\/artifactId>/.test(content)) {
          frameworks.push({
            name: 'Mockito',
            ecosystem: 'java',
            configFile: rel,
            testMatch: [],
            detail: 'Mocking library for the Java tier',
          });
        }
      }

      if (base === 'requirements.txt' && /(^|\n)pytest/i.test(content)) {
        frameworks.push({
          name: 'pytest',
          ecosystem: 'python',
          configFile: rel,
          testMatch: ['test_*.py', '*_test.py'],
          detail: 'pytest for the batch tier',
        });
      }

      if (/^\.eslintrc(\.json|\.js|\.cjs)?$/.test(base)) {
        lintRules.push(this.parseEslint(rel, content));
      }

      if (/^\.prettierrc(\.json)?$/.test(base)) {
        try {
          formatter = { file: rel, settings: JSON.parse(content) as Record<string, unknown> };
        } catch {
          formatter = { file: rel, settings: {} };
        }
      }

      if (/setup\.[jt]s$/.test(base) && rel.includes('test')) setupFiles.push(rel);

      if (base === 'CONTRIBUTING.md' || rel.startsWith('docs/')) {
        writtenPolicies.push(...this.extractPolicies(content, rel));
      }
    }

    return {
      target,
      frameworks,
      coverageThresholds,
      specLocations: this.groupSpecLocations(specFiles),
      namingConvention: this.inferNaming(specFiles),
      lintRules,
      formatter,
      setupFiles: [...new Set(setupFiles)],
      writtenPolicies: [...new Set(writtenPolicies)],
    };
  }

  private summariseJest(content: string): string {
    const env = content.match(/testEnvironment:\s*['"]([^'"]+)/)?.[1];
    const parts = ['Jest'];
    if (env) parts.push(`environment=${env}`);
    if (/collectCoverageFrom/.test(content)) parts.push('coverage collection configured');
    return parts.join(', ');
  }

  private extractArray(content: string, key: string): string[] {
    const block = content.match(new RegExp(`${key}\\s*:\\s*\\[([^\\]]*)\\]`));
    if (!block) return [];
    return [...block[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
  }

  private extractCoverageThresholds(content: string): Record<string, number> {
    const out: Record<string, number> = {};
    const block = content.match(/coverageThreshold\s*:\s*\{[\s\S]*?global\s*:\s*\{([^}]*)\}/);
    if (!block) return out;
    for (const m of block[1].matchAll(/(\w+)\s*:\s*(\d+)/g)) out[m[1]] = Number(m[2]);
    return out;
  }

  private parseEslint(file: string, content: string): TestStrategyReport['lintRules'][number] {
    const rules: { rule: string; setting: string }[] = [];
    let extendsList: string[] = [];
    try {
      const parsed = JSON.parse(content) as { rules?: Record<string, unknown>; extends?: string | string[] };
      extendsList = Array.isArray(parsed.extends) ? parsed.extends : parsed.extends ? [parsed.extends] : [];
      for (const [rule, setting] of Object.entries(parsed.rules ?? {})) {
        rules.push({ rule, setting: JSON.stringify(setting) });
      }
    } catch {
      // .eslintrc.js — pull what we can without evaluating untrusted code.
      for (const m of content.matchAll(/['"]([\w@/-]+)['"]\s*:\s*(\[[^\]]*\]|['"]\w+['"])/g)) {
        rules.push({ rule: m[1], setting: m[2] });
      }
    }
    return { file, rules, extends: extendsList };
  }

  private groupSpecLocations(specFiles: string[]): TestStrategyReport['specLocations'] {
    const byDir = new Map<string, string[]>();
    for (const f of specFiles) {
      const dir = path.posix.dirname(f);
      byDir.set(dir, [...(byDir.get(dir) ?? []), f]);
    }
    return [...byDir.entries()]
      .map(([directory, files]) => ({ directory, count: files.length, examplePath: files[0] }))
      .sort((a, b) => b.count - a.count);
  }

  private inferNaming(specFiles: string[]): string {
    if (!specFiles.length) return 'no test files detected';
    const counts = { spec: 0, test: 0, javaTest: 0, pytest: 0 };
    for (const f of specFiles) {
      if (/\.spec\.[jt]sx?$/.test(f)) counts.spec++;
      else if (/\.test\.[jt]sx?$/.test(f)) counts.test++;
      else if (/Test\.java$/.test(f)) counts.javaTest++;
      else if (/test_.*\.py$/.test(f)) counts.pytest++;
    }
    const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    const label: Record<string, string> = {
      spec: '<name>.spec.js — the dominant convention here',
      test: '<name>.test.js',
      javaTest: '<Name>Test.java (JUnit)',
      pytest: 'test_<name>.py (pytest)',
    };
    return label[winner[0]] ?? 'mixed';
  }

  /** Pull imperative rules out of prose docs — the things no config file encodes. */
  private extractPolicies(content: string, file: string): string[] {
    const out: string[] = [];
    for (const line of content.split('\n')) {
      const t = line.replace(/^[-*]\s*/, '').trim();
      if (t.length < 25 || t.length > 220) continue;
      if (/\b(must|never|always|do not|don't|mandatory|rejected in review|required|enforced)\b/i.test(t)) {
        out.push(`${t}  _(${file})_`);
      }
    }
    return out.slice(0, 12);
  }
}
