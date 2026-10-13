/**
 * PathPilot INLINE analysis service for the Next.js widget.
 *
 * Self-contained bundle so the dashboard works even when the
 * inner MCP server / REST 3002 is not booted. Two modes:
 *  1. LINKEDIN-ONLY DEMO (default, 0 network, instant)
 *  2. REAL GITHUB REPO (uses direct public GitHub REST API from server)
 */

export type SkillName =
  | 'HTML'
  | 'CSS'
  | 'JavaScript'
  | 'TypeScript'
  | 'React'
  | 'Node.js'
  | 'Express'
  | 'REST API Integration'
  | 'Database'
  | 'Git'
  | 'Deployment';

export const SKILL_ORDER: SkillName[] = [
  'HTML', 'CSS', 'JavaScript', 'TypeScript', 'React',
  'Node.js', 'Express', 'REST API Integration',
  'Database', 'Git', 'Deployment',
];

export type EvidenceStatus = 'Verified' | 'Partial' | 'Self-reported' | 'Missing';

export interface EvidenceSource { provider: 'github' | 'linkedin'; field?: string; }
export interface EvidenceItem { ruleId: string; provider: 'github' | 'linkedin'; pathOrField: string; excerpt?: string; confidence: number; kind: 'file-count' | 'manifest-dependency' | 'content-pattern' | 'commit' | 'declared-skill'; }
export interface SkillEvidenceDef {
  skill: SkillName; status: EvidenceStatus; confidence: number;
  summary: string; sources: EvidenceSource[]; evidence: EvidenceItem[];
  inspected: string[]; nextEvidence: string;
}

export type RoadmapSignal = {
  verified: SkillName[]; selfReported: SkillName[]; partial: SkillName[]; missing: SkillName[];
  priorityGap: SkillName | ''; suggestedTask?: string; rationale?: string;
};

export type AnalyzeEnvelope<T> = {
  requestId: string; status: 'success' | 'partial' | 'error';
  data?: T; warnings: string[];
  error?: { code: string; message: string; retryable: boolean; details?: unknown };
};

export interface DashboardSummary {
  id: string; analysisId: string;
  counts: { verified: number; partial: number; selfReported: number; missing: number };
  topStrengths: string[];
  priorityGap?: SkillName | '';
  priorityGaps: string[];
  headline: string;
  createdAt: string;
}

export interface SkillRow {
  name: SkillName;
  status: EvidenceStatus;
  confidence: number;
  sources: EvidenceSource[];
  summary: string;
  evidence: EvidenceItem[];
  inspected?: string[];
  nextEvidence?: string;
}

export interface EvidenceCard {
  skill: SkillName;
  status: EvidenceStatus;
  headline: string;
  body: string;
  sources: EvidenceSource[];
  recommendedAction?: string;
}

export interface RoadmapGroup {
  title: string;
  items: Array<{ title: string; skill: SkillName; rationale: string; priority: 'high' | 'normal' | 'medium' | 'low' }>;
}

export interface SummaryBlock {
  headline: string;
  topStrengths: string[];
  priorityGaps: string[];
  counts: { verified: number; partial: number; selfReported: number; missing: number };
  nSkills: number;
  profileLabel: string;
  repoLabel: string;
  repoEvidenceCount: number;
  liSkillCount: number;
}

export interface AnalyzeResponse {
  analysisId: string;
  dashboardId: string;
  requestId?: string;
  createdAt?: string;
  profile?: { connected: boolean; source: 'linkedin'; profileRef: string };
  repository?: { fullName: string; branch: string; commits?: number; readme?: string; fileCount?: number };
  skills: SkillRow[];
  skillOrder: SkillName[];
  evidenceCards: EvidenceCard[];
  summary: SummaryBlock;
  roadmap: { groups: RoadmapGroup[]; signal: RoadmapSignal };
  warnings: string[];
}

// ==========================
// Demo LinkedIn Profile Data
// ==========================
const DEMO_LINKEDIN_PROFILE = {
  profileId: 'linkedin:demo:learner',
  skills: ['HTML', 'CSS', 'JavaScript', 'TypeScript', 'React', 'Express', 'SQL', 'Git', 'MongoDB'],
  positions: [{ title: 'Full Stack Developer Intern', company: 'Acme', startDate: '2024-01' }],
  education: [{ school: 'State University', degree: 'B.Tech', field: 'Computer Science' }],
  projects: [{ title: 'Portfolio Site', description: 'Built personal portfolio with React + Vite' }],
};

