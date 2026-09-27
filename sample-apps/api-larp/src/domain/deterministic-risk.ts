import type { ApiChange, AssessedEvidence, EvidenceItem } from './types.js';

const TEST_PATTERNS = [/(^|\/)__tests__\//i, /\.test\.[^.]+$/i, /\.spec\.[^.]+$/i, /(^|\/)test_[^/]+\.py$/i, /_test\.go$/i];
const DOC_PATTERNS = [/(^|\/)docs?\//i, /\.mdx?$/i, /(^|\/)examples?\//i];
const GENERATED_PATTERNS = [/(^|\/)generated\//i, /(^|\/)dist\//i, /(^|\/)vendor\//i, /\.generated\./i];

function fieldNames(changes: ApiChange[]): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const change of changes) {
    const last = change.jsonPath?.split('.').pop()?.replace(/\[\]$/, '');
    if (last && !last.startsWith('$')) result.set(change.id, [last]);
  }
  return result;
}

export function deterministicClassify(evidence: EvidenceItem, changes: ApiChange[]): AssessedEvidence | undefined {
  const base = { ...evidence, matchedChangeIds: [] as string[], migrationActions: [] };
  if (TEST_PATTERNS.some((p) => p.test(evidence.filePath))) return { ...base, classification: 'TEST_ONLY', confidence: 'HIGH', reasoning: 'The match is in a test file and does not prove production runtime impact.' };
  if (DOC_PATTERNS.some((p) => p.test(evidence.filePath))) return { ...base, classification: 'DOCUMENTATION_ONLY', confidence: 'HIGH', reasoning: 'The match is in documentation or an example.' };
  if (GENERATED_PATTERNS.some((p) => p.test(evidence.filePath))) return { ...base, classification: 'GENERATED_CODE', confidence: 'MEDIUM', reasoning: 'The match is generated code and should be regenerated from the updated contract.' };
  const trimmed = evidence.snippet.trim();
  const executableLines = trimmed.split(/\r?\n/).filter((line) => {
    const clean = line.trim();
    return clean && !clean.startsWith('//') && !clean.startsWith('#') && !clean.startsWith('*') && !clean.startsWith('/*');
  });
  if (!executableLines.length) return { ...base, classification: 'FALSE_POSITIVE', confidence: 'HIGH', reasoning: 'The match appears only in comments or non-executable text.' };
  const mapping = fieldNames(changes);
  const matched = [...mapping.entries()].filter(([, names]) => names.some((name) => executableLines.some((line) => line.includes(name)))).map(([id]) => id);
  if (!matched.length) return { ...base, classification: 'FALSE_POSITIVE', confidence: 'MEDIUM', reasoning: 'The executable snippet does not reference any changed contract field.' };
  return undefined;
}

export function fallbackAssess(evidence: EvidenceItem, changes: ApiChange[]): AssessedEvidence {
  const deterministic = deterministicClassify(evidence, changes);
  if (deterministic) return deterministic;
  const matchedChangeIds = changes.filter((change) => {
    const field = change.jsonPath?.split('.').pop()?.replace(/\[\]$/, '');
    return Boolean(field && evidence.snippet.includes(field));
  }).map((change) => change.id);
  const obviousAccess = /(?:response|payload|data|user)[.\[]/.test(evidence.snippet) || /json:\s*["'`]/.test(evidence.snippet);
  return {
    ...evidence,
    classification: obviousAccess && matchedChangeIds.length ? 'CONFIRMED_IMPACT' : 'REVIEW_REQUIRED',
    confidence: obviousAccess && matchedChangeIds.length ? 'MEDIUM' : 'LOW',
    matchedChangeIds,
    reasoning: obviousAccess && matchedChangeIds.length
      ? 'Deterministic fallback found executable access to a changed field; model-specific contextual review was unavailable.'
      : 'Automated contextual classification was unavailable or the evidence was insufficient. Manual review is required.',
    migrationActions: []
  };
}

export function computeSeverity(items: AssessedEvidence[]): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (items.some((item) => item.classification === 'CONFIRMED_IMPACT' && item.confidence !== 'LOW')) return 'HIGH';
  if (items.some((item) => ['LIKELY_IMPACT', 'REVIEW_REQUIRED', 'GENERATED_CODE'].includes(item.classification))) return 'MEDIUM';
  return 'LOW';
}
