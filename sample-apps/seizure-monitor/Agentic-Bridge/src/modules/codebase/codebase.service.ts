/**
 * Structural Cartographer — builds the dependency graph and architectural
 * topography of a legacy codebase.
 *
 * Import extraction is real static analysis, not regex-over-everything:
 * TypeScript/JavaScript go through the TypeScript compiler's own scanner-backed
 * `preProcessFile`, which understands `require()`, `import`, dynamic import and
 * triple-slash references. Java/Python/other languages fall back to targeted
 * per-language patterns, which is the correct trade for those grammars here.
 */
import { Injectable } from '@nitrostack/core';
import * as path from 'path';
import * as ts from 'typescript';
import { WorkspaceService, DEFAULT_LIMITS } from '../../shared/services/workspace.service.js';
import type { CodebaseNode } from '../../shared/schemas/index.js';

export interface CodebaseMap {
  target: string;
  fileCount: number;
  truncated: boolean;
  truncationReason?: string;
  languages: Record<string, number>;
  layers: Record<string, number>;
  nodes: CodebaseNode[];
  /** Files with the most inbound edges — changing these has the widest blast radius. */
  hotspots: { path: string; inbound: number; layer: string }[];
  /** Directory tree rendered for the manifest. */
  tree: string;
  entryPoints: string[];
  cycles: string[][];
}

const JS_LIKE = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx']);

@Injectable({ deps: [WorkspaceService] })
export class CodebaseService {
  constructor(private workspace: WorkspaceService) {}

  buildMap(target: string): CodebaseMap {
    const walk = this.workspace.walk(target, DEFAULT_LIMITS);
    const nodes = new Map<string, CodebaseNode>();
    const languages: Record<string, number> = {};
    const layers: Record<string, number> = {};

    // Pass 1 — parse each file into a node with its outbound imports.
    for (const abs of walk.files) {
      const rel = this.workspace.rel(target, abs);
      const source = this.workspace.read(abs);
      if (source === null) continue;

      const language = this.detectLanguage(abs);
      const layer = this.classifyLayer(rel, source);
      const { imports, exports, symbols } = this.analyse(abs, source, language);

      languages[language] = (languages[language] ?? 0) + 1;
      layers[layer] = (layers[layer] ?? 0) + 1;

      nodes.set(rel, {
        path: rel,
        language,
        loc: source.split('\n').filter((l) => l.trim().length > 0).length,
        layer,
        imports: [],
        importedBy: [],
        exports,
        symbols,
        // stashed for pass 2
        ...({ _rawImports: imports } as object),
      } as CodebaseNode);
    }

    // Pass 2 — resolve raw specifiers to repo-relative paths and wire both directions.
    for (const [rel, node] of nodes) {
      const raw = (node as unknown as { _rawImports: string[] })._rawImports ?? [];
      const resolved: string[] = [];
      for (const spec of raw) {
        const hit = this.resolveSpecifier(rel, spec, nodes);
        if (hit && hit !== rel) resolved.push(hit);
      }
      node.imports = [...new Set(resolved)];
      delete (node as unknown as { _rawImports?: string[] })._rawImports;
    }
    for (const node of nodes.values()) {
      for (const dep of node.imports) {
        const target_ = nodes.get(dep);
        if (target_ && !target_.importedBy.includes(node.path)) target_.importedBy.push(node.path);
      }
    }

    const list = [...nodes.values()].sort((a, b) => a.path.localeCompare(b.path));

    const hotspots = list
      .filter((n) => n.importedBy.length > 0)
      .sort((a, b) => b.importedBy.length - a.importedBy.length)
      .slice(0, 10)
      .map((n) => ({ path: n.path, inbound: n.importedBy.length, layer: n.layer }));

    return {
      target,
      fileCount: list.length,
      truncated: walk.truncated,
      truncationReason: walk.reason,
      languages,
      layers,
      nodes: list,
      hotspots,
      tree: this.renderTree(list.map((n) => n.path)),
      entryPoints: list
        .filter((n) => n.importedBy.length === 0 && (n.layer === 'route' || /(^|\/)(index|main|app)\.[jt]sx?$/.test(n.path)))
        .map((n) => n.path),
      cycles: this.findCycles(nodes),
    };
  }

  /* --------------------------- static analysis --------------------------- */