const SKILL_NORMALIZATION: Record<string, SkillName> = {
  html: 'HTML', html5: 'HTML',
  css: 'CSS', css3: 'CSS', scss: 'CSS', sass: 'CSS', tailwind: 'CSS',
  javascript: 'JavaScript', js: 'JavaScript', ecmascript: 'JavaScript',
  typescript: 'TypeScript', ts: 'TypeScript',
  react: 'React', reactjs: 'React', 'react.js': 'React', next: 'React', 'next.js': 'React',
  node: 'Node.js', 'node.js': 'Node.js', nodejs: 'Node.js',
  express: 'Express', 'express.js': 'Express', expressjs: 'Express',
  rest: 'REST API Integration', api: 'REST API Integration', 'rest api': 'REST API Integration', http: 'REST API Integration',
  sql: 'Database', mysql: 'Database', postgres: 'Database', postgresql: 'Database', mongodb: 'Database', mongoose: 'Database', database: 'Database', prisma: 'Database',
  git: 'Git', github: 'Git', 'version control': 'Git',
  docker: 'Deployment', kubernetes: 'Deployment', ci: 'Deployment', cicd: 'Deployment', aws: 'Deployment', vercel: 'Deployment', netlify: 'Deployment', 'cloud deploy': 'Deployment', deployment: 'Deployment',
};

const SKILL_THRESHOLD: Record<SkillName, { verified: number; partial: number; verifiedCount?: number; partialCount?: number }> = {
  HTML:                  { verified: 1,   partial: 1, verifiedCount: 2, partialCount: 1 },
  CSS:                   { verified: 1,   partial: 1, verifiedCount: 2, partialCount: 1 },
  JavaScript:            { verified: 2,   partial: 1, verifiedCount: 3, partialCount: 1 },
  TypeScript:            { verified: 1,   partial: 1, verifiedCount: 2, partialCount: 1 },
  React:                 { verified: 1,   partial: 1, verifiedCount: 2, partialCount: 1 },
  'Node.js':             { verified: 1,   partial: 1, verifiedCount: 2, partialCount: 1 },
  Express:               { verified: 1,   partial: 1, verifiedCount: 1, partialCount: 1 },
  'REST API Integration':{ verified: 2,   partial: 1, verifiedCount: 2, partialCount: 1 },
  Database:              { verified: 1,   partial: 1, verifiedCount: 1, partialCount: 1 },
  Git:                   { verified: 2,   partial: 1, verifiedCount: 3, partialCount: 1 },
  Deployment:            { verified: 1,   partial: 1, verifiedCount: 1, partialCount: 1 },
};

const NEXT_EVIDENCE: Record<SkillName, string> = {
  HTML: 'Add 3 semantic HTML pages with forms, tables, images and meta tags.',
  CSS: 'Add responsive layouts, flexbox/grid, hover states and a CSS framework (Tailwind / SASS).',
  JavaScript: 'Write 3 modules with DOM manipulation, async/await, event handling, and validation helpers.',
  TypeScript: 'Add a types/ folder with 5+ interfaces, generic utilities, strict strictNullChecks usage.',
  React: 'Create 5+ components with useState/useEffect hooks, routing, and a custom hook.',
  'Node.js': 'Initialize a Node.js project with start/dev/build scripts and a small CLI or entry server.',
  Express: 'Add 3+ route handlers with middleware, body parsing, and a modular router.',
  'REST API Integration': 'Add 2+ client fetch calls, endpoint handlers, error handling, and status codes.',
  Database: 'Add schema.sql, Prisma schema, or MongoDB models with 2 CRUD queries.',
  Git: 'Add 15+ meaningful commits across 2+ branches with conventional messages.',
  Deployment: 'Add Dockerfile / CI workflow / Vercel config / deployment scripts.',
};

// ==========================
// Normalization helpers
// ==========================

export function normalizeLinkedInSkills(raw: string[]): SkillName[] {
  const out = new Set<SkillName>();
  for (const s of raw) {
    const key = s.trim().toLowerCase();
    const hit = SKILL_NORMALIZATION[key];
    if (hit) out.add(hit);
  }
  return Array.from(out);
}

