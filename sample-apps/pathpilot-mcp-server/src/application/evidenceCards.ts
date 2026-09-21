import {
  SkillEvidence,
  EvidenceCard,
  DashboardSummary,
  PathwayId,
  UnifiedAnalysisResult,
  ProfileSnapshot,
  RepositorySnapshot,
  EvidenceStatus,
  RoadmapSignal,
} from '../domain/models.js';
import { findSkillDefinition, getSkillNames } from '../domain/skillMatrix.js';
import { ShortId } from '../infrastructure/cache.js';

export interface ComparisonRow {
  skill: string;
  github: Exclude<EvidenceStatus, 'Self-reported'>;
  linkedIn: 'Declared' | 'Not declared';
  matched: boolean;
  note: string;
}

export function compareProfileAndRepository(
  pathway: PathwayId,
  skillEvidence: SkillEvidence[]
): { matched: ComparisonRow[]; onlySelfReported: ComparisonRow[]; onlyVerified: ComparisonRow[]; rows: ComparisonRow[] } {
  const skillNames = getSkillNames(pathway);
  const rows: ComparisonRow[] = [];

  for (const name of skillNames) {
    const ev = skillEvidence.find((e) => e.skill === name);
    const github: Exclude<EvidenceStatus, 'Self-reported'> =
      ev?.status === 'Verified' || ev?.status === 'Partial' || ev?.status === 'Missing'
        ? ev.status
        : 'Missing';
    const linkedInDeclared = ev?.sources.some((s) => s.provider === 'linkedin') || ev?.status === 'Self-reported';
    const linkedIn: 'Declared' | 'Not declared' = linkedInDeclared ? 'Declared' : 'Not declared';

    let matched = false;
    let note = '';
    if ((github === 'Verified' || github === 'Partial') && linkedIn === 'Declared') {
      matched = true;
      note = `${name} appears on LinkedIn and has GitHub evidence.`;
    } else if ((github === 'Verified' || github === 'Partial') && linkedIn === 'Not declared') {
      note = `${name} has GitHub evidence but is not listed in LinkedIn profile skills.`;
    } else if (github === 'Missing' && linkedIn === 'Declared') {
      note = `${name} is declared on LinkedIn but was not verified in the selected repository.`;
    } else {
      note = `${name} has neither GitHub evidence nor a LinkedIn declaration in the target pathway.`;
    }

    rows.push({ skill: name, github, linkedIn, matched, note });
  }

  return {
    rows,
    matched: rows.filter((r) => r.matched),
    onlySelfReported: rows.filter((r) => r.linkedIn === 'Declared' && r.github === 'Missing'),
    onlyVerified: rows.filter((r) => (r.github === 'Verified' || r.github === 'Partial') && r.linkedIn === 'Not declared'),
  };
}

export function generateEvidenceCards(skillEvidence: SkillEvidence[]): EvidenceCard[] {
  return skillEvidence.map((ev) => {
    const highlights = ev.evidence
      .filter((e) => e.provider === 'github')
      .slice(0, 3)
      .map((e) => `${e.pathOrField}${e.excerpt ? ` — ${e.excerpt}` : ''}`);
    if (highlights.length === 0 && ev.status === 'Self-reported') {
      highlights.push('LinkedIn skills section (self-reported, not verified in selected repository)');
    }
    if (highlights.length === 0 && ev.status === 'Missing') {
      highlights.push(`Inspected: ${ev.inspected.slice(0, 3).join(', ')} — no qualifying signals found.`);
    }

    return {
      skill: ev.skill,
      status: ev.status,
      confidence: ev.confidence,
      summary: ev.summary,
      sources: ev.sources.map((s) => ({
        provider: s.provider,
        label: s.provider === 'github' ? 'GitHub (verified)' : `LinkedIn → ${s.field || 'skills'} (self-reported)`,
      })),
      evidenceHighlights: highlights,
      nextStep: ev.nextEvidence,
    };
  });
}

export function buildDashboardSummary(
  analysis: UnifiedAnalysisResult,
  pathway: PathwayId
): DashboardSummary {
  const counts = {
    verified: 0,
    partial: 0,
    selfReported: 0,
    missing: 0,
  };
  for (const e of analysis.skillEvidence) {
    if (e.status === 'Verified') counts.verified++;
    else if (e.status === 'Partial') counts.partial++;
    else if (e.status === 'Self-reported') counts.selfReported++;
    else counts.missing++;
  }

  const orderedStrengths = analysis.skillEvidence
    .filter((e) => e.status === 'Verified' || e.status === 'Self-reported')
    .sort(
      (a, b) =>
        (typeof b.confidence === 'number' ? b.confidence : 0) -
        (typeof a.confidence === 'number' ? a.confidence : 0)
    )
    .slice(0, 3)
    .map((e) => e.skill);

  return {
    analysisId: analysis.id,
    repositoryName: analysis.repository?.repository ? `${analysis.repository.repository.owner}/${analysis.repository.repository.repo}` : undefined,
    profileConnected: !!analysis.profile?.connected,
    totalSkills: analysis.skillEvidence.length,
    verifiedCount: counts.verified,
    partialCount: counts.partial,
    selfReportedCount: counts.selfReported,
    missingCount: counts.missing,
    priorityGap: analysis.roadmapSignal.priorityGap,
    topStrengths: orderedStrengths,
    createdAt: analysis.createdAt,
  };
}

export function fuseAnalysis(
  options: {
    requestId: string;
    pathway: PathwayId;
    repository?: RepositorySnapshot;
    profile?: ProfileSnapshot;
    skillEvidence: SkillEvidence[];
    roadmapSignal: ReturnType<typeof import('./roadmapSignal.js').buildRoadmapSignal>;
    warnings: string[];
  }
): UnifiedAnalysisResult {
  return {
    id: `analysis_${options.requestId.split('_')[1] || Math.random().toString(36).slice(2, 10)}`,
    requestId: options.requestId,
    pathway: options.pathway,
    repository: options.repository,
    profile: options.profile,
    skillEvidence: options.skillEvidence,
    roadmapSignal: options.roadmapSignal,
    warnings: options.warnings || [],
    createdAt: new Date().toISOString(),
  };
}
