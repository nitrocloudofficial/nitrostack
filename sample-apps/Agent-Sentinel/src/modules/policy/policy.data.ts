import {
  PolicyRule,
  PolicyStatistics,
} from "./policy.types.js";

/**
 * Enterprise Policy Repository
 *
 * This mock repository will later be replaced
 * by PostgreSQL without changing the PolicyEngine.
 */

export const policyRules: PolicyRule[] = [

  //==================================================
  // Identity Policies
  //==================================================

  {
    id: "ID-001",
    name: "Unknown Agent Block",
    type: "IDENTITY",
    description: "Unknown agents are not permitted.",
    enabled: true,
    severity: "HIGH",
    decision: "BLOCK",
    condition: "department == UNKNOWN",
  },

  {
    id: "ID-002",
    name: "Authenticated Enterprise Agent",
    type: "IDENTITY",
    description: "Only enterprise agents are trusted.",
    enabled: true,
    severity: "LOW",
    decision: "ALLOW",
    condition: "known agent",
  },

  //==================================================
  // Prompt Policies
  //==================================================

  {
    id: "PR-001",
    name: "Prompt Injection Detection",
    type: "PROMPT",
    description: "Detect prompt injection attempts.",
    enabled: true,
    severity: "CRITICAL",
    decision: "QUARANTINE",
    condition: "prompt injection detected",
  },

  {
    id: "PR-002",
    name: "Sensitive Data Access",
    type: "PROMPT",
    description: "Prevent sensitive information disclosure.",
    enabled: true,
    severity: "HIGH",
    decision: "BLOCK",
    condition: "sensitive keyword detected",
  },

  {
    id: "PR-003",
    name: "Prompt Manipulation",
    type: "PROMPT",
    description: "Detect prompt manipulation patterns.",
    enabled: true,
    severity: "MEDIUM",
    decision: "WARN",
    condition: "prompt manipulation",
  },

  //==================================================
  // Tool Policies
  //==================================================

  {
    id: "TL-001",
    name: "Restricted MCP Tools",
    type: "TOOL",
    description: "Prevent execution of dangerous tools.",
    enabled: true,
    severity: "HIGH",
    decision: "BLOCK",
    condition: "restricted tool requested",
  },

  {
    id: "TL-002",
    name: "Tool Abuse Detection",
    type: "TOOL",
    description: "Detect excessive tool usage.",
    enabled: true,
    severity: "MEDIUM",
    decision: "WARN",
    condition: "tool count exceeded",
  },

  //==================================================
  // Resource Policies
  //==================================================

  {
    id: "RS-001",
    name: "Restricted Resource Access",
    type: "RESOURCE",
    description: "Prevent access to restricted resources.",
    enabled: true,
    severity: "HIGH",
    decision: "BLOCK",
    condition: "restricted resource",
  },

  //==================================================
  // Department Policies
  //==================================================

  {
    id: "DP-001",
    name: "Finance Isolation",
    type: "DEPARTMENT",
    description: "Finance resources may only be used by Finance agents.",
    enabled: true,
    severity: "HIGH",
    decision: "BLOCK",
    condition: "department mismatch",
  },

  {
    id: "DP-002",
    name: "Engineering Sandbox",
    type: "DEPARTMENT",
    description: "Engineering agents may use experimental tools.",
    enabled: true,
    severity: "LOW",
    decision: "ALLOW",
    condition: "engineering",
  },

  //==================================================
  // Compliance Policies
  //==================================================

  {
    id: "CP-001",
    name: "PII Protection",
    type: "COMPLIANCE",
    description: "Personally identifiable information must never be exposed.",
    enabled: true,
    severity: "CRITICAL",
    decision: "QUARANTINE",
    condition: "pii detected",
  },

  {
    id: "CP-002",
    name: "Audit Logging Required",
    type: "COMPLIANCE",
    description: "Every security decision must be audited.",
    enabled: true,
    severity: "LOW",
    decision: "ALLOW",
    condition: "audit required",
  },

  //==================================================
  // Time Policies
  //==================================================

  {
    id: "TM-001",
    name: "Business Hours Access",
    type: "TIME",
    description: "Restrict privileged operations outside business hours.",
    enabled: true,
    severity: "MEDIUM",
    decision: "WARN",
    condition: "outside business hours",
  },

];

/**
 * Enterprise blocked keywords.
 */

export const blockedKeywords = [

  "ignore previous instructions",
  "system prompt",
  "developer prompt",
  "override",
  "bypass",
  "disable security",
  "root password",
  "admin password",
  "database dump",
  "credit card",
  "social security",
  "api key",
  "private key",
  "token",
  "confidential"

];

/**
 * High-risk departments.
 */

export const privilegedDepartments = [

  "Finance",
  "Security",
  "Executive",
  "Infrastructure"

];

/**
 * High-risk MCP tools.
 */

export const restrictedTools = [

  "filesystem.delete",
  "filesystem.write",
  "database.drop",
  "database.delete",
  "shell.execute",
  "terminal.execute",
  "docker.exec",
  "system.shutdown"

];

/**
 * Enterprise recommendations.
 */

export const policyRecommendations = {

  ALLOW: [
    "Request complies with enterprise security policy."
  ],

  WARN: [
    "Continue under observation.",
    "Review the request before execution."
  ],

  BLOCK: [
    "Block request immediately.",
    "Notify Security Operations.",
    "Record an audit event."
  ],

  QUARANTINE: [
    "Quarantine the AI agent.",
    "Open an incident investigation.",
    "Notify SOC immediately.",
    "Perform forensic analysis."
  ]

};

/**
 * Statistics helper.
 */

export function calculatePolicyStatistics(): PolicyStatistics {

  const enabledPolicies =
    policyRules.filter(rule => rule.enabled).length;

  const disabledPolicies =
    policyRules.filter(rule => !rule.enabled).length;

  const criticalPolicies =
    policyRules.filter(
      rule => rule.severity === "CRITICAL"
    ).length;

  return {

    totalPolicies: policyRules.length,

    enabledPolicies,

    disabledPolicies,

    criticalPolicies,

  };

}