  private analyse(
    abs: string,
    source: string,
    language: string
  ): { imports: string[]; exports: string[]; symbols: string[] } {
    const ext = path.extname(abs).toLowerCase();

    if (JS_LIKE.has(ext)) {
      // The TypeScript compiler's own pre-processor: handles require(), import,
      // export-from, dynamic import() and /// <reference> in one pass.
      const info = ts.preProcessFile(source, /* readImportFiles */ true, /* detectJavaScriptImports */ true);
      const imports = info.importedFiles.map((f) => f.fileName);

      const exports: string[] = [];
      const symbols: string[] = [];
      for (const m of source.matchAll(/^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)) symbols.push(m[1]);
      for (const m of source.matchAll(/^\s*(?:export\s+)?class\s+([A-Za-z_$][\w$]*)/gm)) symbols.push(m[1]);
      for (const m of source.matchAll(/^\s*export\s+(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm)) exports.push(m[1]);
      for (const m of source.matchAll(/^\s*export\s+default\s+function\s+([A-Za-z_$][\w$]*)/gm)) exports.push(m[1]);
      if (/export\s+default/.test(source) && !exports.length) exports.push('default');
      // CommonJS: module.exports = { a, b } / exports.foo =
      for (const m of source.matchAll(/module\.exports\s*=\s*\{([^}]*)\}/g)) {
        for (const part of m[1].split(',')) {
          const name = part.split(':')[0].trim();
          if (/^[A-Za-z_$][\w$]*$/.test(name)) exports.push(name);
        }
      }
      for (const m of source.matchAll(/exports\.([A-Za-z_$][\w$]*)\s*=/g)) exports.push(m[1]);

      return { imports, exports: [...new Set(exports)], symbols: [...new Set(symbols)] };
    }

    if (ext === '.java') {
      const imports = [...source.matchAll(/^\s*import\s+(?:static\s+)?([\w.]+);/gm)].map((m) => m[1]);
      const symbols = [...source.matchAll(/^\s*(?:public|protected|private)?\s*(?:final\s+|abstract\s+)?(?:class|interface|enum)\s+(\w+)/gm)].map((m) => m[1]);
      return { imports, exports: symbols, symbols };
    }

    if (ext === '.py') {
      const imports = [
        ...[...source.matchAll(/^\s*import\s+([\w.]+)/gm)].map((m) => m[1]),
        ...[...source.matchAll(/^\s*from\s+([\w.]+)\s+import/gm)].map((m) => m[1]),
      ];
      const symbols = [...source.matchAll(/^\s*(?:def|class)\s+(\w+)/gm)].map((m) => m[1]);
      return { imports, exports: symbols, symbols };
    }

    return { imports: [], exports: [], symbols: [] };
  }

