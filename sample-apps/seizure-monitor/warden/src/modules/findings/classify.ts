/**
 * Auto-classifies a raw finding (from one of WARDEN's own scanners, or an
 * externally-ingested one) into the 12-class taxonomy from triage-rules.ts.
 *
 * HONEST LIMITATION: per-source heuristics here are best-effort pattern
 * matching over each scanner's known output shape, not a general-purpose
 * classifier. For an unrecognized `source` (an external MCP scanner this
 * code has never seen), it tries a keyword match over the description/raw
 * payload and otherwise returns `finding_class: null` rather than guessing
 * — ingest_finding requires the caller to supply `hint.finding_class` in
 * that case instead of silently mis-filing the finding.
 *
 * `fixable` is set to true ONLY when WARDEN has an actual mechanical patch
 * path for it (currently: a dependency with a known-good fix version via
 * scan_manifest/plan_remediation). Everything else defaults to false —
 * "WARDEN could suggest something" is not the same claim as "WARDEN can
 * patch this," and conflating them would overclaim exactly the thing this
 * codebase has been careful not to do elsewhere (OSV ecosystem gaps, DNS
 * lookup failures, etc.).
 */

import type { FindingClass } from "../triage/triage-rules.js";

export interface ClassificationHint {
  finding_class?: FindingClass;
  package_name?: string;
  cve?: string;
  indicator?: string;
  description?: string;
}

export interface ClassifiedFinding {
  finding_class: FindingClass | null;
  package_name: string | null;
  cve: string | null;
  indicator: string | null;
  description: string;
  fixable: boolean;
}

function firstString(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}

function classifyBySource(source: string, raw: Record<string, unknown>, description: string, cve: string | null): FindingClass | null {
  switch (source) {
    case "scan_manifest": {
      const unresolved = Array.isArray(raw.unresolved) ? raw.unresolved : [];
      return unresolved.length > 0 ? "vulnerability_without_patch" : "vulnerable_dependency";
    }
    case "scan_website": {
      // One element of scan_website's `exposed_files` array.
      if ("path" in raw && "severity" in raw) {
        return raw.severity === "critical" ? "secret_exposure" : "infrastructure_misconfiguration";
      }
      // One element of `headers`, or the `tls` object.
      if ("header" in raw || "protocol" in raw) return "missing_hardening";
      return null;
    }
    case "fingerprint_technology":
      return cve ? "vulnerable_dependency" : null;
    case "check_domain_security":
      return "missing_hardening";
    case "read_threat_report":
      return "llm_or_mcp_content_risk";
    default: {
      const haystack = `${description} ${JSON.stringify(raw)}`.toLowerCase();
      if (/secret|credential|password|api[ _-]?key/.test(haystack)) return "secret_exposure";
      if (/typosquat|malicious package|supply[ -]chain compromise/.test(haystack)) return "malicious_or_typosquatted_package";
      if (/license|\bgpl\b|compliance/.test(haystack)) return "license_or_compliance";
      if (/sql injection|\bxss\b|\bcsrf\b|path traversal|insecure deserialization/.test(haystack)) return "first_party_code_vulnerability";
      if (/container image|docker image|base image/.test(haystack)) return "container_image_vulnerability";
      if (/prompt injection|tool poisoning|jailbreak/.test(haystack)) return "llm_or_mcp_content_risk";
      if (/malicious ip|c2 domain|phishing url|indicator of compromise/.test(haystack)) return "runtime_indicator";
      return null;
    }
  }
}

export function classifyFinding(source: string, raw: Record<string, unknown>, hint?: ClassificationHint): ClassifiedFinding {
  const packageName = hint?.package_name ?? firstString(raw.package, raw.package_name, raw.name);
  const cve = hint?.cve ?? firstString(raw.cve, raw.CVE);
  const indicator = hint?.indicator ?? firstString(raw.indicator, raw.ip, raw.domain, raw.host, raw.url);
  const description = hint?.description ?? firstString(raw.description, raw.summary, raw.why, raw.advice) ?? `Finding from ${source}`;

  const findingClass = hint?.finding_class ?? classifyBySource(source, raw, description, cve);

  const fixable =
    typeof raw.fixable === "boolean"
      ? raw.fixable
      : source === "scan_manifest" && Array.isArray(raw.unresolved) && raw.unresolved.length === 0;

  return { finding_class: findingClass, package_name: packageName, cve, indicator, description, fixable };
}
