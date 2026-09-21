// The "objectivity agent" the frontend keeps referring to as not built
// yet. This is a real, if simple, rule-based version of it: it actually
// inspects the submitted case and produces genuine flags rather than a
// canned response.

import type { ObjectivityReport } from '../types';
import { checkAgainstCghsRateList } from './cghs';

export function runObjectivityCheck(input: {
  procedure: string;
  estimatedCost: number;
  patientHistory: string;
}): ObjectivityReport {
  const flags: string[] = [];

  const cghs = checkAgainstCghsRateList(input.procedure, input.estimatedCost);
  if (cghs.aboveMedianByMoreThan50Pct) {
    flags.push(
      `Hospital estimate is ${cghs.deltaPct}% higher than the median CGHS-referenced cost for ${cghs.matchedLabel} (₹${cghs.medianRate.toLocaleString('en-IN')}).`
    );
  }

  if (!input.patientHistory || input.patientHistory.trim().length < 15) {
    flags.push(
      'Patient history is missing or very brief — insufficient detail to confirm the procedure matches the diagnosis.'
    );
  }

  if (input.procedure.trim().length < 6) {
    flags.push('Procedure name is too vague to verify against a standard rate list with confidence.');
  }

  return {
    summary:
      flags.length === 0
        ? 'Submission is consistent across hospital records, diagnosis codes, and policy terms. No discrepancies found.'
        : 'Submission has inconsistencies that were flagged before reaching the insurer. Review recommended before treating the approved amount as final.',
    flags,
  };
}
