/**
 * SentinelPay AI — Authorization (Least-Privilege Capability Model)
 * Source: Technical Specification §11.4 (Authorization), §12.2 (Authorization)
 *
 * The agent is granted only read/compute/review-preparation capabilities.
 * There is deliberately no capability — and therefore no code path — for
 * transferring funds, modifying vendor/policy records, or self-approval.
 * `Capability` is a closed union: capabilities outside it cannot be
 * granted even by a bug, because there is no such value to grant.
 */

import { ForbiddenError } from "../domain/errors.js";

export type Capability =
  | "READ_TRANSACTION"
  | "READ_VENDOR"
  | "READ_INVOICE"
  | "READ_HISTORY"
  | "EVALUATE_POLICY"
  | "CALCULATE_RISK"
  | "PREPARE_REVIEW";

/** §11.4 — the complete, closed set of capabilities granted to the agent. */
const GRANTED_CAPABILITIES: readonly Capability[] = [
  "READ_TRANSACTION",
  "READ_VENDOR",
  "READ_INVOICE",
  "READ_HISTORY",
  "EVALUATE_POLICY",
  "CALCULATE_RISK",
  "PREPARE_REVIEW",
];

/**
 * §5.1/§11.2 — the exact seven documented tools, mapped to the single
 * capability each one requires. There is intentionally no entry for
 * `executePayment`, `transferFunds`, `modifyVendor`, or `modifyPolicy` —
 * those tools do not exist anywhere in this system.
 */
export const TOOL_CAPABILITY_MAP: Readonly<Record<string, Capability>> = {
  getTransaction: "READ_TRANSACTION",
  verifyVendor: "READ_VENDOR",
  analyzeInvoice: "READ_INVOICE",
  getPaymentHistory: "READ_HISTORY",
  evaluatePolicy: "EVALUATE_POLICY",
  calculateRisk: "CALCULATE_RISK",
  prepareApproval: "PREPARE_REVIEW",
};

export function isAuthorized(capability: Capability): boolean {
  return GRANTED_CAPABILITIES.includes(capability);
}

/** Throws ForbiddenError for any capability outside the closed granted set. */
export function assertAuthorized(capability: Capability): void {
  if (!isAuthorized(capability)) {
    throw new ForbiddenError(`Capability "${capability}" is not granted to this agent.`, {
      capability,
    });
  }
}

/**
 * Resolves a tool name to its capability and asserts it. An unknown tool
 * name (e.g. a hypothetical "executePayment") is rejected outright rather
 * than silently allowed through with no capability check.
 */
export function assertToolAuthorized(toolName: string): void {
  const capability = TOOL_CAPABILITY_MAP[toolName];
  if (!capability) {
    throw new ForbiddenError(
      `Tool "${toolName}" has no authorized capability mapping and cannot be invoked.`,
      { toolName }
    );
  }
  assertAuthorized(capability);
}
