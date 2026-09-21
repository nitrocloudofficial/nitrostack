import {
  RoadmapSignal,
  SkillEvidence,
  EvidenceStatus,
  PathwayId,
  ProfileSnapshot,
} from '../domain/models.js';
import { findSkillDefinition, getSkillsForPathway } from '../domain/skillMatrix.js';

export interface BuildRoadmapSignalInput {
  skillEvidence: SkillEvidence[];
  pathway: PathwayId;
  profile?: ProfileSnapshot;
}

const SUGGESTED_TASKS: Record<string, string> = {
  HTML: 'Create a 3-page personal portfolio site (home, projects, contact) using semantic HTML: header, nav, main, footer, article, and section tags.',
  CSS: 'Style the portfolio with responsive Flexbox or Grid layout, a custom color palette, and a mobile media query that collapses navigation.',
  JavaScript: 'Add dark-mode toggle, form validation, and a project filter using event listeners and array methods (filter/map).',
  TypeScript: 'Convert the JavaScript logic to TypeScript, adding interfaces for Project, Contact, User, and strict tsconfig checks.',
  React: 'Build a React task-tracker app with useState for items, useEffect for localStorage persistence, and 3+ components (TaskList, TaskForm, TaskItem).',
  'Node.js': 'Initialize a Node.js project with start/dev/build scripts, a package.json, and a small CLI or entry server using ES modules or CommonJS.',
  Express: 'Create an Express server with 4 routes (GET /api/items, GET /api/items/:id, POST /api/items, DELETE /api/items) and at least one middleware (cors, JSON body parser, or morgan).',
  'REST API Integration': 'Build a weather dashboard using fetch() or axios against a public API, with loading spinners, error toasts, and success-state cards.',
  Database: 'Add MongoDB (mongoose), PostgreSQL (pg/prisma), or SQLite schema with CRUD operations and 2+ models (e.g., User + Task or Product + Category).',
  Git: 'Practice structured commits with 8+ commits across feature branches, descriptive messages, and at least one merge commit.',
  Deployment: 'Deploy the full-stack project with a vercel.json / netlify.toml / Dockerfile or GitHub Actions workflow, and paste the live URL into README.',
};

function pickSuggestedTask(gap: string): string {
  return SUGGESTED_TASKS[gap] || `Build a small project that exercises ${gap} end-to-end with acceptance checks.`;
}

function describeMissingStatus(evidence: SkillEvidence[]): string[] {
  return evidence
    .filter((e) => e.status === 'Missing')
    .sort((a, b) => (findSkillDefinition(a.skill, 'full-stack-developer')?.order || 0) - (findSkillDefinition(b.skill, 'full-stack-developer')?.order || 0))
    .map((e) => e.skill);
}

function buildRationale(
  priorityGap: string,
  skillEvidence: SkillEvidence[],
  profile?: ProfileSnapshot
): string {
  const parts: string[] = [];
  const gapEvidence = skillEvidence.find((e) => e.skill === priorityGap);
  if (gapEvidence && gapEvidence.status === 'Missing') {
    parts.push(`No qualifying GitHub evidence was found for ${priorityGap} within the inspected scope.`);
  } else if (gapEvidence && gapEvidence.status === 'Partial') {
    parts.push(`${priorityGap} has partial signals; more evidence is needed to reach Verified.`);
  } else if (gapEvidence && gapEvidence.status === 'Self-reported') {
    parts.push(`${priorityGap} is listed on LinkedIn but not verified in the selected repository.`);
  }
  const selfReportedOnly = skillEvidence.filter((e) => e.status === 'Self-reported').map((e) => e.skill);
  if (selfReportedOnly.length > 0) {
    parts.push(`Self-reported LinkedIn skill(s) without GitHub evidence: ${selfReportedOnly.join(', ')}.`);
  }
  if (profile?.declaredSkills && profile.declaredSkills.length > 0) {
    // nothing extra to add
  }
  if (parts.length === 0) parts.push('Priority gap determined by pathway prerequisites and missing skill matrix entries.');
  return parts.join(' ');
}

export function buildRoadmapSignal(input: BuildRoadmapSignalInput): RoadmapSignal {
  const { skillEvidence, pathway, profile } = input;

  const verified: string[] = [];
  const selfReported: string[] = [];
  const partial: string[] = [];
  const missing: string[] = [];

  for (const ev of skillEvidence) {
    switch (ev.status) {
      case 'Verified': verified.push(ev.skill); break;
      case 'Self-reported': selfReported.push(ev.skill); break;
      case 'Partial': partial.push(ev.skill); break;
      case 'Missing': missing.push(ev.skill); break;
    }
  }

  const pathwaySkills = getSkillsForPathway(pathway);
  const ordered = pathwaySkills.map((s) => s.name);

  const priorityOrder = [...partial, ...missing].sort((a, b) => ordered.indexOf(a) - ordered.indexOf(b));
  const unresolvedLinkedIn = selfReported.filter((s) => !verified.includes(s));
  const combined = [
    ...unresolvedLinkedIn.filter((s) => missing.includes(s) || partial.includes(s)),
    ...priorityOrder.filter((s) => !unresolvedLinkedIn.includes(s)),
    ...priorityOrder,
  ];
  const seen = new Set<string>();
  let priorityGap = ordered.find((s) => missing.includes(s) || partial.includes(s)) || priorityOrder[0] || '';
  if (unresolvedLinkedIn.length > 0) {
    const firstLinkedInGap = unresolvedLinkedIn.find((s) => missing.includes(s) || partial.includes(s));
    if (firstLinkedInGap) priorityGap = firstLinkedInGap;
  }

  // dedupe combined not strictly needed; keep clean
  void combined; void seen;

  const suggestedTask = pickSuggestedTask(priorityGap);
  const rationale = buildRationale(priorityGap, skillEvidence, profile);

  return {
    verified: verified.sort((a, b) => ordered.indexOf(a) - ordered.indexOf(b)),
    selfReported: selfReported.sort((a, b) => ordered.indexOf(a) - ordered.indexOf(b)),
    partial: partial.sort((a, b) => ordered.indexOf(a) - ordered.indexOf(b)),
    missing: describeMissingStatus(skillEvidence),
    priorityGap,
    suggestedTask,
    rationale,
  };
}
