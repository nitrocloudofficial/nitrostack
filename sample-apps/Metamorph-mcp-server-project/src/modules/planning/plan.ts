import { scoreFindings } from '../assessment/score.js';
import { shellQuote } from './patches.js';
import { compareFindings } from '../assessment/rank.js';
import type { DependencyFix, Finding, Goal, ModernizationPlan, PlanStage, StageKind } from '../assessment/types.js';

type Risk = PlanStage['risk'];

export interface PlanInput {
  stack: ModernizationPlan['stack'];
  findings: Finding[];
  fixes: DependencyFix[];
  goal: Goal;
}

// Node 22: maintained LTS until 2027-04-30 (official Node release schedule).
const TARGET_NODE = '22';
// PHP 8.4: security support until 2028-12-31 (php.net supported versions, verified 2026-10-30).
const TARGET_PHP = '8.4';

const MAX_STEPS = 6;
const MAX_FIX_STEPS = 5;
const DEP_PREFIX = 'dep-vulnerable:';

interface Def {
  id: string;
  title: string;
  kind: StageKind;
  automated: boolean;
  risk: Risk;
  ids: string[];
  prefix?: string;
  rollback: string;
}

const DEFS: Def[] = [
  {
    id: 'patch-dependencies', title: 'Patch vulnerable dependencies', kind: 'dependencies', automated: true, risk: 'low',
    ids: [], prefix: DEP_PREFIX, rollback: 'Revert the manifest changes and reinstall from the old lockfile.',
  },
  {
    id: 'lock-dependencies', title: 'Lock dependency versions', kind: 'dependencies', automated: false, risk: 'low',
    ids: ['node-no-lockfile', 'composer-no-lock', 'node-approximate-versions', 'php-approximate-versions', 'composer-missing'],
    rollback: 'Delete the generated lockfile and restore the previous manifest.',
  },
  {
    id: 'upgrade-runtime', title: 'Upgrade the runtime', kind: 'runtime', automated: true, risk: 'medium',
    ids: ['node-runtime-eol', 'php-version-eol', 'node-runtime-unpinned', 'php-unpinned-version'],
    rollback: 'Switch the runtime version back to the previous one and redeploy.',
  },
  {
    id: 'remove-committed-env', title: 'Stop committing the env file', kind: 'packaging', automated: true, risk: 'low',
    ids: ['env-file-committed'], rollback: 'Revert the patch. Your local env file is never deleted; rotated secrets stay rotated.',
  },
  {
    id: 'remove-deprecated', title: 'Replace deprecated packages', kind: 'dependencies', automated: false, risk: 'medium',
    ids: ['node-deprecated-package'], rollback: 'Reinstall the previous packages from the old lockfile.',
  },
  {
    id: 'fix-security-code', title: 'Fix insecure code', kind: 'code', automated: false, risk: 'high',
    ids: [
      'php-sql-concatenation', 'php-dynamic-include', 'php-eval', 'php-unserialize-input',
      'php-extract-input', 'php-weak-password-hash', 'php-mysql-removed-api', 'php-errors-hidden',
    ],
    rollback: 'Revert the code changes with version control and redeploy the previous release.',
  },
  {
    id: 'add-packaging', title: 'Add container and CI setup', kind: 'packaging', automated: true, risk: 'low',
    ids: ['no-container-packaging', 'no-ci', 'docker-latest-tag', 'docker-runs-as-root', 'docker-base-image-eol'],
    rollback: 'Remove the added Dockerfile and CI workflow.',
  },
  {
    id: 'modernize-structure', title: 'Modernize code structure', kind: 'code', automated: false, risk: 'medium',
    ids: ['node-commonjs', 'php-inline-html-mixed', 'node-no-tests', 'ui-multiple-systems'],
    rollback: 'Revert the refactoring commits with version control.',
  },
];

const OTHER = {
  id: 'other-findings',
  title: 'Address remaining findings',
  kind: 'code' as StageKind,
  automated: false,
  risk: 'medium' as Risk,
  rollback: 'Revert the individual changes with version control.',
};

function covers(def: Def, id: string): boolean {
  return def.ids.includes(id) || (def.prefix !== undefined && id.startsWith(def.prefix));
}

