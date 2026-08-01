import type { ExclusionCategory } from './types.js';

/** Env/secret patterns excluded by default; skipped when --include-env is set. */
export const ENV_EXCLUDED_PATTERNS: string[] = [
  '.env',
  '.env.local',
  '.env.*.local',
];

/** Hard-coded exclusions always applied in addition to merged .gitignore rules. */
export const HARD_EXCLUDED_PATTERNS: string[] = [
  '.git/',
  '**/node_modules/',
  '**/dist/',
  '**/build/',
  '**/out/',
  '**/.next/',
  '*.tsbuildinfo',
  '.npm/',
  '.eslintcache',
  'coverage/',
  '.nyc_output/',
  'tmp/',
  'temp/',
  'pids/',
  'uploads/',
  ...ENV_EXCLUDED_PATTERNS,
  '.idea/',
  '.vscode/',
  '.DS_Store',
  'Thumbs.db',
  '*.log',
  'npm-debug.log*',
  'yarn-debug.log*',
  'yarn-error.log*',
  '*.zip',
];

export const EXCLUSION_CATEGORIES: ExclusionCategory[] = [
  {
    category: 'VCS',
    paths: ['.git/'],
  },
  {
    category: 'Dependencies',
    paths: ['**/node_modules/'],
  },
  {
    category: 'Build outputs',
    paths: ['**/dist/', '**/build/', '**/out/', '**/.next/'],
  },
  {
    category: 'Caches',
    paths: ['*.tsbuildinfo', '.npm/', '.eslintcache'],
  },
  {
    category: 'Test',
    paths: ['coverage/', '.nyc_output/'],
  },
  {
    category: 'Temp/runtime',
    paths: ['tmp/', 'temp/', 'pids/', 'uploads/'],
  },
  {
    category: 'Secrets',
    paths: [...ENV_EXCLUDED_PATTERNS],
  },
  {
    category: 'IDE/OS',
    paths: ['.idea/', '.vscode/', '.DS_Store', 'Thumbs.db'],
  },
  {
    category: 'Logs',
    paths: ['*.log', 'npm-debug.log*', 'yarn-debug.log*', 'yarn-error.log*'],
  },
  {
    category: 'Archives',
    paths: ['*.zip'],
  },
];

export function getExclusionReport(includeEnv: boolean = false): ExclusionCategory[] {
  return EXCLUSION_CATEGORIES
    .filter((entry) => !(includeEnv && entry.category === 'Secrets'))
    .map((entry) => ({
      category: entry.category,
      paths: [...entry.paths],
    }));
}