  /** Map an import specifier onto a file we actually indexed. */
  private resolveSpecifier(fromRel: string, spec: string, nodes: Map<string, CodebaseNode>): string | null {
    if (!spec.startsWith('.')) {
      // Bare specifier — a package, or a dotted Java/Python module. Only keep it
      // if it happens to correspond to an indexed file (internal package layout).
      const asPath = spec.replace(/\./g, '/');
      for (const candidate of [`${asPath}.java`, `${asPath}.py`, `${asPath}/__init__.py`]) {
        if (nodes.has(candidate)) return candidate;
      }
      return null;
    }

    const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), spec));
    const candidates = [
      base,
      `${base}.js`, `${base}.jsx`, `${base}.mjs`, `${base}.cjs`, `${base}.ts`, `${base}.tsx`,
      `${base}/index.js`, `${base}/index.jsx`, `${base}/index.ts`, `${base}/index.tsx`,
      `${base}.json`,
    ];
    for (const candidate of candidates) {
      if (nodes.has(candidate)) return candidate;
    }
    return null;
  }

  /* ------------------------------ heuristics ------------------------------ */

  private detectLanguage(file: string): string {
    const map: Record<string, string> = {
      '.js': 'JavaScript', '.jsx': 'JavaScript (JSX)', '.mjs': 'JavaScript', '.cjs': 'JavaScript',
      '.ts': 'TypeScript', '.tsx': 'TypeScript (TSX)', '.java': 'Java', '.py': 'Python',
      '.rb': 'Ruby', '.go': 'Go', '.cs': 'C#', '.php': 'PHP', '.sql': 'SQL', '.sh': 'Shell',
      '.css': 'CSS', '.scss': 'SCSS', '.html': 'HTML', '.md': 'Markdown', '.json': 'JSON',
      '.yml': 'YAML', '.yaml': 'YAML', '.xml': 'XML',
    };
    const named: Record<string, string> = { Jenkinsfile: 'Groovy (Jenkins)', Dockerfile: 'Dockerfile' };
    return named[path.basename(file)] ?? map[path.extname(file).toLowerCase()] ?? 'Other';
  }

  /**
   * Assign an architectural layer. Path conventions first (they are the strongest
   * signal in a codebase with house style), file content second.
   */
  private classifyLayer(rel: string, source: string): CodebaseNode['layer'] {
    const p = rel.toLowerCase();
    if (/(^|\/)(test|tests|__tests__|spec)\//.test(p) || /\.(spec|test)\.[jt]sx?$/.test(p)) return 'test';
    if (/\.(md|txt)$/.test(p) || p.startsWith('docs/')) return 'docs';
    if (/(^|\/)(routes?|controllers?|api)\//.test(p) || /\.route\.[jt]s$/.test(p)) return 'route';
    if (/(^|\/)(services?|domain|usecases?)\//.test(p) || /\.service\.[jt]s$/.test(p)) return 'service';
    if (/(^|\/)(db|dao|repositor(y|ies)|persistence|models?|entities)\//.test(p)) return 'data-access';
    if (/(^|\/)middleware\//.test(p) || /\.middleware\.[jt]s$/.test(p)) return 'middleware';
    if (/(^|\/)components?\//.test(p)) return 'ui-component';
    if (/(^|\/)(views?|pages?|screens?|containers?)\//.test(p)) return 'ui-view';
    if (/(^|\/)(scripts?|jobs?|batch|tasks)\//.test(p)) return 'batch';
    if (
      /\.(json|ya?ml|xml|toml|ini|properties)$/.test(p) ||
      /(^|\/)(config|conf)\//.test(p) ||
      /(^|\/)(jest\.config|webpack\.config|tailwind\.config|commitlint\.config)\./.test(p) ||
      /(^|\/)(jenkinsfile|dockerfile)$/.test(p)
    ) {
      return 'config';
    }
    if (/\bexpress\.Router\(\)/.test(source)) return 'route';
    return 'other';
  }

  private renderTree(paths: string[]): string {
    interface Node { children: Map<string, Node>; leaf: boolean }
    const root: Node = { children: new Map(), leaf: false };
    for (const p of paths.slice().sort()) {
      let cur = root;
      const parts = p.split('/');
      parts.forEach((part, i) => {
        if (!cur.children.has(part)) cur.children.set(part, { children: new Map(), leaf: i === parts.length - 1 });
        cur = cur.children.get(part)!;
      });
    }
    const lines: string[] = [];
    const render = (node: Node, prefix: string, depth: number) => {
      if (depth > 4) return;
      const entries = [...node.children.entries()].sort((a, b) => {
        const aDir = a[1].children.size > 0 ? 0 : 1;
        const bDir = b[1].children.size > 0 ? 0 : 1;
        return aDir - bDir || a[0].localeCompare(b[0]);
      });
      entries.forEach(([name, child], i) => {
        const last = i === entries.length - 1;
        lines.push(`${prefix}${last ? '└── ' : '├── '}${name}${child.children.size ? '/' : ''}`);
        render(child, `${prefix}${last ? '    ' : '│   '}`, depth + 1);
      });
    };
    render(root, '', 0);
    return lines.join('\n');
  }

  /** Detect import cycles with an iterative DFS (no recursion depth risk on big repos). */
  private findCycles(nodes: Map<string, CodebaseNode>): string[][] {
    const cycles: string[][] = [];
    const state = new Map<string, 0 | 1 | 2>(); // 0 unvisited, 1 on stack, 2 done
    const seen = new Set<string>();

    for (const start of nodes.keys()) {
      if (state.get(start)) continue;
      const stack: { node: string; path: string[]; idx: number }[] = [{ node: start, path: [start], idx: 0 }];
      state.set(start, 1);

      while (stack.length) {
        const frame = stack[stack.length - 1];
        const deps = nodes.get(frame.node)?.imports ?? [];
        if (frame.idx >= deps.length) {
          state.set(frame.node, 2);
          stack.pop();
          continue;
        }
        const dep = deps[frame.idx++];
        const depState = state.get(dep) ?? 0;
        if (depState === 1) {
          const at = frame.path.indexOf(dep);
          if (at >= 0) {
            const cycle = frame.path.slice(at);
            const key = [...cycle].sort().join('|');
            if (!seen.has(key)) {
              seen.add(key);
              cycles.push(cycle);
            }
          }
        } else if (depState === 0 && nodes.has(dep)) {
          state.set(dep, 1);
          stack.push({ node: dep, path: [...frame.path, dep], idx: 0 });
        }
      }
    }
    return cycles.slice(0, 10);
  }

  /**
   * Answer "if I change X, what else must I touch?" by walking inbound edges
   * transitively. This is the query the proposal calls out as the whole point of
   * having a graph rather than a flat file list.
   */
  changeSurface(map: CodebaseMap, seedQuery: string, maxDepth = 3): {
    seeds: string[];
    impacted: { path: string; depth: number; layer: string; reason: string }[];
  } {
    const q = seedQuery.toLowerCase();
    const byPath = new Map(map.nodes.map((n) => [n.path, n]));

    const seeds = map.nodes
      .filter(
        (n) =>
          n.path.toLowerCase().includes(q) ||
          n.symbols.some((s) => s.toLowerCase().includes(q)) ||
          n.exports.some((s) => s.toLowerCase().includes(q))
      )
      .map((n) => n.path);

    const impacted: { path: string; depth: number; layer: string; reason: string }[] = [];
    const visited = new Set(seeds);
    let frontier = [...seeds];

    for (let depth = 1; depth <= maxDepth && frontier.length; depth++) {
      const next: string[] = [];
      for (const current of frontier) {
        for (const dependent of byPath.get(current)?.importedBy ?? []) {
          if (visited.has(dependent)) continue;
          visited.add(dependent);
          next.push(dependent);
          impacted.push({
            path: dependent,
            depth,
            layer: byPath.get(dependent)?.layer ?? 'other',
            reason: `imports ${current}`,
          });
        }
      }
      frontier = next;
    }

    return { seeds, impacted };
  }
}