function major(version: string): number | null {
  const m = version.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

function crossesMajor(fix: DependencyFix): boolean {
  const a = major(fix.from);
  const b = major(fix.to);
  return a !== null && b !== null && a !== b;
}

function recommendations(findings: Finding[]): string[] {
  const sorted = findings
    .map((f, i) => ({ f, i }))
    .sort((a, b) => compareFindings(a.f, b.f) || a.i - b.i);
  return [...new Set(sorted.map((x) => x.f.recommendation))].slice(0, MAX_STEPS);
}

function dependencySteps(fixes: DependencyFix[]): string[] {
  if (fixes.length === 0) return ['Upgrade the vulnerable dependencies to patched versions'];
  const ordered = fixes.map((f, i) => ({ f, i })).sort((a, b) => Number(!!b.f.urgent) - Number(!!a.f.urgent) || a.i - b.i);
  const steps = ordered.slice(0, MAX_FIX_STEPS).map(({ f }) => `Upgrade ${f.name} from ${f.from} to ${f.to}`);
  if (ordered.length > MAX_FIX_STEPS) steps.push(`and ${ordered.length - MAX_FIX_STEPS} more`);
  return steps;
}

function dependencyRisk(fixes: DependencyFix[]): Risk {
  const crossing = fixes.filter(crossesMajor).length;
  if (crossing > 3) return 'high';
  return crossing > 0 ? 'medium' : 'low';
}

function envSteps(matched: Finding[]): string[] {
  const paths = [...new Set(matched.map((f) => f.evidence).filter((e): e is string => typeof e === 'string' && e.length > 0))].sort();
  return [
    'Apply the patch: it adds .env, .env.* and !.env.example to .gitignore and records the variable names (no values) in .env.example. It never deletes your local env file.',
    ...paths.map((p) => `Run: git rm --cached ${shellQuote(p)}`),
    'Rotate every secret the env file held (the variable names are listed in .env.example); treat them all as exposed.',
    ...paths.map((p) => `Purge history: git filter-repo --path ${shellQuote(p)} --invert-paths (WARNING: rewrites history and needs a force-push by a human; coordinate with everyone who has a clone)`)
  ];
}

function stepsFor(id: string, matched: Finding[], fixes: DependencyFix[]): string[] {
  switch (id) {
    case 'patch-dependencies':
      return dependencySteps(fixes);
    case 'lock-dependencies':
      return ['Generate and commit a lockfile (npm install or composer install)', 'Re-run the assessment'];
    case 'upgrade-runtime':
      return [`Upgrade Node to ${TARGET_NODE} and PHP to ${TARGET_PHP} where they are used`, 'Run the test suite on the new runtime'];
    case 'remove-committed-env':
      return envSteps(matched);
    case 'add-packaging':
      return ['Add a Dockerfile', 'Add a CI workflow'];
    default:
      return recommendations(matched);
  }
}

function pickStages(goal: Goal): Def[] {
  if (goal === 'patch_advisory') return DEFS.filter((d) => d.id === 'patch-dependencies');
  if (goal === 'upgrade_runtime') return DEFS.filter((d) => d.id === 'upgrade-runtime');
  return DEFS;
}

export function buildPlan(input: PlanInput): ModernizationPlan {
  const { stack, findings, fixes, goal } = input;
  const scoreBefore = scoreFindings(findings).overall;
  const claimed = new Set<string>(); // ids owned by a catalog stage, so other-findings skips them
  for (const d of DEFS) for (const f of findings) if (covers(d, f.id)) claimed.add(f.id);

  const stages: PlanStage[] = [];
  const done = new Set<string>();
  const addStage = (
    meta: { id: string; title: string; kind: StageKind; automated: boolean; risk: Risk; rollback: string },
    matched: Finding[],
    steps: string[]
  ): void => {
    const addresses = [...new Set(matched.map((f) => f.id))];
    for (const id of addresses) done.add(id);
    stages.push({
      index: stages.length + 1,
      id: meta.id,
      title: meta.title,
      kind: meta.kind,
      automated: meta.automated,
      risk: meta.risk,
      addresses,
      // The env stage lists one git command per env file; truncating would drop required rotation/purge steps.
      steps: meta.id === 'remove-committed-env' ? steps : steps.slice(0, MAX_STEPS),
      rollback: meta.rollback,
      scoreAfter: scoreFindings(findings.filter((f) => !done.has(f.id))).overall,
    });
  };

  for (const d of pickStages(goal)) {
    const matched = findings.filter((f) => covers(d, f.id));
    const isDeps = d.id === 'patch-dependencies';
    if (matched.length === 0 && !(isDeps && fixes.length > 0)) continue;
    const meta = isDeps ? { ...d, risk: dependencyRisk(fixes) } : d;
    addStage(meta, matched, stepsFor(d.id, matched, fixes));
  }

  if (goal === 'modernize_all') {
    const rest = findings.filter((f) => !claimed.has(f.id) && f.severity !== 'info');
    if (rest.length > 0) addStage(OTHER, rest, recommendations(rest));
  }

  return {
    stack,
    goal,
    scoreBefore,
    scoreAfter: stages.length > 0 ? stages[stages.length - 1].scoreAfter : scoreBefore,
    stages,
  };
}
