/**
 * Downgrades an auto_fix route to human_review when the caller self-reports
 * that no tool capable of applying it is actually connected. MCP has no
 * protocol-level way for WARDEN to see another server's tool list, so this
 * only ever works off what the calling agent reports — see the README for
 * why that's an honest limitation, not a gap to silently paper over.
 *
 * Only applies to the two finding classes whose rule table can ever return
 * `auto_fix` in the first place (triage-rules.ts) — everything else is
 * already human-routed regardless of tool availability.
 */

import type { FindingClass } from "./triage-rules.js";
import type { TriageDecision } from "./triage-rules.js";

const TOOL_DEPENDENT_CLASSES: FindingClass[] = ["vulnerable_dependency", "container_image_vulnerability"];

export function applyToolAvailability(
  decision: TriageDecision,
  findingClass: FindingClass,
  availableTools?: string[]
): TriageDecision {
  if (!availableTools) return decision; // no self-report — don't second-guess the rule table
  if (decision.route !== "auto_fix") return decision; // already human-routed, nothing to downgrade
  if (!TOOL_DEPENDENT_CLASSES.includes(findingClass)) return decision;
  if (availableTools.includes("generate_patch")) return decision; // WARDEN's own tool — normally present

  return {
    ...decision,
    route: "human_review",
    auto_fixable: false,
    requires_human_approval: true,
    next_action: `${decision.next_action} No connected tool reported a patch-generation capability, so a human must apply this.`,
    rationale: `${decision.rationale} No tool self-reported as available (available_tools) can execute this fix.`,
  };
}
