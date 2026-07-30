/**
 * Builds a stable key so the same real-world finding — seen again on a
 * later scan — updates one row (bumping occurrence_count) instead of
 * creating a duplicate. This is what makes recurrence/"threat intent"
 * analysis (analyze_finding_history) possible at all.
 */

export interface DedupeKeyInput {
  finding_class: string;
  package_name: string | null;
  cve: string | null;
  indicator: string | null;
  description: string;
}

export function buildDedupeKey(input: DedupeKeyInput): string {
  if (input.package_name && input.cve) return `pkg:${input.package_name}:${input.cve}`;
  if (input.cve) return `cve:${input.cve}`;
  if (input.indicator) return `indicator:${input.indicator}`;
  if (input.package_name) return `pkg:${input.package_name}:${input.finding_class}`;

  const normalized = input.description.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 120);
  return `misc:${input.finding_class}:${normalized}`;
}
