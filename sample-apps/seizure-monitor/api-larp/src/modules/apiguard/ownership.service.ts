import { Injectable } from '@nitrostack/core';
import type { Assessment, OwnershipResolution } from '../../domain/types.js';
import { randomUUID } from 'node:crypto';
import type { EvidenceSnapshotV2 } from '../../domain/evidence-snapshot.js';

function codeownersPatternToRegex(pattern: string): RegExp {
  let p = pattern.trim();
  const startsWithSlash = p.startsWith('/');
  if (startsWithSlash) p = p.slice(1);
  const endsWithSlash = p.endsWith('/');
  if (endsWithSlash) p = p.slice(0, -1);

  let regexStr = p
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*');

  if (endsWithSlash) {
    regexStr += '(/.*)?$';
  } else {
    regexStr += '$';
  }

  if (startsWithSlash) {
    regexStr = '^' + regexStr;
  } else {
    regexStr = '(^|/)' + regexStr;
  }

  return new RegExp(regexStr);
}

@Injectable()
export class OwnershipService {
  async resolve(assessment: Assessment, snapshot: EvidenceSnapshotV2): Promise<OwnershipResolution> {
    const assignments: OwnershipResolution['assignments'] = [];
    let unresolvedCount = 0;
    const warnings: string[] = [];

    // Parse CODEOWNERS for each repository in the snapshot
    const repoCodeowners = new Map<string, Array<{ pattern: string; owners: string[]; line: number }>>();

    for (const repo of snapshot.repositories) {
      if (!repo.codeowners?.content) continue;
      const lines = repo.codeowners.content.split('\n');
      const parsedLines = [];
      for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i]!;
        const hashIdx = rawLine.indexOf('#');
        const cleanLine = (hashIdx >= 0 ? rawLine.slice(0, hashIdx) : rawLine).trim();
        if (!cleanLine) continue;

        const [pattern, ...owners] = cleanLine.split(/\s+/);
        if (pattern && owners.length > 0) {
          parsedLines.push({ pattern, owners, line: i + 1 });
        } else {
          warnings.push(`Invalid CODEOWNERS line in ${repo.repository} at line ${i + 1}`);
        }
      }
      repoCodeowners.set(repo.repository, parsedLines);
    }

    for (const item of assessment.evidence) {
      const repo = snapshot.repositories.find(r => r.repository === item.repository);
      const codeowners = repoCodeowners.get(item.repository);
      let matchedOwners: string[] = [];
      let status: 'RESOLVED' | 'UNRESOLVED' = 'UNRESOLVED';
      let source: 'CODEOWNERS' | 'REPOSITORY_FALLBACK' | 'NONE' = 'NONE';
      let matchedPattern: string | undefined;
      let matchedLine: number | undefined;

      if (codeowners) {
        // Find last matching pattern
        for (let i = codeowners.length - 1; i >= 0; i--) {
          const rule = codeowners[i]!;
          const regex = codeownersPatternToRegex(rule.pattern);
          
          if (regex.test(item.filePath)) {
            matchedOwners = rule.owners;
            status = 'RESOLVED';
            source = 'CODEOWNERS';
            matchedPattern = rule.pattern;
            matchedLine = rule.line;
            break;
          }
        }
      }

      if (status === 'UNRESOLVED') {
        unresolvedCount++;
      }

      assignments.push({
        evidenceId: item.id,
        consumerImpactKey: item.consumerImpactKey,
        repository: item.repository,
        filePath: item.filePath,
        owners: matchedOwners,
        status,
        source,
        matchedPattern,
        matchedLine,
        codeownersCommitSha: repo?.codeowners?.commitSha
      });
    }

    return {
      resolutionId: `res_${randomUUID().slice(0, 8)}`,
      assessmentId: assessment.id,
      assessmentVersion: assessment.version,
      resolvedAt: new Date().toISOString(),
      assignments,
      unresolvedCount,
      warnings
    };
  }
}

