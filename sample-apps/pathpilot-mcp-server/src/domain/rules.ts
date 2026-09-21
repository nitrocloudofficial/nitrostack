import { EvidenceItem, ManifestData, FileNode, SelectedFileContent } from './models.js';

export interface DetectionRule {
  id: string;
  skill: string;
  description: string;
  weight: number;
  evaluate: (ctx: DetectionContext) => EvidenceItem[];
}

export interface DetectionContext {
  files: FileNode[];
  manifest?: ManifestData;
  readme?: string;
  selectedFiles: SelectedFileContent[];
  commitCount?: number;
}

function hasFile(ctx: DetectionContext, pattern: RegExp): FileNode | undefined {
  return ctx.files.find((f) => f.type === 'file' && pattern.test(f.path));
}

function hasAnyFile(ctx: DetectionContext, patterns: RegExp[]): FileNode | undefined {
  for (const p of patterns) {
    const found = hasFile(ctx, p);
    if (found) return found;
  }
  return undefined;
}

function countFiles(ctx: DetectionContext, pattern: RegExp): number {
  return ctx.files.filter((f) => f.type === 'file' && pattern.test(f.path)).length;
}

function fileContentContains(ctx: DetectionContext, pattern: RegExp, pathPattern?: RegExp): SelectedFileContent | undefined {
  return ctx.selectedFiles.find(
    (f) => (!pathPattern || pathPattern.test(f.path)) && pattern.test(f.content)
  );
}

function fileContentsMatching(ctx: DetectionContext, pattern: RegExp, pathPattern?: RegExp): SelectedFileContent[] {
  return ctx.selectedFiles.filter(
    (f) => (!pathPattern || pathPattern.test(f.path)) && pattern.test(f.content)
  );
}

function hasDependency(manifest: ManifestData | undefined, names: string[]): boolean {
  if (!manifest) return false;
  const all = { ...(manifest.dependencies || {}), ...(manifest.devDependencies || {}) };
  return names.some((n) => Object.keys(all).some((k) => k.toLowerCase().includes(n.toLowerCase())));
}

function excerpt(text: string, pattern: RegExp, maxLen = 120): string {
  const m = text.match(pattern);
  if (!m) return '';
  const idx = m.index || 0;
  const start = Math.max(0, idx - 20);
  const end = Math.min(text.length, start + maxLen);
  let s = text.slice(start, end).replace(/\s+/g, ' ').trim();
  if (start > 0) s = '...' + s;
  if (end < text.length) s = s + '...';
  return s;
}

