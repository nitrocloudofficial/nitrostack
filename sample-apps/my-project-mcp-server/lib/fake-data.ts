// SWAP COMPLETE — this file used to hold local fixtures standing in for
// the NitroStack MCP backend. It now proxies the real backend (see
// ../backend). Kept the filename and exports stable so nothing importing
// `getCaseData` / `DEFAULT_CASE_ID` from here had to change.

import { getCase, listCases } from './api';

export const DEFAULT_CASE_ID = 'clean-case';

// Used only if the backend can't be reached when populating the dev
// case switcher — keeps the UI from showing an empty dropdown.
export const FALLBACK_CASE_IDS = ['clean-case', 'gotcha-case'] as const;

export async function getCaseData(caseId: string) {
  return getCase(caseId);
}

export async function getAllCaseIds(): Promise<string[]> {
  try {
    const cases = await listCases();
    return cases.length > 0 ? cases.map((c) => c.caseId) : [...FALLBACK_CASE_IDS];
  } catch {
    return [...FALLBACK_CASE_IDS];
  }
}
