/**
 * SentinelPay AI — Root Module Wiring
 * Source: Technical Specification §3.1/§3.2 (app.module.ts), Appendix B
 *
 * Collects every framework-agnostic tool/resource/prompt descriptor into
 * flat arrays. This is the single place `src/index.ts` needs to import
 * from to register the whole application with the NitroStack SDK.
 *
 * Deliberately contains no `@nitrostack/core` import: the exact
 * registration call (`server.registerTool(...)`, a decorator, a builder
 * — whichever the installed SDK version uses) is confirmed from the
 * scaffold/CLI output and wired in `src/index.ts` only, per Appendix B's
 * rule to never guess NitroStack syntax.
 */

import { getTransactionTool } from "./modules/transaction.tools.js";
import { transactionResource } from "./modules/transaction.resources.js";
import { verifyVendorTool } from "./modules/vendor.tools.js";
import { counterpartyResource } from "./modules/vendor.resources.js";
import { analyzeInvoiceTool } from "./modules/invoice.tools.js";
import { invoiceResource } from "./modules/invoice.resources.js";
import { getPaymentHistoryTool } from "./modules/history.tools.js";
import { historyResource } from "./modules/history.resources.js";
import { evaluatePolicyTool } from "./modules/policy.tools.js";
import { policyResource } from "./modules/policy.resources.js";
import { calculateRiskTool } from "./modules/risk.tools.js";
import { riskResource } from "./modules/risk.resources.js";
import { prepareApprovalTool } from "./modules/approval.tools.js";
import { auditResource, investigationResource } from "./modules/investigation.resources.js";
import { investigationPrompts } from "./modules/investigation.prompts.js";

/**
 * The exact seven documented MCP tools (§4, §11.2, §25.2). There is
 * deliberately no eighth entry for `executePayment` — that tool does not
 * exist anywhere in this codebase.
 */
export const tools = [
  getTransactionTool,
  verifyVendorTool,
  analyzeInvoiceTool,
  getPaymentHistoryTool,
  evaluatePolicyTool,
  calculateRiskTool,
  prepareApprovalTool,
] as const;

/** The six canonical read-only resource patterns (§6). */
export const resources = [
  transactionResource,
  counterpartyResource,
  invoiceResource,
  policyResource,
  investigationResource,
  auditResource,
] as const;

/**
 * Payment-history statistics are not one of the six illustrative §6 URIs
 * but are explicitly named in the canonical folder structure (§3.1) and
 * risk results likewise back a dedicated resource — both are additive,
 * read-only extensions of the same pattern.
 */
export const additionalResources = [historyResource, riskResource] as const;

/** The exactly two reusable MCP prompts (§7). */
export const prompts = investigationPrompts;

export const appModule = {
  tools,
  resources: [...resources, ...additionalResources],
  prompts,
};