export const TECHNOLOGY_DETECTION_RULES: DetectionRule[] = [
  {
    id: 'html-file-count',
    skill: 'HTML',
    description: 'Multiple .html files with semantic markup',
    weight: 40,
    evaluate: (ctx) => {
      const items: EvidenceItem[] = [];
      const htmlFiles = ctx.files.filter((f) => f.type === 'file' && /\.html?$/i.test(f.path));
      if (htmlFiles.length >= 2) {
        items.push({
          provider: 'github',
          kind: 'file-count',
          pathOrField: `**/*.html (${htmlFiles.length} files)`,
          ruleId: 'html-file-count',
          weight: 40,
        });
      } else if (htmlFiles.length === 1) {
        items.push({
          provider: 'github',
          kind: 'file-count',
          pathOrField: htmlFiles[0].path,
          excerpt: 'Single HTML file found',
          ruleId: 'html-file-count',
          weight: 15,
        });
      }
      return items;
    },
  },
  {
    id: 'html-semantic-elements',
    skill: 'HTML',
    description: 'Semantic HTML elements or JSX/TSX component structure',
    weight: 40,
    evaluate: (ctx) => {
      const items: EvidenceItem[] = [];
      const semanticPattern = /<(header|nav|main|footer|article|section|aside|figure|figcaption)\b/i;
      const match = fileContentContains(ctx, semanticPattern, /\.(html?|jsx|tsx)$/i);
      if (match) {
        items.push({
          provider: 'github',
          kind: 'content-pattern',
          pathOrField: match.path,
          excerpt: excerpt(match.content, semanticPattern),
          ruleId: 'html-semantic-elements',
          weight: 40,
        });
      }
      const jsxCount = countFiles(ctx, /\.(jsx|tsx)$/i);
      if (jsxCount >= 2) {
        items.push({
          provider: 'github',
          kind: 'file-count',
          pathOrField: `**/*.jsx/tsx (${jsxCount} components)`,
          ruleId: 'html-semantic-elements',
          weight: 35,
        });
      }
      return items;
    },
  },
  {
    id: 'html-template-rendering',
    skill: 'HTML',
    description: 'Rendering or returning HTML from code',
    weight: 20,
    evaluate: (ctx) => {
      const items: EvidenceItem[] = [];
      const renderPattern = /(return\s*<\w+|render\s*\(|res\.send\s*\(\s*["'`]<!DOCTYPE|<html)/i;
      const match = fileContentContains(ctx, renderPattern);
      if (match) {
        items.push({
          provider: 'github',
          kind: 'content-pattern',
          pathOrField: match.path,
          excerpt: excerpt(match.content, renderPattern),
          ruleId: 'html-template-rendering',
          weight: 20,
        });
      }
      return items;
    },
  },

  {
    id: 'css-file-count',
    skill: 'CSS',
    description: 'Multiple stylesheet files',
    weight: 35,
    evaluate: (ctx) => {
      const items: EvidenceItem[] = [];
      const patterns = [/\.css$/i, /\.scss$/i, /\.sass$/i, /\.less$/i];
      let count = 0;
      for (const p of patterns) count += countFiles(ctx, p);
      if (count >= 2) {
        items.push({
          provider: 'github',
          kind: 'file-count',
          pathOrField: `**/*.{css,scss,sass,less} (${count} files)`,
          ruleId: 'css-file-count',
          weight: 35,
        });
      } else if (count === 1) {
        const f = hasAnyFile(ctx, patterns);
        if (f) {
          items.push({
            provider: 'github',
            kind: 'file-count',
            pathOrField: f.path,
            excerpt: 'Single stylesheet found',
            ruleId: 'css-file-count',
            weight: 15,
          });
        }
      }
      return items;
    },
  },
  {
    id: 'css-layout-rules',
    skill: 'CSS',
    description: 'Flexbox, Grid, or responsive media queries',
    weight: 40,
    evaluate: (ctx) => {
      const items: EvidenceItem[] = [];
      const layoutPattern = /(display\s*:\s*(flex|grid)|@media\s|grid-template|justify-content|align-items|flex-wrap)/i;
      const matches = fileContentsMatching(ctx, layoutPattern, /\.(css|scss|sass|less)$/i);
      if (matches.length > 0) {
        const combined = matches.slice(0, 3).map((m) => m.path).join(', ');
        items.push({
          provider: 'github',
          kind: 'content-pattern',
          pathOrField: combined,
          excerpt: excerpt(matches[0].content, layoutPattern),
          ruleId: 'css-layout-rules',
          weight: 40,
        });
      }
      return items;
    },
  },
  {
    id: 'css-component-styling',
    skill: 'CSS',
    description: 'CSS-in-JS or styled-components / Tailwind usage',
    weight: 25,
    evaluate: (ctx) => {
      const items: EvidenceItem[] = [];
      if (hasDependency(ctx.manifest, ['tailwindcss', 'styled-components', '@emotion', 'styled-system', '@mui/material'])) {
        const dep = ['tailwindcss', 'styled-components', '@emotion', 'styled-system', '@mui/material'].find((d) =>
          hasDependency(ctx.manifest, [d])
        );
        items.push({
          provider: 'github',
          kind: 'dependency',
          pathOrField: 'package.json dependencies',
          excerpt: dep,
          ruleId: 'css-component-styling',
          weight: 25,
        });
      }
      const moduleCss = countFiles(ctx, /\.module\.(css|scss)$/i);
      if (moduleCss >= 1) {
        items.push({
          provider: 'github',
          kind: 'file-count',
          pathOrField: `CSS modules (${moduleCss} files)`,
          ruleId: 'css-component-styling',
          weight: 20,
        });
      }
      return items;
    },
  },

  {
    id: 'js-source-files',
    skill: 'JavaScript',
    description: 'Multiple JS/JSX source files with logic',
    weight: 40,
    evaluate: (ctx) => {
      const items: EvidenceItem[] = [];
      const count = countFiles(ctx, /\.jsx?$/i) - countFiles(ctx, /\.config\.js$/i);
      if (count >= 3) {
        items.push({
          provider: 'github',
          kind: 'file-count',
          pathOrField: `**/*.{js,jsx} (${count} source files)`,
          ruleId: 'js-source-files',
          weight: 40,
        });
      } else if (count >= 1) {
        items.push({
          provider: 'github',
          kind: 'file-count',
          pathOrField: `${count} JS file(s) found`,
          excerpt: 'Limited JS source presence',
          ruleId: 'js-source-files',
          weight: 20,
        });
      }
      return items;
    },
  },
  {
    id: 'js-language-features',
    skill: 'JavaScript',
    description: 'Functions, array methods, async, modules, classes',
    weight: 40,
    evaluate: (ctx) => {
      const items: EvidenceItem[] = [];
      const featuresPattern =/(async\s+function|await\s|=>|export\s+(default\s+)?(function|const|let|class)|import\s+|\.map\(|\.filter\(|\.reduce\(|class\s+\w+|fetch\(|addEventListener\(|querySelector\(|querySelectorAll\()/i;
      const matches = fileContentsMatching(ctx, featuresPattern, /\.(js|jsx)$/i);
      if (matches.length >= 2) {
        items.push({
          provider: 'github',
          kind: 'content-pattern',
          pathOrField: `${matches.length} JS files with modern features`,
          excerpt: excerpt(matches[0].content, featuresPattern),
          ruleId: 'js-language-features',
          weight: 40,
        });
      } else if (matches.length === 1) {
        items.push({
          provider: 'github',
          kind: 'content-pattern',
          pathOrField: matches[0].path,
          excerpt: excerpt(matches[0].content, featuresPattern),
          ruleId: 'js-language-features',
          weight: 20,
        });
      }
      return items;
    },
  },
  {
    id: 'js-dom-events',
    skill: 'JavaScript',
    description: 'DOM manipulation, event listeners, or handlers',
    weight: 20,
    evaluate: (ctx) => {
      const items: EvidenceItem[] = [];
      const domPattern = /(addEventListener|document\.getElement|querySelector|onClick\s*=|onSubmit\s*=|onChange\s*=|event\.preventDefault)/i;
      const match = fileContentContains(ctx, domPattern, /\.(js|jsx|tsx)$/i);
      if (match) {
        items.push({
          provider: 'github',
          kind: 'content-pattern',
          pathOrField: match.path,
          excerpt: excerpt(match.content, domPattern),
          ruleId: 'js-dom-events',
          weight: 20,
        });
      }
      return items;
    },
  },

  {
    id: 'ts-config',
    skill: 'TypeScript',
    description: 'tsconfig.json present',
    weight: 40,
    evaluate: (ctx) => {
      const items: EvidenceItem[] = [];
      if (hasFile(ctx, /^tsconfig\.json$/i) || hasFile(ctx, /\/tsconfig\.json$/i)) {
        items.push({
          provider: 'github',
          kind: 'file',
          pathOrField: 'tsconfig.json',
          ruleId: 'ts-config',
          weight: 40,
        });
      }
      return items;
    },
  },
  {
    id: 'ts-source-files',
    skill: 'TypeScript',
    description: 'Multiple TS/TSX source files',
    weight: 40,
    evaluate: (ctx) => {
      const items: EvidenceItem[] = [];
      const count = countFiles(ctx, /\.tsx?$/i) - countFiles(ctx, /\.config\.ts$/i);
      if (count >= 2) {
        items.push({
          provider: 'github',
          kind: 'file-count',
          pathOrField: `**/*.{ts,tsx} (${count} files)`,
          ruleId: 'ts-source-files',
          weight: 40,
        });
      } else if (count === 1) {
        items.push({
          provider: 'github',
          kind: 'file-count',
          pathOrField: '1 TS file found',
          excerpt: 'Limited TypeScript presence',
          ruleId: 'ts-source-files',
          weight: 20,
        });
      }
      return items;
    },
  },
  {
    id: 'ts-typing',
    skill: 'TypeScript',
    description: 'Interfaces, type annotations, generics in source',
    weight: 30,
    evaluate: (ctx) => {
      const items: EvidenceItem[] = [];
      const typePattern = /(interface\s+\w+|type\s+\w+\s*=|:\s*(string|number|boolean|Array|Promise)<|:\s*\w+\[\])/;
      const matches = fileContentsMatching(ctx, typePattern, /\.tsx?$/i);
      if (matches.length >= 1) {
        items.push({
          provider: 'github',
          kind: 'content-pattern',
          pathOrField: `${matches.length} TS file(s) with type annotations`,
          excerpt: excerpt(matches[0].content, typePattern),
          ruleId: 'ts-typing',
          weight: 30,
        });
      }
      return items;
    },
  },

  {
    id: 'react-dependency',
    skill: 'React',
    description: 'react dependency in package.json',
    weight: 35,
    evaluate: (ctx) => {
      const items: EvidenceItem[] = [];
      if (hasDependency(ctx.manifest, ['react'])) {
        const all = { ...(ctx.manifest?.dependencies || {}), ...(ctx.manifest?.devDependencies || {}) };
        const reactVersion = Object.keys(all).find((k) => k === 'react');
        items.push({
          provider: 'github',
          kind: 'dependency',
          pathOrField: 'package.json → dependencies.react',
          excerpt: reactVersion ? `react@${all[reactVersion]}` : 'react dependency present',
          ruleId: 'react-dependency',
          weight: 35,
        });
      }
      return items;
    },
  },
  {
    id: 'react-components',
    skill: 'React',
    description: 'JSX/TSX components and hooks usage',
    weight: 45,
    evaluate: (ctx) => {
      const items: EvidenceItem[] = [];
      const componentPattern = /(useState\(|useEffect\(|useCallback\(|useMemo\(|useContext\(|function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?return\s*<|const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{[\s\S]*?return\s*<)/;
      const matches = fileContentsMatching(ctx, componentPattern, /\.(jsx|tsx)$/i);
      if (matches.length >= 2) {
        items.push({
          provider: 'github',
          kind: 'content-pattern',
          pathOrField: `${matches.length} React component files with hooks`,
          excerpt: excerpt(matches[0].content, /(useState|useEffect|useCallback|useMemo|useContext)\(/),
          ruleId: 'react-components',
          weight: 45,
        });
      } else if (matches.length === 1) {
        items.push({
          provider: 'github',
          kind: 'content-pattern',
          pathOrField: matches[0].path,
          excerpt: excerpt(matches[0].content, componentPattern),
          ruleId: 'react-components',
          weight: 30,
        });
      }
      const jsxCount = countFiles(ctx, /\.(jsx|tsx)$/i);
      if (jsxCount >= 3) {
        items.push({
          provider: 'github',
          kind: 'file-count',
          pathOrField: `${jsxCount} component files`,
          ruleId: 'react-components',
          weight: 30,
        });
      }
      return items;
    },
  },
  {
    id: 'react-build-scripts',
    skill: 'React',
    description: 'React build/dev scripts (react-scripts, vite react plugin, next)',
    weight: 20,
    evaluate: (ctx) => {
      const items: EvidenceItem[] = [];
      if (
        hasDependency(ctx.manifest, ['react-scripts', 'next', '@vitejs/plugin-react']) ||
        hasFile(ctx, /next\.config/i)
      ) {
        items.push({
          provider: 'github',
          kind: 'dependency-or-config',
          pathOrField: 'package.json or next.config',
          excerpt: 'React build toolchain configured',
          ruleId: 'react-build-scripts',
          weight: 20,
        });
      }
      return items;
    },
  },

  {
    id: 'node-package-scripts',
    skill: 'Node.js',
    description: 'package.json with Node dev/start/build scripts',
    weight: 40,
    evaluate: (ctx) => {
      const items: EvidenceItem[] = [];
      const scripts = ctx.manifest?.scripts || {};
      const nodeScriptKeys = Object.keys(scripts).filter(
        (k) => /^(start|dev|build|test|serve)$/i.test(k) && /(node|npm|vite|tsx|ts-node|nodemon|webpack|next|react-scripts)/i.test(scripts[k])
      );
      if (nodeScriptKeys.length >= 2) {
        items.push({
          provider: 'github',
          kind: 'manifest-scripts',
          pathOrField: 'package.json scripts',
          excerpt: nodeScriptKeys.map((k) => `${k}: ${scripts[k]}`).join('; '),
          ruleId: 'node-package-scripts',
          weight: 40,
        });
      } else if (ctx.manifest) {
        items.push({
          provider: 'github',
          kind: 'manifest',
          pathOrField: 'package.json',
          excerpt: 'package.json present; limited scripts',
          ruleId: 'node-package-scripts',
          weight: 15,
        });
      }
      return items;
    },
  },
  {
    id: 'node-server-entry',
    skill: 'Node.js',
    description: 'Node server entry point or module files',
    weight: 40,
    evaluate: (ctx) => {
      const items: EvidenceItem[] = [];
      const serverFiles = ctx.files.filter(
        (f) =>
          f.type === 'file' &&
          /\.(js|ts)$/i.test(f.path) &&
          /(server|index|app|main)\.(js|ts)$/i.test(f.path.split(/[\\/]/).pop() || '')
      );
      const serverMatches = fileContentsMatching(
        ctx,
        /(process\.env|require\(['"]\w+['"]\)|import\s+.*from\s+['"]\w+|fs\.|path\.|app\.listen\()/,
        /(server|index|app|main)\.(js|ts)$/i
      );
      if (serverMatches.length >= 1) {
        items.push({
          provider: 'github',
          kind: 'content-pattern',
          pathOrField: serverMatches.map((m) => m.path).join(', '),
          excerpt: excerpt(serverMatches[0].content, /(process\.env|require\(|import\s|fs\.|path\.|app\.listen\()/),
          ruleId: 'node-server-entry',
          weight: 40,
        });
      } else if (serverFiles.length >= 1) {
        items.push({
          provider: 'github',
          kind: 'file-count',
          pathOrField: serverFiles.map((f) => f.path).join(', '),
          excerpt: 'Server entry files present',
          ruleId: 'node-server-entry',
          weight: 20,
        });
      }
      return items;
    },
  },
  {
    id: 'node-modules-dir',
    skill: 'Node.js',
    description: 'Node.js project structure indicators',
    weight: 15,
    evaluate: (ctx) => {
      const items: EvidenceItem[] = [];
      if (hasFile(ctx, /^package-lock\.json$/i) || hasFile(ctx, /\/package-lock\.json$/i) || hasFile(ctx, /^yarn\.lock$/i) || hasFile(ctx, /^pnpm-lock\.yaml$/i)) {
        items.push({
          provider: 'github',
          kind: 'file',
          pathOrField: 'lockfile present',
          ruleId: 'node-modules-dir',
          weight: 15,
        });
      }
      return items;
    },
  },

  {
    id: 'express-dependency',
    skill: 'Express',
    description: 'express dependency in package.json',
    weight: 40,
    evaluate: (ctx) => {
      const items: EvidenceItem[] = [];
      if (hasDependency(ctx.manifest, ['express'])) {
        items.push({
          provider: 'github',
          kind: 'dependency',
          pathOrField: 'package.json → dependencies.express',
          ruleId: 'express-dependency',
          weight: 40,
        });
      }
      return items;
    },
  },
  {
    id: 'express-server-code',
    skill: 'Express',
    description: 'Express app creation, routes, middleware usage',
    weight: 50,
    evaluate: (ctx) => {
      const items: EvidenceItem[] = [];
      const expressPattern = /(require\(['"]express['"]\)|from\s+['"]express['"]|app\s*=\s*express\(|app\.use\(|app\.(get|post|put|delete|patch)\(|router\.(get|post|put|delete|patch)\()/;
      const matches = fileContentsMatching(ctx, expressPattern, /\.(js|ts)$/i);
      if (matches.length >= 1) {
        const match = matches[0];
        const routeCount = (match.content.match(/app\.(get|post|put|delete|patch)\(/g) || []).length +
          (match.content.match(/router\.(get|post|put|delete|patch)\(/g) || []).length;
        items.push({
          provider: 'github',
          kind: 'content-pattern',
          pathOrField: match.path,
          excerpt: `${routeCount} route handler(s) found. ` + excerpt(match.content, expressPattern),
          ruleId: 'express-server-code',
          weight: routeCount >= 2 ? 50 : 35,
        });
      }
      return items;
    },
  },

  {
    id: 'rest-client-fetch',
    skill: 'REST API Integration',
    description: 'Client-side fetch / axios / API calls with handling',
    weight: 45,
    evaluate: (ctx) => {
      const items: EvidenceItem[] = [];
      const fetchPattern = /(fetch\s*\(|axios\.(get|post|put|delete|patch|request)\s*\(|axios\s*\(\s*\{)/;
      const matches = fileContentsMatching(ctx, fetchPattern, /\.(js|jsx|ts|tsx)$/i);
      if (matches.length >= 1) {
        const handlingPattern = /(\.then\(|\.catch\(|try\s*\{|await\s+(fetch|axios)|\.status|loading|error)/i;
        const hasHandling = matches.some((m) => handlingPattern.test(m.content));
        items.push({
          provider: 'github',
          kind: 'content-pattern',
          pathOrField: matches.map((m) => m.path).join(', '),
          excerpt: excerpt(matches[0].content, fetchPattern) + (hasHandling ? ' (with error/loading handling)' : ' (limited handling)'),
          ruleId: 'rest-client-fetch',
          weight: hasHandling ? 45 : 30,
        });
      }
      return items;
    },
  },
  {
    id: 'rest-server-endpoints',
    skill: 'REST API Integration',
    description: 'Server-side REST route handlers returning JSON',
    weight: 45,
    evaluate: (ctx) => {
      const items: EvidenceItem[] = [];
      const jsonPattern = /(res\.json\(|res\.status\(\d+\)\.json\(|response\.json\(|app\.(get|post|put|delete|patch)\([^)]*req[^)]*res[^)]*=>)/;
      const matches = fileContentsMatching(ctx, jsonPattern, /\.(js|ts)$/i);
      if (matches.length >= 1) {
        items.push({
          provider: 'github',
          kind: 'content-pattern',
          pathOrField: matches.map((m) => m.path).join(', '),
          excerpt: excerpt(matches[0].content, jsonPattern),
          ruleId: 'rest-server-endpoints',
          weight: 45,
        });
      }
      return items;
    },
  },
  {
    id: 'rest-dependency',
    skill: 'REST API Integration',
    description: 'axios/fetch dependency or CORS middleware for API',
    weight: 15,
    evaluate: (ctx) => {
      const items: EvidenceItem[] = [];
      if (hasDependency(ctx.manifest, ['axios', 'cors'])) {
        items.push({
          provider: 'github',
          kind: 'dependency',
          pathOrField: 'package.json → axios or cors',
          ruleId: 'rest-dependency',
          weight: 15,
        });
      }
      return items;
    },
  },

  {
    id: 'db-dependency',
    skill: 'Database',
    description: 'Database driver or ORM dependency',
    weight: 40,
    evaluate: (ctx) => {
      const items: EvidenceItem[] = [];
      const deps = ['mongoose', 'mongodb', 'pg', 'prisma', 'sequelize', 'mysql2', 'mysql', 'sqlite3', 'better-sqlite3', '@prisma/client', 'typeorm', 'drizzle-orm', 'redis', 'ioredis'];
      const found = deps.filter((d) => hasDependency(ctx.manifest, [d]));
      if (found.length >= 1) {
        items.push({
          provider: 'github',
          kind: 'dependency',
          pathOrField: 'package.json → ' + found.join(', '),
          ruleId: 'db-dependency',
          weight: 40,
        });
      }
      return items;
    },
  },
  {
    id: 'db-model-schema',
    skill: 'Database',
    description: 'Model/schema definitions or query code',
    weight: 50,
    evaluate: (ctx) => {
      const items: EvidenceItem[] = [];
      const schemaPattern = /(mongoose\.model\(|new\s+Schema\(|model\s*\(|createTable\(|SELECT\s+.+\s+FROM\s|INSERT\s+INTO\s|prisma\.\w+\.(find|create|update|delete)|PrismaClient|\.save\(|\.find\(|\.findOne\(|sequelize\.define\()/i;
      const matches = fileContentsMatching(ctx, schemaPattern, /\.(js|ts|jsx|tsx|prisma|sql)$/i);
      if (matches.length >= 1) {
        items.push({
          provider: 'github',
          kind: 'content-pattern',
          pathOrField: matches.map((m) => m.path).join(', '),
          excerpt: excerpt(matches[0].content, schemaPattern),
          ruleId: 'db-model-schema',
          weight: 50,
        });
      }
      const prismaSchema = hasFile(ctx, /schema\.prisma$/i);
      if (prismaSchema) {
        items.push({
          provider: 'github',
          kind: 'file',
          pathOrField: prismaSchema.path,
          ruleId: 'db-model-schema',
          weight: 45,
        });
      }
      const sqlFiles = countFiles(ctx, /\.sql$/i);
      if (sqlFiles >= 1) {
        items.push({
          provider: 'github',
          kind: 'file-count',
          pathOrField: `${sqlFiles} SQL schema file(s)`,
          ruleId: 'db-model-schema',
          weight: 30,
        });
      }
      return items;
    },
  },

  {
    id: 'git-commit-history',
    skill: 'Git',
    description: 'Multiple commits in repository history',
    weight: 60,
    evaluate: (ctx) => {
      const items: EvidenceItem[] = [];
      if (ctx.commitCount !== undefined) {
        if (ctx.commitCount >= 5) {
          items.push({
            provider: 'github',
            kind: 'commit-history',
            pathOrField: `repository commits`,
            excerpt: `${ctx.commitCount} commits found`,
            ruleId: 'git-commit-history',
            weight: 60,
          });
        } else if (ctx.commitCount >= 2) {
          items.push({
            provider: 'github',
            kind: 'commit-history',
            pathOrField: `repository commits`,
            excerpt: `${ctx.commitCount} commits found`,
            ruleId: 'git-commit-history',
            weight: 35,
          });
        } else {
          items.push({
            provider: 'github',
            kind: 'commit-history',
            pathOrField: `repository commits`,
            excerpt: `${ctx.commitCount} commit found`,
            ruleId: 'git-commit-history',
            weight: 15,
          });
        }
      }
      return items;
    },
  },
  {
    id: 'git-dot-git-hint',
    skill: 'Git',
    description: '.gitignore or other git hints in repo',
    weight: 20,
    evaluate: (ctx) => {
      const items: EvidenceItem[] = [];
      if (hasFile(ctx, /^\.gitignore$/i) || hasFile(ctx, /\/\.gitignore$/i)) {
        items.push({
          provider: 'github',
          kind: 'file',
          pathOrField: '.gitignore present',
          ruleId: 'git-dot-git-hint',
          weight: 20,
        });
      }
      return items;
    },
  },

  {
    id: 'deploy-config',
    skill: 'Deployment',
    description: 'Deployment configuration file',
    weight: 55,
    evaluate: (ctx) => {
      const items: EvidenceItem[] = [];
      const deployFiles = [
        /^vercel\.json$/i, /\/vercel\.json$/i,
        /^netlify\.toml$/i, /\/netlify\.toml$/i,
        /^Dockerfile$/i, /\/Dockerfile$/i,
        /^docker-compose\.ya?ml$/i, /\/docker-compose\.ya?ml$/i,
        /\.github\/workflows\/.+\.ya?ml$/i,
        /^fly\.toml$/i, /\/fly\.toml$/i,
        /^render\.yaml$/i, /\/render\.yaml$/i,
      ];
      for (const p of deployFiles) {
        const f = hasFile(ctx, p);
        if (f) {
          items.push({
            provider: 'github',
            kind: 'file',
            pathOrField: f.path,
            ruleId: 'deploy-config',
            weight: 55,
          });
          break;
        }
      }
      return items;
    },
  },
  {
    id: 'deploy-readme-url',
    skill: 'Deployment',
    description: 'Deployed URL mentioned in README',
    weight: 25,
    evaluate: (ctx) => {
      const items: EvidenceItem[] = [];
      if (ctx.readme) {
        const urlPattern = /(https?:\/\/[^\s)\]"']+?(vercel\.app|netlify\.app|onrender\.com|fly\.dev|pages\.dev|herokuapp\.com|aws\.com|azurewebsites\.net))/i;
        const m = ctx.readme.match(urlPattern);
        if (m) {
          items.push({
            provider: 'github',
            kind: 'readme',
            pathOrField: 'README.md',
            excerpt: m[1],
            ruleId: 'deploy-readme-url',
            weight: 25,
          });
        }
      }
      return items;
    },
  },
  {
    id: 'deploy-scripts',
    skill: 'Deployment',
    description: 'Deploy script in package.json',
    weight: 20,
    evaluate: (ctx) => {
      const items: EvidenceItem[] = [];
      const scripts = ctx.manifest?.scripts || {};
      const hasDeploy = Object.keys(scripts).some(
        (k) => /deploy/i.test(k) || /vercel|netlify|flyctl|render/i.test(scripts[k])
      );
      if (hasDeploy) {
        items.push({
          provider: 'github',
          kind: 'manifest-scripts',
          pathOrField: 'package.json → deploy script',
          ruleId: 'deploy-scripts',
          weight: 20,
        });
      }
      return items;
    },
  },
];

export function runDetection(
  ctx: DetectionContext,
  skillsOfInterest: string[]
): Record<string, EvidenceItem[]> {
  const result: Record<string, EvidenceItem[]> = {};
  for (const skill of skillsOfInterest) result[skill] = [];

  for (const rule of TECHNOLOGY_DETECTION_RULES) {
    if (!skillsOfInterest.includes(rule.skill)) continue;
    try {
      const items = rule.evaluate(ctx);
      for (const item of items) {
        if (result[rule.skill]) {
          result[rule.skill].push(item);
        }
      }
    } catch {
      continue;
    }
  }
  return result;
}
