// Shared contract for assessment modules (docs/SCHEMA.md: Finding). Keep this file small and stable.
export type Category = 'security' | 'dependencies' | 'runtime' | 'architecture' | 'standards' | 'cloud';
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface Finding {
  id: string; // stable kebab-case rule id, e.g. "node-runtime-eol"
  category: Category;
  severity: Severity;
  title: string; // one line, plain words
  evidence?: string; // short: file, line or value that triggered the rule (never secrets)
  recommendation: string; // one actionable sentence
  // Optional enrichment (feeds module). Absent when unknown or when a feed was unavailable.
  cwe?: string[]; // e.g. ["CWE-89"]
  owasp?: string[]; // OWASP Top 10 2021 ids, e.g. ["A03:2021"]
  cvss?: number; // CVSS v3 base score 0..10
  kev?: boolean; // listed in CISA Known Exploited Vulnerabilities (only ever set to true)
  epss?: number; // EPSS probability 0..1
  source?: string; // where the enrichment came from, e.g. "osv.dev"; for runner findings the tool name and version, e.g. "trivy 0.76.1"
  sources?: string[]; // runner findings only: every tool that reported this (deduplicated) finding, e.g. ["trivy", "composer-audit"]
  rankReason?: string; // why it sits where it does in the ranking (rank.ts), max 80 chars; set by assessFull
  // 'low': the finding rests on a guessed version (dependency range, no lockfile). The score counts it at half weight (score.ts).
  confidence?: 'low';
  // Folder (relative to the repository root) of the project the finding belongs to. Set only when more than one
  // project was assessed or the root has no manifest; absent for repo-wide findings and for single-project runs.
  project?: string;
}

export interface DepRef {
  name: string;
  version: string; // exact when taken from a lockfile, otherwise the lowest version the range allows
  dev: boolean;
  approximate: boolean; // true when the version was derived from a range
}

export const SEVERITY_RANK: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };

// ---- planning contract (shared by planner, patch generator and tools) ----
export type Goal = 'patch_advisory' | 'upgrade_runtime' | 'modernize_all';

// Lowest version that fixes ALL known advisories of the installed version (highest fixed version seen).
export interface DependencyFix {
  ecosystem: 'npm' | 'Packagist';
  name: string;
  from: string;
  to: string;
  urgent: boolean;
  dev: boolean;
}

export type StageKind = 'dependencies' | 'runtime' | 'code' | 'packaging';

export interface PlanStage {
  index: number; // 1-based, execution order
  id: string; // stable kebab-case, e.g. "patch-dependencies"
  title: string;
  kind: StageKind;
  automated: boolean; // true: Metamorph can generate the file changes; false: guided (client edits code, Metamorph re-scans)
  risk: 'low' | 'medium' | 'high';
  addresses: string[]; // finding ids this stage removes
  steps: string[]; // plain-language steps, at most 6
  rollback: string; // one sentence
  scoreAfter: number; // projected score after this stage and all earlier ones
}

export interface ModernizationPlan {
  goal: Goal;
  stack: 'node' | 'php' | 'mixed' | 'unknown';
  stages: PlanStage[];
  scoreBefore: number;
  scoreAfter: number;
}

// One file change. `after: null` means delete the file.
export interface FilePatch {
  path: string;
  before?: string; // undefined when the file is new
  after: string | null;
  reason: string;
  stageId: string;
}
