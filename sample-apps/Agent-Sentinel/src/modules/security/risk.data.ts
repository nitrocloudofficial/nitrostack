import { SecurityPolicy } from "./security.types.js";

/**
 * Enterprise Security Policies
 */
export const securityPolicies: SecurityPolicy[] = [

  {
    id: "POL-001",
    name: "Prompt Injection Protection",
    description:
      "Detects prompt injection and jailbreak attempts.",
    enabled: true,
    threshold: 80
  },

  {
    id: "POL-002",
    name: "Sensitive Data Protection",
    description:
      "Blocks access to passwords, API keys, tokens and secrets.",
    enabled: true,
    threshold: 70
  },

  {
    id: "POL-003",
    name: "Unknown Agent Detection",
    description:
      "Unknown or unmanaged agents are considered high risk.",
    enabled: true,
    threshold: 90
  },

  {
    id: "POL-004",
    name: "Permission Abuse",
    description:
      "Too many privileged permissions increase risk.",
    enabled: true,
    threshold: 60
  },

  {
    id: "POL-005",
    name: "Excessive Tool Usage",
    description:
      "Large numbers of MCP tool calls in a short period increase risk.",
    enabled: true,
    threshold: 55
  }

];

/**
 * Prompt Injection Signatures
 */
export const promptInjectionPatterns: string[] = [

  "ignore previous instructions",

  "forget previous instructions",

  "system prompt",

  "developer instructions",

  "reveal hidden prompt",

  "show your prompt",

  "jailbreak",

  "bypass",

  "override security",

  "disable safety",

  "ignore all policies",

  "sudo",

  "root access",

  "administrator mode"

];

/**
 * Sensitive Information Keywords
 */
export const sensitiveKeywords: string[] = [

  "password",

  "secret",

  "api key",

  "apikey",

  "private key",

  "token",

  "jwt",

  "credit card",

  "cvv",

  "aadhaar",

  "pan",

  "bank account",

  "salary",

  "employee record",

  "customer database",

  "confidential"

];

/**
 * Suspicious Permissions
 */
export const suspiciousPermissions: string[] = [

  "database_admin",

  "filesystem",

  "shell",

  "terminal",

  "execute_code",

  "system_config",

  "delete_records",

  "network_admin",

  "root",

  "sudo"

];

/**
 * High-Risk MCP Tools
 */
export const highRiskTools: string[] = [

  "delete_database",

  "execute_shell",

  "filesystem_delete",

  "filesystem_write",

  "run_script",

  "modify_policy",

  "shutdown_server",

  "drop_table"

];

/**
 * Risk Score Weights
 */
export const riskWeights = {

  promptInjection: 35,

  sensitiveData: 30,

  unknownAgent: 40,

  suspiciousPermission: 20,

  excessiveTools: 15,

  blockedTool: 45,

  repeatedViolation: 25

};

/**
 * Decision Thresholds
 */
export const decisionThresholds = {

  allow: 20,

  warn: 40,

  block: 70,

  quarantine: 90

};

/**
 * Security Recommendations
 */
export const recommendations = {

  promptInjection:
    "Reject the request and notify the security administrator.",

  sensitiveData:
    "Mask or deny access to sensitive information.",

  unknownAgent:
    "Register and verify the AI agent before granting access.",

  suspiciousPermission:
    "Reduce granted permissions using the least-privilege principle.",

  blockedTool:
    "Prevent execution and create an audit event.",

  excessiveTools:
    "Rate-limit MCP tool execution."

};