function shortId(prefix = 'req'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`;
}

// ==========================
// Evidence fusion (linked-in demo / full or inline light version)
// ==========================

interface BuildOptions {
  includeLinkedIn?: boolean;
  useDemoLinkedIn?: boolean;
  repo?: string;
}

interface RepoSnapshot {
  manifestDeps: Record<string, string>;
  manifestDevDeps: Record<string, string>;
  filePaths: string[];
  readme: string;
  commits: number;
}

const EMPTY_SNAPSHOT: RepoSnapshot = { manifestDeps: {}, manifestDevDeps: {}, filePaths: [], readme: '', commits: 0 };

function scanRepoForSkillEvidence(snap: RepoSnapshot): Record<SkillName, EvidenceItem[]> {
  const out: Record<string, EvidenceItem[]> = {};
  for (const s of SKILL_ORDER) out[s] = [];
  const { manifestDeps, manifestDevDeps, filePaths, readme, commits } = snap;

  function add(skill: SkillName, it: EvidenceItem) { out[skill].push(it); }

  // File counts
  const html = filePaths.filter((p) => /\.html?$/i.test(p)).length;
  const cssFiles = filePaths.filter((p) => /\.(css|scss|less|sass)$/i.test(p)).length;
  const jsFiles = filePaths.filter((p) => /\.(js|jsx|mjs|cjs)$/i.test(p)).length;
  const tsFiles = filePaths.filter((p) => /\.(ts|tsx)$/i.test(p)).length;
  const reactFiles = filePaths.filter((p) => /\.(tsx|jsx)$/i.test(p) || /(^|\/)(components?|pages?|hooks?)\//i.test(p)).length;
  const nodeFiles = filePaths.filter((p) => /(^|\/)(server|index|main|app)\.(js|ts)$/i.test(p) || /package\.json$/i.test(p)).length;
  const expressFiles = filePaths.filter((p) => /(^|\/)(routes?|controllers?|api|routers?)\//i.test(p) || /express/i.test(readme)).length;
  const apiHits = filePaths.filter((p) => /api|routes?|controllers?|endpoint|fetch|axios/i.test(p)).length + (/(fetch\(|axios\.|app\.(get|post|put|delete))/i.test(readme) ? 1 : 0);
  const dbFiles = filePaths.filter((p) => /\.(sql)$/i.test(p) || /(schema|models?|db|prisma|migrations?)/i.test(p)).length + (/prisma|mongoose|sequelize|mysql|postgres|mongodb/i.test(readme) ? 1 : 0);
  const gitFiles = filePaths.filter((p) => /^.github\//.test(p) || /^.gitignore$/.test(p)).length;
  const deployFiles = filePaths.filter((p) => /(^|\/)(Dockerfile|docker-compose|vercel\.json|netlify\.toml|\.github\/workflows|\.gitlab-ci|Procfile)/i.test(p)).length;

  // Manifest deps
  const hasDep = (keys: string[]) => keys.some((k) => (k in manifestDeps) || (k in manifestDevDeps));
  function dep(keys: string[]) { return keys.filter((k) => (k in manifestDeps) || (k in manifestDevDeps)); }

  // HTML
  if (html >= 2) add('HTML', { ruleId: 'html-file-count', provider: 'github', pathOrField: `HTML files=${html}`, confidence: 3, kind: 'file-count' });
  if (/<html|<form|<table|<meta|<img|<nav|<footer|<header/i.test(readme)) add('HTML', { ruleId: 'html-readme', provider: 'github', pathOrField: 'README patterns', confidence: 2, kind: 'content-pattern' });

  // CSS
  if (cssFiles >= 2) add('CSS', { ruleId: 'css-file-count', provider: 'github', pathOrField: `CSS/SCSS files=${cssFiles}`, confidence: 3, kind: 'file-count' });
  if (hasDep(['tailwindcss', 'sass', 'less', 'postcss', '@emotion/react', 'styled-components'])) {
    const d = dep(['tailwindcss', 'sass', 'less', 'postcss', '@emotion/react', 'styled-components']);
    add('CSS', { ruleId: 'css-deps', provider: 'github', pathOrField: `package.json deps (${d.join(', ')})`, confidence: 3, kind: 'manifest-dependency' });
  }

  // JavaScript
  if (jsFiles >= 3) add('JavaScript', { ruleId: 'js-file-count', provider: 'github', pathOrField: `JS files=${jsFiles}`, confidence: 4, kind: 'file-count' });

  // TypeScript
  if (tsFiles >= 2) add('TypeScript', { ruleId: 'ts-file-count', provider: 'github', pathOrField: `TS files=${tsFiles}`, confidence: 3, kind: 'file-count' });
  if (hasDep(['typescript', 'ts-node', '@types/node'])) add('TypeScript', { ruleId: 'ts-deps', provider: 'github', pathOrField: 'package.json typescript devDep', confidence: 3, kind: 'manifest-dependency' });

  // React
  if (reactFiles >= 2) add('React', { ruleId: 'react-file-count', provider: 'github', pathOrField: `React (tsx/jsx) files=${reactFiles}`, confidence: 4, kind: 'file-count' });
  if (hasDep(['react', 'react-dom', 'next', 'react-router-dom'])) {
    const d = dep(['react', 'react-dom', 'next', 'react-router-dom']);
    add('React', { ruleId: 'react-deps', provider: 'github', pathOrField: `package.json (${d.join(', ')})`, confidence: 4, kind: 'manifest-dependency' });
  }

  // Node.js
  if (hasDep(['express', 'http', 'fs', 'path', 'dotenv'])) {
    const d = dep(['express', 'dotenv']);
    add('Node.js', { ruleId: 'node-deps', provider: 'github', pathOrField: `package.json (${d.join(', ') || 'core node deps'})`, confidence: 4, kind: 'manifest-dependency' });
  }
  if (nodeFiles >= 2) add('Node.js', { ruleId: 'node-files', provider: 'github', pathOrField: `Entry files=${nodeFiles}`, confidence: 3, kind: 'file-count' });

  // Express
  if (hasDep(['express'])) add('Express', { ruleId: 'express-deps', provider: 'github', pathOrField: 'package.json: express', confidence: 5, kind: 'manifest-dependency' });
  if (expressFiles >= 1) add('Express', { ruleId: 'express-files', provider: 'github', pathOrField: `Routes/controllers dirs (${expressFiles})`, confidence: 3, kind: 'file-count' });

  // REST API Integration
  if (apiHits >= 2) add('REST API Integration', { ruleId: 'api-patterns', provider: 'github', pathOrField: `API mentions=${apiHits}`, confidence: 4, kind: 'content-pattern' });
  if (hasDep(['axios', 'superagent', 'isomorphic-fetch', 'node-fetch', '@apollo/client'])) {
    const d = dep(['axios', 'superagent', 'isomorphic-fetch', 'node-fetch', '@apollo/client']);
    add('REST API Integration', { ruleId: 'api-deps', provider: 'github', pathOrField: `package.json (${d.join(', ')})`, confidence: 4, kind: 'manifest-dependency' });
  }
  if (hasDep(['express'])) add('REST API Integration', { ruleId: 'api-routes-via-express', provider: 'github', pathOrField: 'Express routes', confidence: 3, kind: 'manifest-dependency' });

  // Database
  if (dbFiles >= 1) add('Database', { ruleId: 'db-files', provider: 'github', pathOrField: `DB files/schema (${dbFiles})`, confidence: 4, kind: 'file-count' });
  if (hasDep(['prisma', '@prisma/client', 'mongoose', 'sequelize', 'mysql2', 'pg', 'postgres', 'mongodb', 'sqlite3', 'better-sqlite3'])) {
    const d = dep(['prisma', '@prisma/client', 'mongoose', 'sequelize', 'mysql2', 'pg', 'postgres', 'mongodb', 'sqlite3', 'better-sqlite3']);
    add('Database', { ruleId: 'db-deps', provider: 'github', pathOrField: `package.json (${d.join(', ')})`, confidence: 5, kind: 'manifest-dependency' });
  }

  // Git
  if (commits >= 3) add('Git', { ruleId: 'git-commits', provider: 'github', pathOrField: `Commits=${commits}`, confidence: 5, kind: 'commit' });
  if (gitFiles >= 1) add('Git', { ruleId: 'git-files', provider: 'github', pathOrField: `CI/config files (${gitFiles})`, confidence: 3, kind: 'file-count' });

  // Deployment
  if (deployFiles >= 1) add('Deployment', { ruleId: 'deploy-files', provider: 'github', pathOrField: `Deploy configs=${deployFiles}`, confidence: 4, kind: 'file-count' });
  if (hasDep(['docker', 'vercel', 'serverless', '@vercel/node'])) {
    const d = dep(['docker', 'vercel', 'serverless', '@vercel/node']);
    add('Deployment', { ruleId: 'deploy-deps', provider: 'github', pathOrField: `package.json (${d.join(', ')})`, confidence: 3, kind: 'manifest-dependency' });
  }

  return out as Record<SkillName, EvidenceItem[]>;
}

function inspectPathsForSkill(skill: SkillName): string[] {
  switch (skill) {
    case 'HTML': return ['package.json', 'index.html', 'public/', 'src/'];
    case 'CSS': return ['src/styles/', 'tailwind.config.*', '*.css'];
    case 'JavaScript': return ['src/**/*.js', 'package.json (scripts)'];
    case 'TypeScript': return ['tsconfig.json', 'src/**/*.ts'];
    case 'React': return ['src/components/', 'package.json (react/react-dom/next)'];
    case 'Node.js': return ['package.json (engines/entry)', 'server.js', 'index.ts'];
    case 'Express': return ['src/routes/', 'app.use(express)'];
    case 'REST API Integration': return ['fetch/axios calls', '/api/* routes'];
    case 'Database': return ['schema.prisma', '*.sql', 'src/models/'];
    case 'Git': return ['.gitignore', '.github/workflows/', 'recent commits'];
    case 'Deployment': return ['Dockerfile', 'vercel.json', 'CI yml', 'Procfile'];
  }
}

function buildSkillMatrix(
  repoEv: Record<SkillName, EvidenceItem[]>,
  liDeclared: SkillName[],
  commitCount = 0
): SkillEvidenceDef[] {
  const declared = new Set(liDeclared);
  const result: SkillEvidenceDef[] = [];
  for (const skill of SKILL_ORDER) {
    const items = repoEv[skill] || [];
    const threshold = SKILL_THRESHOLD[skill];
    const rulesHit = new Set(items.map((i) => i.ruleId)).size;
    const fileCountItems = items.filter((i) => i.kind === 'file-count').length + (commitCount >= 3 && skill === 'Git' ? 1 : 0);
    let status: EvidenceStatus = 'Missing';
    if (rulesHit >= threshold.verified && fileCountItems >= (threshold.verifiedCount || 1)) status = 'Verified';
    else if (rulesHit >= threshold.partial || fileCountItems >= (threshold.partialCount || 1)) status = 'Partial';

    const sources: EvidenceSource[] = [];
    if (items.length > 0) sources.push({ provider: 'github' });
    if (declared.has(skill)) sources.push({ provider: 'linkedin', field: 'skills' });

    const allEvidence: EvidenceItem[] = [...items];
    if (declared.has(skill)) {
      allEvidence.push({
        ruleId: 'linkedin-declared', provider: 'linkedin', pathOrField: 'skills',
        confidence: 2, kind: 'declared-skill',
      });
    }

    // If no github evidence, but declared on LI → Self-reported (careful wording per PRD safety rule)
    let finalStatus: EvidenceStatus = status;
    if (status === 'Missing' && declared.has(skill)) finalStatus = 'Self-reported';
    else if (status === 'Partial' && declared.has(skill) && !sources.some((s) => s.provider === 'github')) finalStatus = 'Self-reported';

    const finalConfidence = allEvidence.reduce((a, b) => a + (b.confidence || 0), 0);
    let summary = '';
    if (finalStatus === 'Verified') {
      summary = `${skill} detected from ${rulesHit} rule${rulesHit === 1 ? '' : 's'}${sources.find((s) => s.provider === 'linkedin') ? ' + matches LinkedIn declaration' : ''}.`;
    } else if (finalStatus === 'Partial') {
      summary = `${skill} shows some signals (${rulesHit} rule${rulesHit === 1 ? '' : 's'}). Add more files or deps to reach verified.`;
    } else if (finalStatus === 'Self-reported') {
      summary = `${skill} listed on LinkedIn profile, but NOT verified in the selected repository.`;
    } else {
      summary = `No qualifying signals for ${skill} found in the selected repository.`;
    }

    result.push({
      skill, status: finalStatus, confidence: finalConfidence, summary, sources,
      evidence: allEvidence, inspected: inspectPathsForSkill(skill),
      nextEvidence: NEXT_EVIDENCE[skill],
    });
  }
  return result;
}

function buildRoadmapSignal(skills: SkillEvidenceDef[]): RoadmapSignal {
  const verified: SkillName[] = [];
  const partial: SkillName[] = [];
  const selfReported: SkillName[] = [];
  const missing: SkillName[] = [];
  for (const s of skills) {
    if (s.status === 'Verified') verified.push(s.skill);
    else if (s.status === 'Partial') partial.push(s.skill);
    else if (s.status === 'Self-reported') selfReported.push(s.skill);
    else missing.push(s.skill);
  }
  // Priority gap: first Missing/Partial in pathway order that's also declared on LinkedIn (if any)
  let priorityGap: SkillName | '' = '';
  for (const name of SKILL_ORDER) {
    const def = skills.find((s) => s.skill === name)!;
    if (def.status === 'Missing' || def.status === 'Partial') {
      // prefer declared-on-LinkedIn missing first (gap matches user's claim)
      if (def.sources.find((s) => s.provider === 'linkedin')) {
        priorityGap = name;
        break;
      }
    }
  }
  if (!priorityGap) {
    for (const name of SKILL_ORDER) {
      const def = skills.find((s) => s.skill === name)!;
      if (def.status === 'Missing' || def.status === 'Partial') { priorityGap = name; break; }
    }
  }
  const rationale = priorityGap
    ? `Pathway order suggests closing ${priorityGap} next. ${skills.find((s) => s.skill === priorityGap)?.nextEvidence || ''}`
    : 'All skills in this pathway are either verified or self-reported with no immediate gap.';
  const suggestedTask = priorityGap ? NEXT_EVIDENCE[priorityGap] : undefined;
  return { verified, selfReported, partial, missing, priorityGap, suggestedTask, rationale };
}

// ==========================
// Public API: analyze()
// Next.js / App Router-safe global singletons (module-level Maps get re-instantiated
// across request handlers or dev-mode HMR recompiles, losing cached analyses.)
// ==========================
const _global: any = (typeof globalThis !== 'undefined') ? globalThis : (typeof window !== 'undefined' ? window : {});
const ANALYSIS_CACHE: Map<string, AnalyzeResponse> =
  _global.PATHPILOT_ANALYSIS_CACHE || new Map<string, AnalyzeResponse>();
_global.PATHPILOT_ANALYSIS_CACHE = ANALYSIS_CACHE;
const DASHBOARD_CACHE: Map<string, DashboardSummary> =
  _global.PATHPILOT_DASHBOARD_CACHE || new Map<string, DashboardSummary>();
_global.PATHPILOT_DASHBOARD_CACHE = DASHBOARD_CACHE;

export async function analyze(input: BuildOptions): Promise<AnalyzeResponse> {
  const requestId = shortId('req');
  const warnings: string[] = [];
  const useDemo = input.useDemoLinkedIn !== false;
  const liDeclared: SkillName[] = (input.includeLinkedIn && useDemo)
    ? normalizeLinkedInSkills(DEMO_LINKEDIN_PROFILE.skills)
    : [];

  let snap: RepoSnapshot = EMPTY_SNAPSHOT;
  let repoMeta: { fullName: string; branch: string } | undefined;

  if (input.repo && input.repo.trim()) {
    // Try real GitHub public API inline (server-side fetch from widget API route)
    const fetched = await tryFetchGitHubRepoSnapshot(input.repo.trim(), warnings);
    if (fetched.snapshot) { snap = fetched.snapshot; repoMeta = fetched.meta; }
  }

  const repoEvidence = scanRepoForSkillEvidence(snap);
  const matrix = buildSkillMatrix(repoEvidence, liDeclared, snap.commits || 0);
  const roadmapSignal = buildRoadmapSignal(matrix);
  const analysisId = shortId('analysis');
  const dashboardId = shortId('dashboard');
  const createdAt = new Date().toISOString();

  const skillRows = matrix.map((s) => ({
    name: s.skill,
    status: s.status,
    confidence: Math.max(0, Math.min(100, (typeof s.confidence === 'number' ? s.confidence : 0) * 10)),
    sources: s.sources,
    summary: s.summary,
    evidence: s.evidence,
    inspected: s.inspected,
    nextEvidence: s.nextEvidence,
  }));

  const counts = { verified: 0, partial: 0, selfReported: 0, missing: 0 };
  counts.verified = skillRows.filter(s => s.status === 'Verified').length;
  counts.partial = skillRows.filter(s => s.status === 'Partial').length;
  counts.selfReported = skillRows.filter(s => s.status === 'Self-reported').length;
  counts.missing = skillRows.filter(s => s.status === 'Missing').length;

  const topStrengths: string[] = skillRows
    .filter(s => s.status === 'Verified' || s.status === 'Self-reported')
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3)
    .map(s => s.name);
  const priorityGaps: string[] = skillRows
    .filter(s => s.status === 'Missing' || s.status === 'Partial')
    .sort((a, b) => SKILL_ORDER.indexOf(a.name) - SKILL_ORDER.indexOf(b.name))
    .slice(0, 3)
    .map(s => s.name);
  const profileLabel = input.includeLinkedIn ? (useDemo ? 'LinkedIn demo profile (demo learner)' : 'LinkedIn profile (connected)') : 'LinkedIn not included';
  const repoLabel = repoMeta ? `github:${repoMeta.fullName} (${repoMeta.branch})` : 'No repository provided (LinkedIn-only demo)';
  const total = skillRows.length;
  const strengthPct = Math.round(((counts.verified + counts.selfReported) / total) * 100);
  const headline = `${strengthPct}% pathway signal coverage — ${topStrengths.length ? topStrengths[0] : 'No signals yet'} leading,${priorityGaps.length ? ' close ' + priorityGaps[0] + ' next.' : ' no active gaps.'}`;

  const summary = {
    headline,
    topStrengths,
    priorityGaps,
    counts,
    nSkills: total,
    profileLabel,
    repoLabel,
    repoEvidenceCount: Object.values(repoEvidence).reduce((sum, arr) => sum + arr.length, 0),
    liSkillCount: liDeclared.length,
  };

  const roadmapGroups = [
    { title: 'Verified strengths', items: roadmapSignal.verified.map(sk => ({ title: `Strengthen ${sk} further`, skill: sk, rationale: `Already verified. Extend with production patterns and test coverage.`, priority: 'low' as const })) },
    { title: 'Self-reported (needs repo evidence)', items: roadmapSignal.selfReported.map(sk => ({ title: `Verify ${sk} in repository`, skill: sk, rationale: `Listed on LinkedIn but not verified in the selected repo. Add ${sk.toLowerCase()} files or deps.`, priority: 'medium' as const })) },
    { title: 'Partial signals', items: roadmapSignal.partial.map(sk => ({ title: `Push ${sk} to verified`, skill: sk, rationale: `Partial evidence found. ${NEXT_EVIDENCE[sk]}`, priority: 'medium' as const })) },
    { title: 'Priority gaps to close', items: roadmapSignal.missing.map(sk => ({ title: `Build ${sk} from scratch`, skill: sk, rationale: roadmapSignal.priorityGap === sk ? 'Pathway order: recommended next skill.' : 'No qualifying evidence in repository or LinkedIn.', priority: roadmapSignal.priorityGap === sk ? 'high' : 'normal' as 'high' | 'normal' | 'medium' | 'low' })) },
  ].filter(g => g.items.length > 0);

  const evidenceCards = skillRows.map(s => ({
    skill: s.name,
    status: s.status,
    headline: s.summary,
    body: `Evidence: ${s.evidence.length} item${s.evidence.length === 1 ? '' : 's'}. ${s.nextEvidence}`,
    sources: s.sources,
    recommendedAction: s.nextEvidence,
  }));

  const result: AnalyzeResponse = {
    analysisId,
    dashboardId,
    requestId,
    createdAt,
    profile: (input.includeLinkedIn) ? {
      connected: true, source: 'linkedin' as const,
      profileRef: useDemo ? 'linkedin:demo:learner' : 'linkedin:user:connected',
    } : undefined,
    repository: repoMeta ? { fullName: repoMeta.fullName, branch: repoMeta.branch, commits: snap.commits, readme: snap.readme, fileCount: snap.filePaths.length } : undefined,
    skills: skillRows,
    skillOrder: SKILL_ORDER,
    evidenceCards,
    summary,
    roadmap: { groups: roadmapGroups, signal: roadmapSignal },
    warnings,
  };

  ANALYSIS_CACHE.set(analysisId, result);
  DASHBOARD_CACHE.set(dashboardId, {
    id: dashboardId, analysisId,
    counts: summary.counts,
    topStrengths: summary.topStrengths,
    priorityGap: roadmapSignal.priorityGap,
    priorityGaps: summary.priorityGaps,
    headline: summary.headline,
    createdAt,
  });

  return result;
}

export function getAnalysisById(id: string) { return ANALYSIS_CACHE.get(id); }
export function getDashboardById(id: string) { return DASHBOARD_CACHE.get(id); }

// ==========================
// GitHub public API adapter (inline, lightweight)
// ==========================

function parseOwnerRepo(input: string): { owner: string; repo: string } | null {
  const cleaned = input.trim().replace(/\.git$/, '').replace(/\/$/, '');
  let m = cleaned.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)/);
  if (m) return { owner: m[1], repo: m[2] };
  m = cleaned.match(/^([^\/\s]+)\/([^\/\s]+)$/);
  if (m) return { owner: m[1], repo: m[2] };
  return null;
}

async function tryFetchGitHubRepoSnapshot(
  repo: string,
  warnings: string[]
): Promise<{ snapshot?: RepoSnapshot; meta?: { fullName: string; branch: string } }> {
  const parsed = parseOwnerRepo(repo);
  if (!parsed) {
    warnings.push('Could not parse repository reference. Falling back to LinkedIn-only evidence.');
    return {};
  }
  const { owner, repo: name } = parsed;
  const GITHUB = 'https://api.github.com';
  try {
    // Default branch
    const infoRes = await fetch(`${GITHUB}/repos/${owner}/${name}`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'pathpilot-widget/1.0', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) },
    });
    if (infoRes.status === 403) { warnings.push('GitHub rate limit reached; returning LinkedIn-only evidence (60 req/hr unauthenticated). Add GITHUB_TOKEN for 5000/hr.'); return {}; }
    if (infoRes.status === 404) { warnings.push(`Repository ${owner}/${name} not found or private.`); return {}; }
    if (!infoRes.ok) { warnings.push(`GitHub returned ${infoRes.status} for repository info.`); return {}; }
    const info: any = await infoRes.json();
    const branch: string = info.default_branch || 'main';
    const fullName: string = info.full_name || `${owner}/${name}`;

    // File tree (recursive 1, budget: 100 paths max)
    const treeRes = await fetch(`${GITHUB}/repos/${owner}/${name}/git/trees/${encodeURIComponent(branch)}?recursive=1`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'pathpilot-widget/1.0', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) },
    });
    let filePaths: string[] = [];
    if (treeRes.ok) {
      const treeJson: any = await treeRes.json();
      const list = Array.isArray(treeJson) ? treeJson : (Array.isArray(treeJson?.tree) ? treeJson.tree : []);
      for (const item of list) {
        if (item && typeof item.path === 'string' && item.type !== 'tree') filePaths.push(item.path);
      }
      if (treeJson?.truncated) warnings.push('Repository file tree exceeded GitHub API max size; evidence sampling may be incomplete.');
    }
    // Apply exclusion filter (no node_modules/.git, etc)
    filePaths = filePaths.filter((p) => {
      if (p.startsWith('.git/') || p.startsWith('node_modules/')) return false;
      if (/^dist\//.test(p) || /^build\//.test(p) || /^coverage\//.test(p)) return false;
      if (/\.(png|jpe?g|gif|ico|woff|woff2|ttf|eot|lock|map|bin)$/i.test(p)) return false;
      return true;
    }).slice(0, 100);

    // Manifest
    let manifestDeps: Record<string, string> = {};
    let manifestDevDeps: Record<string, string> = {};
    const packagePath = filePaths.find((p) => /^package\.json$/.test(p));
    if (packagePath) {
      const pj = await fetch(`${GITHUB}/repos/${owner}/${name}/contents/package.json?ref=${encodeURIComponent(branch)}`, {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'pathpilot-widget/1.0', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) },
      });
      if (pj.ok) {
        const pjRaw: any = await pj.json();
        if (typeof pjRaw?.content === 'string') {
          try {
            const json = JSON.parse(Buffer.from(pjRaw.content.replace(/\s+/g, ''), 'base64').toString('utf-8'));
            manifestDeps = json.dependencies || {};
            manifestDevDeps = json.devDependencies || {};
          } catch {
            warnings.push('package.json found but could not be parsed as JSON.');
          }
        }
      }
    }

    // README
    let readme = '';
    const readmePath = filePaths.find((p) => /^README(\.[a-zA-Z0-9]+)?$/i.test(p));
    if (readmePath) {
      const r = await fetch(`${GITHUB}/repos/${owner}/${name}/contents/${encodeURIComponent(readmePath)}?ref=${encodeURIComponent(branch)}`, {
        headers: { Accept: 'application/vnd.github.raw', 'User-Agent': 'pathpilot-widget/1.0', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) },
      });
      if (r.ok) readme = (await r.text()).slice(0, 32 * 1024);
    }

    // Commits (budget 20)
    let commits = 0;
    try {
      const c = await fetch(`${GITHUB}/repos/${owner}/${name}/commits?sha=${encodeURIComponent(branch)}&per_page=20`, {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'pathpilot-widget/1.0', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) },
      });
      if (c.ok) {
        const list = await c.json();
        commits = Array.isArray(list) ? list.length : 0;
      }
    } catch { /* swallow */ }

    return {
      snapshot: { manifestDeps, manifestDevDeps, filePaths, readme, commits },
      meta: { fullName, branch },
    };
  } catch (err: any) {
    warnings.push(`GitHub API call failed: ${err?.message || String(err)} — evidence falling back to LinkedIn only.`);
    return {};
  }
}

export const demoProfile = DEMO_LINKEDIN_PROFILE;
export { SKILL_NORMALIZATION };
