import {
  RepositorySnapshot,
  ProfileSnapshot,
  SkillEvidence,
  EvidenceItem,
  EvidenceStatus,
  Provider,
  PathwayId,
} from '../domain/models.js';
import { DetectionContext, runDetection } from '../domain/rules.js';
import { findSkillDefinition, getSkillNames, getSkillsForPathway } from '../domain/skillMatrix.js';
import { ShortId } from '../infrastructure/cache.js';

export function buildDetectionContext(
  snapshot: RepositorySnapshot,
  commitCount?: number
): DetectionContext {
  return {
    files: snapshot.files,
    manifest: snapshot.manifest,
    readme: snapshot.readme,
    selectedFiles: snapshot.selectedFiles,
    commitCount,
  };
}

export function computeConfidence(githubItems: EvidenceItem[]): number {
  let score = 0;
  const seen = new Set<string>();
  for (const item of githubItems) {
    if (item.ruleId) {
      if (seen.has(item.ruleId)) continue;
      seen.add(item.ruleId);
    }
    score += item.weight || 0;
  }
  return Math.min(100, Math.round(score));
}

export function statusFromConfidence(confidence: number, verifiedThreshold: number, partialThreshold: number): Exclude<EvidenceStatus, 'Self-reported'> {
  if (confidence >= verifiedThreshold) return 'Verified';
  if (confidence >= partialThreshold) return 'Partial';
  return 'Missing';
}

export function summarizeGithubEvidence(skill: string, status: EvidenceStatus, items: EvidenceItem[], inspected: string[]): string {
  if (status === 'Verified') {
    return `Verified in repository by ${items.length} evidence item(s): ${items.slice(0, 3).map((i) => i.pathOrField).join('; ')}.`;
  }
  if (status === 'Partial') {
    return `Some GitHub signals present for ${skill}, but evidence is weak or incomplete. Found ${items.length} partial indicator(s).`;
  }
  return `No qualifying signal for ${skill} was found within the inspected scope (${inspected.join(', ')}).`;
}

export function summarizeLinkedInContext(skill: string, linkedInPresent: boolean): string {
  if (!linkedInPresent) return '';
  return `Listed in LinkedIn skills; not verified in the selected GitHub repository.`;
}

export function buildSkillEvidenceMatrix(
  pathway: PathwayId,
  repoSnapshot?: RepositorySnapshot,
  profileSnapshot?: ProfileSnapshot,
  commitCount?: number
): SkillEvidence[] {
  const skillNames = getSkillNames(pathway);
  const skills = getSkillsForPathway(pathway);
  let detections: Record<string, EvidenceItem[]> = {};

  if (repoSnapshot) {
    const ctx = buildDetectionContext(repoSnapshot, commitCount);
    detections = runDetection(ctx, skillNames);
  }

  const linkedInDeclared = new Set<string>(profileSnapshot?.declaredSkills || []);

  const result: SkillEvidence[] = [];

  for (const def of skills) {
    const githubItems = (detections[def.name] || []).filter((i) => i.provider === 'github');
    const confidence = computeConfidence(githubItems);
    const linkedInPresent = linkedInDeclared.has(def.name);

    const hasGithub = githubItems.length > 0;

    let status: EvidenceStatus;
    let finalConfidence: number | undefined;

    if (hasGithub) {
      status = statusFromConfidence(confidence, def.verifiedThreshold, def.partialThreshold);
      finalConfidence = confidence;
    } else if (linkedInPresent) {
      status = 'Self-reported';
      finalConfidence = 20;
    } else {
      status = 'Missing';
      finalConfidence = 0;
    }

    const sources: SkillEvidence['sources'] = [];
    if (hasGithub) sources.push({ provider: 'github' });
    if (linkedInPresent) sources.push({ provider: 'linkedin', field: 'skills' });

    const inspected: string[] = [];
    if (repoSnapshot) {
      inspected.push('package.json');
      inspected.push('README');
      const srcPaths = Array.from(new Set(githubItems.map((g) => g.pathOrField).filter(Boolean))).slice(0, 5);
      inspected.push(...srcPaths);
    }
    if (linkedInPresent) inspected.push('LinkedIn skills');

    let summary: string;
    if (status === 'Self-reported') {
      summary = summarizeLinkedInContext(def.name, true);
    } else {
      summary = summarizeGithubEvidence(def.name, status, githubItems, inspected);
    }

    const allEvidence: EvidenceItem[] = [...githubItems];
    if (linkedInPresent) {
      allEvidence.push({
        provider: 'linkedin',
        kind: 'declared-skill',
        pathOrField: 'skills',
        ruleId: 'linkedin-declared',
        weight: 15,
      });
    }

    result.push({
      skill: def.name,
      status,
      confidence: finalConfidence,
      summary,
      sources,
      evidence: allEvidence,
      inspected,
      nextEvidence: def.nextEvidencePrompt,
    });
  }

  return result;
}

export function profileSelfReportedOnlySkills(
  pathway: PathwayId,
  profileSnapshot?: ProfileSnapshot,
  repoEvidence?: SkillEvidence[]
): string[] {
  if (!profileSnapshot) return [];
  const skillNames = new Set(getSkillNames(pathway));
  const verifiedOrPartial = new Set(
    (repoEvidence || []).filter((e) => e.status === 'Verified' || e.status === 'Partial').map((e) => e.skill)
  );
  return profileSnapshot.declaredSkills.filter(
    (s) => skillNames.has(s) && !verifiedOrPartial.has(s)
  );
}

export function analysisId(): string {
  return ShortId.create('analysis');
}
