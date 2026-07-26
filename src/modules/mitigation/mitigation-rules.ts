/**
 * Rule-based compensating controls for findings that triage_finding routed
 * to `no_fix_yet` or another non-auto_fix path — a stopgap suggestion for
 * "there's no patch, but you don't have to sit exposed until there is."
 * Deliberately template-based, not generated free-form: every suggestion
 * here is a real, reviewable control a human still has to decide to apply.
 */

import type { FindingClass } from "../triage/triage-rules.js";

export interface Mitigation {
  control: string;
  category: "network" | "configuration" | "monitoring" | "process";
  detail: string;
}

const MITIGATIONS: Record<FindingClass, Mitigation[]> = {
  vulnerable_dependency: [
    { control: "WAF rule", category: "network", detail: "Add a WAF/reverse-proxy rule blocking the specific request pattern the CVE exploits, if one is published (e.g. a known malicious payload signature or vulnerable endpoint path)." },
    { control: "Feature flag", category: "configuration", detail: "Disable the vulnerable code path or feature at runtime via a feature flag until a fixed version is available." },
  ],
  transitive_dependency_vulnerability: [
    { control: "Dependency override/resolution", category: "configuration", detail: "Pin the transitive dependency to a patched version via an override/resolution field, without waiting for the parent package to update." },
    { control: "Monitoring rule", category: "monitoring", detail: "Alert on the transitive package's known-vulnerable code paths being invoked, if instrumentation exists." },
  ],
  vulnerability_without_patch: [
    { control: "WAF rule", category: "network", detail: "Deploy a virtual patch: a WAF/IPS signature that blocks the known exploit pattern at the network edge until an upstream fix ships." },
    { control: "Feature disable", category: "configuration", detail: "Disable the affected feature or endpoint entirely if it isn't business-critical, removing the exposure rather than accepting the risk." },
    { control: "Enhanced monitoring", category: "monitoring", detail: "Add detection rules (IDS/SIEM) for exploitation attempts against this specific CVE while it remains unpatched." },
  ],
  secret_exposure: [
    { control: "Network restriction", category: "network", detail: "Restrict the exposed credential's permissions/network scope (IP allowlist, least-privilege IAM policy) while rotation is in progress." },
  ],
  first_party_code_vulnerability: [
    { control: "Input validation gate", category: "configuration", detail: "Add a defensive input-validation or sanitization layer in front of the vulnerable code path as a stopgap before the logic fix ships." },
    { control: "WAF rule", category: "network", detail: "Block known malicious input patterns for this endpoint at the WAF while the code fix is reviewed." },
  ],
  infrastructure_misconfiguration: [
    { control: "Network segmentation", category: "network", detail: "Restrict network access to the misconfigured resource (security group / firewall rule) until the configuration itself is corrected." },
  ],
  missing_hardening: [
    { control: "Compensating network control", category: "network", detail: "Apply the missing control at a layer you already control (e.g. edge/WAF-level headers or TLS policy) while the underlying hardening change is scheduled." },
  ],
  container_image_vulnerability: [
    { control: "Runtime policy", category: "configuration", detail: "Apply a runtime security policy (seccomp/AppArmor profile, read-only filesystem, dropped capabilities) to reduce the blast radius until the image is rebuilt." },
  ],
  malicious_or_typosquatted_package: [
    { control: "Registry block", category: "network", detail: "Block the package name at the internal registry/proxy level to prevent further installs while provenance is investigated." },
  ],
  license_or_compliance: [
    { control: "Usage restriction", category: "process", detail: "Restrict the component to non-distributed/internal-only use until legal clears the license question." },
  ],
  runtime_indicator: [
    { control: "Network block", category: "network", detail: "Block the indicator (IP/domain/hash) at the firewall, DNS sinkhole, or EDR layer while the incident is investigated." },
  ],
  llm_or_mcp_content_risk: [
    { control: "Content quarantine", category: "configuration", detail: "Keep the untrusted content quarantined server-side (already WARDEN's default for read_threat_report) and do not widen the tool's output surface until the injection vector is reviewed." },
  ],
};

export function suggestMitigations(findingClass: FindingClass): Mitigation[] {
  return MITIGATIONS[findingClass] ?? [];
}
