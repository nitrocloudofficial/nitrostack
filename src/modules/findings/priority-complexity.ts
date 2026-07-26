/**
 * Priority and complexity scoring for the findings pipeline. Deliberately
 * reuses the KEV/EPSS ranking logic already built for prioritise_findings
 * (priority.ts) instead of inventing a second scoring system — "sort by
 * the same API connections already made," not a new heuristic.
 */

import { kevIndex } from "../../data/kev-loader.js";
import { getEpssScores } from "../remediation/epss.client.js";
import { rankPriority, type Priority } from "../remediation/priority.js";
import type { FindingClass } from "../triage/triage-rules.js";

export type Complexity = "LOW" | "MEDIUM" | "HIGH";

/** Only meaningful when a CVE is present — everything else has no KEV/EPSS evidence to rank against. */
export async function derivePriority(cve: string | null): Promise<{ priority: Priority; why: string } | null> {
  if (!cve) return null;
  const kevEntry = kevIndex.get(cve);
  const epssScores = await getEpssScores([cve]);
  const epss = epssScores.get(cve.toUpperCase())?.epss ?? null;
  return rankPriority({
    cveId: cve,
    cvss: null,
    inKev: kevEntry !== undefined,
    ransomwareLinked: kevEntry?.ransomwareUse ?? false,
    epss,
  });
}

/**
 * "Complexity" here means how much judgment/coordination the fix needs,
 * not how severe it is — a HIGH-priority finding can still be LOW
 * complexity (a patch-version bump) and vice versa. Classes that are
 * inherently non-mechanical (business-logic bugs, malicious packages,
 * compliance, live indicators, prompt-injection content) are always HIGH
 * regardless of the fixable flag, because "fixable" there would be a
 * category error, not a fact about this specific finding.
 */
const ALWAYS_HIGH_COMPLEXITY: FindingClass[] = [
  "first_party_code_vulnerability",
  "malicious_or_typosquatted_package",
  "infrastructure_misconfiguration",
  "runtime_indicator",
  "llm_or_mcp_content_risk",
  "license_or_compliance",
  "secret_exposure",
];

const MEDIUM_COMPLEXITY_CLASSES: FindingClass[] = [
  "transitive_dependency_vulnerability",
  "missing_hardening",
  "container_image_vulnerability",
];

export function deriveComplexity(input: { finding_class: FindingClass; fixable: boolean; breaking?: boolean }): Complexity {
  if (ALWAYS_HIGH_COMPLEXITY.includes(input.finding_class)) return "HIGH";
  if (input.breaking) return "HIGH";
  if (MEDIUM_COMPLEXITY_CLASSES.includes(input.finding_class)) return "MEDIUM";
  return input.fixable ? "LOW" : "MEDIUM";
}
