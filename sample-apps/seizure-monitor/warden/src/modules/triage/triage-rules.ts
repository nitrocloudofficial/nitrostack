/** Policy-only finding triage: choose a safe owner and next action, never execute the fix. */
export const FINDING_CLASSES = [
  "vulnerable_dependency", "transitive_dependency_vulnerability", "vulnerability_without_patch", "secret_exposure",
  "first_party_code_vulnerability", "infrastructure_misconfiguration", "missing_hardening", "container_image_vulnerability",
  "malicious_or_typosquatted_package", "license_or_compliance", "runtime_indicator", "llm_or_mcp_content_risk",
] as const;
export type FindingClass = (typeof FINDING_CLASSES)[number];
export type TriageRoute = "auto_fix" | "reviewed_auto_fix" | "human_review" | "human_operations" | "no_fix_yet";
export interface TriageInput { finding_class: FindingClass; patch_available?: boolean; breaking_change?: boolean; }
export interface TriageDecision {
  route: TriageRoute; auto_fixable: boolean; requires_human_approval: boolean;
  queue: "remediation" | "investigation" | "operations" | "legal"; next_action: string; rationale: string;
}
const noPatchDecision: TriageDecision = {
  route: "no_fix_yet", auto_fixable: false, requires_human_approval: true, queue: "investigation",
  next_action: "Track the advisory, apply a compensating control where possible, and re-check when a fixed version is released.",
  rationale: "There is no vendor or upstream patch to apply safely.",
};
/** A small, explicit rule set is safer and easier to audit than a heuristic score. */
export function triageFinding(input: TriageInput): TriageDecision {
  const patchAvailable = input.patch_available ?? true;
  switch (input.finding_class) {
    case "vulnerability_without_patch": return noPatchDecision;
    case "vulnerable_dependency":
      if (!patchAvailable) return noPatchDecision;
      if (input.breaking_change) return {
        route: "reviewed_auto_fix", auto_fixable: true, requires_human_approval: true, queue: "remediation",
        next_action: "Generate the version-bump patch, then review and test the required major-version migration.",
        rationale: "A fixed version exists, but a breaking upgrade can change application behaviour.",
      };
      return {
        route: "auto_fix", auto_fixable: true, requires_human_approval: false, queue: "remediation",
        next_action: "Generate and verify the minimum non-breaking dependency version bump.",
        rationale: "A fixed upstream version exists and dependency metadata can be changed mechanically.",
      };
    case "transitive_dependency_vulnerability":
      if (!patchAvailable) return noPatchDecision;
      return {
        route: "reviewed_auto_fix", auto_fixable: true, requires_human_approval: true, queue: "remediation",
        next_action: "Propose an override, resolution, or parent-package upgrade and verify the resolved lockfile.",
        rationale: "The fix may require an override or a change to a parent dependency, so it needs review.",
      };
    case "container_image_vulnerability":
      if (!patchAvailable) return noPatchDecision;
      return {
        route: input.breaking_change ? "reviewed_auto_fix" : "auto_fix", auto_fixable: true,
        requires_human_approval: Boolean(input.breaking_change), queue: "remediation",
        next_action: "Bump the image or OS package to the minimum fixed version and rebuild the image.",
        rationale: input.breaking_change ? "A fixed base image exists, but the upgrade may change runtime compatibility." : "Base-image and OS-package version changes are reproducible and can be verified by rebuilding.",
      };
    case "infrastructure_misconfiguration":
    case "missing_hardening": return {
      route: "reviewed_auto_fix", auto_fixable: true, requires_human_approval: true, queue: "remediation",
      next_action: "Produce the declarative configuration change and apply it only after environment review.",
      rationale: "The change is usually mechanical, but it can affect availability or intended access.",
    };
    case "secret_exposure": return {
      route: "human_operations", auto_fixable: false, requires_human_approval: true, queue: "operations",
      next_action: "Revoke and rotate the secret, identify its use sites, then remove it from code and history under an incident procedure.",
      rationale: "Rotation changes live credentials and cannot be safely automated from a scan result.",
    };
    case "runtime_indicator": return {
      route: "human_operations", auto_fixable: false, requires_human_approval: true, queue: "operations",
      next_action: "Validate the indicator, scope affected systems, and block or contain it through approved security operations controls.",
      rationale: "Network blocking and incident response alter live systems and require operational authority.",
    };
    case "license_or_compliance": return {
      route: "human_review", auto_fixable: false, requires_human_approval: true, queue: "legal",
      next_action: "Send the component and its usage context for legal or compliance review before replacing or relicensing it.",
      rationale: "The correct remediation depends on licensing obligations, not a purely technical rule.",
    };
    case "first_party_code_vulnerability": return {
      route: "human_review", auto_fixable: false, requires_human_approval: true, queue: "investigation",
      next_action: "Create a reviewed remediation proposal with tests; do not apply an AI-generated logic rewrite automatically.",
      rationale: "Changing application logic can introduce regressions even when the proposed patch looks plausible.",
    };
    case "malicious_or_typosquatted_package": return {
      route: "human_review", auto_fixable: false, requires_human_approval: true, queue: "investigation",
      next_action: "Investigate provenance and impact, then choose and review a trustworthy replacement package.",
      rationale: "Package replacement requires a judgement call about trust, compatibility, and possible compromise.",
    };
    case "llm_or_mcp_content_risk": return {
      route: "human_review", auto_fixable: false, requires_human_approval: true, queue: "investigation",
      next_action: "Quarantine the untrusted content, preserve evidence, and review the affected tool or retrieval boundary.",
      rationale: "Prompt injection and tool poisoning need containment and design review rather than a blind text rewrite.",
    };
  }
}
