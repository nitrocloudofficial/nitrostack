/**
 * Documentation Synthesizer — reads every dependency manifest in the repository
 * and produces a single, deduplicated view of what the project actually runs on,
 * with links to the upstream docs for each package.
 */
import { Injectable } from '@nitrostack/core';
import * as path from 'path';
import { WorkspaceService } from '../../shared/services/workspace.service.js';
import type { DependencySpec } from '../../shared/schemas/index.js';

export interface DependencyReport {
  target: string;
  manifests: string[];
  dependencies: DependencySpec[];
  byEcosystem: Record<string, number>;
  /** Packages pinned to a major version that is well behind current practice. */
  agingSignals: { name: string; version: string; note: string }[];
  internalDocs: { path: string; title: string; excerpt: string }[];
}

/** Major versions that, if seen, are worth flagging to an agent as "this is old". */
const AGING_HINTS: Record<string, { floor: number; note: string }> = {
  react: { floor: 18, note: 'React 16/17 — no concurrent features, class components likely present' },
  express: { floor: 5, note: 'Express 4.x — middleware signature and error handling differ from 5.x' },
  jest: { floor: 29, note: 'Jest 26 — no native ESM support, older matcher set' },
  eslint: { floor: 9, note: 'ESLint 7/8 — legacy .eslintrc config format, not flat config' },
  webpack: { floor: 5, note: 'Webpack 4 — different loader/plugin API from 5.x' },
  tailwindcss: { floor: 3, note: 'Tailwind 2 — no JIT-by-default, different config surface' },
  junit: { floor: 5, note: 'JUnit 4 — @Test(expected=) style, not Jupiter' },
  moment: { floor: 99, note: 'moment is in maintenance mode upstream' },
};

const DOC_URLS: Record<string, string> = {
  npm: 'https://www.npmjs.com/package/',
  pypi: 'https://pypi.org/project/',
  maven: 'https://mvnrepository.com/artifact/',
};

@Injectable({ deps: [WorkspaceService] })
export class DocumentationService {
  constructor(private workspace: WorkspaceService) {}

  analyse(target: string): DependencyReport {
    const walk = this.workspace.walk(target);
    const dependencies: DependencySpec[] = [];
    const manifests: string[] = [];
    const internalDocs: DependencyReport['internalDocs'] = [];

    for (const abs of walk.files) {
      const rel = this.workspace.rel(target, abs);
      const base = path.basename(abs);
      const content = this.workspace.read(abs);
      if (content === null) continue;

      if (base === 'package.json' && !rel.includes('node_modules')) {
        manifests.push(rel);
        dependencies.push(...this.parsePackageJson(rel, content));
      } else if (base === 'pom.xml') {
        manifests.push(rel);
        dependencies.push(...this.parsePom(rel, content));
      } else if (base === 'requirements.txt') {
        manifests.push(rel);
        dependencies.push(...this.parseRequirements(rel, content));
      } else if (base === 'go.mod') {
        manifests.push(rel);
        dependencies.push(...this.parseGoMod(rel, content));
      } else if (rel.endsWith('.md')) {
        const title = content.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? path.basename(rel, '.md');
        internalDocs.push({
          path: rel,
          title,
          excerpt: content.split('\n').filter((l) => l.trim()).slice(1, 6).join(' ').slice(0, 400),
        });
      }
    }

    const byEcosystem: Record<string, number> = {};
    for (const dep of dependencies) byEcosystem[dep.ecosystem] = (byEcosystem[dep.ecosystem] ?? 0) + 1;

    return {
      target,
      manifests,
      dependencies: dependencies.sort((a, b) => a.name.localeCompare(b.name)),
      byEcosystem,
      agingSignals: this.detectAging(dependencies),
      internalDocs,
    };
  }

  private parsePackageJson(manifest: string, content: string): DependencySpec[] {
    let pkg: Record<string, unknown>;
    try {
      pkg = JSON.parse(content) as Record<string, unknown>;
    } catch {
      return [];
    }
    const out: DependencySpec[] = [];
    const sections: [string, DependencySpec['scope']][] = [
      ['dependencies', 'runtime'],
      ['devDependencies', 'dev'],
      ['peerDependencies', 'runtime'],
    ];
    for (const [key, scope] of sections) {
      const section = pkg[key];
      if (!section || typeof section !== 'object') continue;
      for (const [name, version] of Object.entries(section as Record<string, string>)) {
        out.push({
          ecosystem: 'npm',
          manifest,
          name,
          version: String(version),
          scope,
          docsUrl: `${DOC_URLS.npm}${name}`,
        });
      }
    }
    return out;
  }

  private parsePom(manifest: string, content: string): DependencySpec[] {
    const out: DependencySpec[] = [];
    for (const block of content.matchAll(/<dependency>([\s\S]*?)<\/dependency>/g)) {
      const body = block[1];
      const groupId = body.match(/<groupId>([^<]+)<\/groupId>/)?.[1]?.trim();
      const artifactId = body.match(/<artifactId>([^<]+)<\/artifactId>/)?.[1]?.trim();
      const version = body.match(/<version>([^<]+)<\/version>/)?.[1]?.trim() ?? 'managed';
      const scopeRaw = body.match(/<scope>([^<]+)<\/scope>/)?.[1]?.trim();
      if (!groupId || !artifactId) continue;
      out.push({
        ecosystem: 'maven',
        manifest,
        name: `${groupId}:${artifactId}`,
        version,
        scope: scopeRaw === 'test' ? 'test' : scopeRaw === 'provided' ? 'build' : 'runtime',
        docsUrl: `${DOC_URLS.maven}${groupId}/${artifactId}`,
      });
    }
    return out;
  }

  private parseRequirements(manifest: string, content: string): DependencySpec[] {
    const out: DependencySpec[] = [];
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-')) continue;
      const match = trimmed.match(/^([A-Za-z0-9_.\-[\]]+)\s*(?:([=<>!~]=?)\s*([^\s;#]+))?/);
      if (!match) continue;
      const name = match[1];
      out.push({
        ecosystem: 'pypi',
        manifest,
        name,
        version: match[3] ?? 'unpinned',
        scope: /pytest|tox|mock|coverage/i.test(name) ? 'test' : 'runtime',
        docsUrl: `${DOC_URLS.pypi}${name}`,
      });
    }
    return out;
  }

  private parseGoMod(manifest: string, content: string): DependencySpec[] {
    const out: DependencySpec[] = [];
    for (const m of content.matchAll(/^\s*([\w./\-]+)\s+(v[\w.\-+]+)/gm)) {
      if (m[1] === 'go' || m[1] === 'module') continue;
      out.push({ ecosystem: 'go', manifest, name: m[1], version: m[2], scope: 'runtime' });
    }
    return out;
  }

  private detectAging(deps: DependencySpec[]): DependencyReport['agingSignals'] {
    const signals: DependencyReport['agingSignals'] = [];
    const seen = new Set<string>();
    for (const dep of deps) {
      const short = dep.name.includes(':') ? dep.name.split(':')[1] : dep.name;
      const hint = AGING_HINTS[short];
      if (!hint || seen.has(short)) continue;
      const major = Number(dep.version.replace(/^[^\d]*/, '').split('.')[0]);
      if (Number.isFinite(major) && major < hint.floor) {
        seen.add(short);
        signals.push({ name: dep.name, version: dep.version, note: hint.note });
      }
    }
    return signals;
  }
}
